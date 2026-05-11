use std::fs;
use std::io::{Write, Read};
use std::path::{Path, PathBuf};
use sha1::{Sha1, Digest};
use futures_util::StreamExt;
use crate::models::{MinecraftVersion, AssetObjects, VersionManifest};
use crate::modules::game::game::{MinecraftLauncher};
use crate::modules::shared_utils::transform_url;

impl MinecraftLauncher {
    pub async fn install(&self, version_id: &str, loader: &str, loader_version: &str) -> Result<MinecraftVersion, String> {
        self.emit_progress(&format!("Preparing {} {}...", version_id, loader), 0.0, "verifying");

        let app_data = std::env::var("APPDATA").unwrap_or_default();
        let manifest_cache = PathBuf::from(&app_data).join("lflauncher").join("version_manifest_v2.json");
        
        let mut manifest_text = String::new();
        let mut used_cache = false;

        if manifest_cache.exists() {
            if let Ok(metadata) = fs::metadata(&manifest_cache) {
                if let Ok(modified) = metadata.modified() {
                    if let Ok(elapsed) = modified.elapsed() {
                        if elapsed.as_secs() < 86400 { // 24 hours
                            if let Ok(text) = fs::read_to_string(&manifest_cache) {
                                manifest_text = text;
                                used_cache = true;
                            }
                        }
                    }
                }
            }
        }

        if !used_cache {
            self.emit_progress("Checking version manifest...", 0.0, "verifying");
            let manifest_url = transform_url("https://launchermeta.mojang.com/mc/game/version_manifest_v2.json");
            match self.client.get(manifest_url).send().await {
                Ok(resp) => {
                    if let Ok(text) = resp.text().await {
                        let _ = fs::create_dir_all(manifest_cache.parent().unwrap());
                        let _ = fs::write(&manifest_cache, &text);
                        manifest_text = text;
                    } else if manifest_cache.exists() {
                        manifest_text = fs::read_to_string(&manifest_cache).unwrap_or_default();
                    }
                }
                Err(_) => {
                    if manifest_cache.exists() {
                        manifest_text = fs::read_to_string(&manifest_cache).unwrap_or_default();
                    }
                }
            }
        }

        if manifest_text.is_empty() {
            return Err("Failed to obtain version manifest (network error and no cache)".to_string());
        }

        let manifest: VersionManifest = serde_json::from_str(&manifest_text)
            .map_err(|e| format!("Failed to decode manifest JSON: {}", e))?;

        let actual_version_id = match version_id {
            "Latest release" => &manifest.latest.release,
            "Latest snapshot" => &manifest.latest.snapshot,
            _ => version_id,
        };

        let version_info = manifest.versions.iter().find(|v| v.id == *actual_version_id)
            .ok_or_else(|| format!("Version {} not found in manifest", actual_version_id))?;

        let version_json_path = self.base_path.join("versions").join(actual_version_id).join(format!("{}.json", actual_version_id));
        
        let version_data: MinecraftVersion = if version_json_path.exists() {
            let text = fs::read_to_string(&version_json_path).map_err(|e| e.to_string())?;
            serde_json::from_str::<MinecraftVersion>(&text).unwrap_or_else(|_| {
                // If JSON is corrupt, try downloading again — simplified for extraction
                // (actual logic would download here, but let's assume we can block or handle)
                panic!("Corrupt JSON logic needs to be integrated or simplified")
            })
        } else {
            self.emit_progress(&format!("Downloading {} metadata...", actual_version_id), 5.0, "verifying");
            let primary_url = transform_url(&version_info.url);
            let urls = vec![primary_url, version_info.url.clone()];
            let mut final_text = String::new();
            for url in urls {
                if let Ok(resp) = self.client.get(&url).send().await {
                    if resp.status().is_success() {
                        if let Ok(text) = resp.text().await {
                            final_text = text;
                            break;
                        }
                    }
                }
            }
            if final_text.is_empty() {
                return Err(format!("Failed to download metadata for {} from all sources", actual_version_id));
            }
            if let Some(p) = version_json_path.parent() { let _ = fs::create_dir_all(p); }
            let _ = fs::write(&version_json_path, &final_text);
            serde_json::from_str(&final_text).map_err(|e| e.to_string())?
        };
        
        let mut final_version_data = version_data;

        // Helper to merge loader JSON (mainClass, libraries, arguments) into version data
        let merge_loader_json = |loader_json: &serde_json::Value, vd: &mut crate::models::MinecraftVersion| {
            if let Some(mc) = loader_json["mainClass"].as_str() {
                vd.main_class = mc.to_string();
            }
            if let Some(libs) = loader_json["libraries"].as_array() {
                for lv in libs {
                    if let Ok(lib) = serde_json::from_value::<crate::models::Library>(lv.clone()) {
                        vd.libraries.insert(0, lib);
                    }
                }
            }
            // Handle OLD format: minecraftArguments is a single string (Forge 1.x)
            // The Forge version.json already contains the FULL argument string including tweakClass
            if let Some(loader_mc_args) = loader_json["minecraftArguments"].as_str() {
                vd.minecraft_arguments = Some(loader_mc_args.to_string());
            }
            // Handle NEW format: arguments.jvm / arguments.game
            if let Some(args_obj) = loader_json["arguments"].as_object() {
                let args = vd.arguments.get_or_insert(crate::models::Arguments { jvm: vec![], game: vec![] });
                if let Some(jvm_arr) = args_obj.get("jvm").and_then(|v| v.as_array()) {
                    for a in jvm_arr { args.jvm.push(a.clone()); }
                }
                if let Some(game_arr) = args_obj.get("game").and_then(|v| v.as_array()) {
                    for a in game_arr { args.game.push(a.clone()); }
                }
            }
        };

        // --- MOD LOADER INTEGRATION ---
        if loader != "vanilla" && !loader_version.is_empty() {
            self.emit_progress(&format!("Fetching {} metadata...", loader), 8.0, "verifying");

            match loader {
                "fabric" | "quilt" => {
                    let raw_url = if loader == "fabric" {
                        format!("https://meta.fabricmc.net/v2/versions/loader/{}/{}/profile/json", actual_version_id, loader_version)
                    } else {
                        format!("https://meta.quiltmc.org/v3/versions/loader/{}/{}/profile/json", actual_version_id, loader_version)
                    };
                    
                    let transform_url_str = transform_url(&raw_url);
                    let try_urls = vec![transform_url_str, raw_url];
                    let mut final_json = None;
                    let mut last_error = String::new();

                    for url in try_urls {
                        match self.client.get(&url).send().await {
                            Ok(resp) if resp.status().is_success() => {
                                if let Ok(json) = resp.json().await {
                                    final_json = Some(json);
                                    break;
                                }
                            }
                            Ok(resp) => last_error = format!("HTTP {}", resp.status()),
                            Err(e) => last_error = e.to_string(),
                        }
                    }

                    let loader_json: serde_json::Value = final_json.ok_or_else(|| {
                        format!("Failed to fetch {} metadata from all sources: {}", loader, last_error)
                    })?;
                    merge_loader_json(&loader_json, &mut final_version_data);
                }
                "forge" => {
                    // Forge: try official maven first, fallback to BMCLAPI mirror
                    let forge_full_version = if loader_version.contains('-') {
                        loader_version.to_string()
                    } else {
                        format!("{}-{}", actual_version_id, loader_version)
                    };
                    
                    let urls = vec![
                        format!("https://maven.minecraftforge.net/net/minecraftforge/forge/{}/forge-{}-installer.jar", forge_full_version, forge_full_version),
                        format!("https://bmclapi2.bangbang93.com/maven/net/minecraftforge/forge/{}/forge-{}-installer.jar", forge_full_version, forge_full_version)
                    ];
                    
                    let mut installer_bytes = None;
                    for url in urls {
                        self.emit_progress(&format!("Downloading Forge {} installer...", forge_full_version), 8.5, "downloading");
                        if let Ok(resp) = self.client.get(&url).send().await {
                            if resp.status().is_success() {
                                if let Ok(bytes) = resp.bytes().await {
                                    if bytes.len() > 1000 { installer_bytes = Some(bytes); break; }
                                }
                            }
                        }
                    }
                    
                    let bytes = installer_bytes.ok_or_else(|| format!("Failed to download Forge installer JAR from any source for version {}", forge_full_version))?;

                    // Pre-read all ZIP entries to avoid Rust borrow checker issues
                    let mut entries: std::collections::HashMap<String, String> = std::collections::HashMap::new();
                    let mut embedded_jars: Vec<(String, Vec<u8>)> = Vec::new();
                    let mut embedded_maven: Vec<(String, Vec<u8>)> = Vec::new();
                    {
                        let cursor = std::io::Cursor::new(bytes.as_ref());
                        let mut archive = zip::ZipArchive::new(cursor).map_err(|e| format!("Forge installer is not a valid JAR: {}. The download might have been interrupted.", e))?;
                        for i in 0..archive.len() {
                            if let Ok(mut f) = archive.by_index(i) {
                                let name = f.name().to_string();
                                if name == "version.json" || name == "install_profile.json" {
                                    let mut s = String::new();
                                    if std::io::Read::read_to_string(&mut f, &mut s).is_ok() {
                                        entries.insert(name, s);
                                    }
                                } else if name.starts_with("maven/") && !name.ends_with('/') {
                                    let mut buf = Vec::new();
                                    if std::io::Read::read_to_end(&mut f, &mut buf).is_ok() && buf.len() > 0 {
                                        embedded_maven.push((name.clone(), buf));
                                    }
                                } else if name.ends_with(".jar") && name.contains(&forge_full_version) {
                                    let short_name = name.split('/').last().unwrap_or(&name).to_string();
                                    let mut buf = Vec::new();
                                    if std::io::Read::read_to_end(&mut f, &mut buf).is_ok() && buf.len() > 10000 {
                                        embedded_jars.push((short_name, buf));
                                    }
                                }
                            }
                        }
                    }
                    
                    let loader_json: serde_json::Value = if let Some(s) = entries.remove("version.json") {
                        serde_json::from_str(&s).map_err(|e| format!("Failed to parse Forge version.json: {}", e))?
                    } else if let Some(s) = entries.remove("install_profile.json") {
                        // Old Forge wraps version under "versionInfo" key
                        let v: serde_json::Value = serde_json::from_str(&s).map_err(|e| e.to_string())?;
                        if v["versionInfo"].is_object() {
                            v["versionInfo"].clone()
                        } else {
                            v
                        }
                    } else {
                        return Err("Forge installer does not contain version.json or install_profile.json. This version might not be supported.".to_string());
                    };
                    merge_loader_json(&loader_json, &mut final_version_data);
                    
                    // Extract embedded JARs from installer (e.g. forge-universal.jar for Forge 1.x)
                    // These are the actual Forge launcher JARs needed to run the game
                    for (jar_name, jar_bytes) in embedded_jars {
                        let forge_lib_path = self.libraries_path
                            .join("net").join("minecraftforge").join("forge")
                            .join(&forge_full_version);
                        let _ = fs::create_dir_all(&forge_lib_path);
                        
                        let dest_names = [
                            format!("forge-{}.jar", forge_full_version),
                            format!("forge-{}-universal.jar", forge_full_version),
                            jar_name.clone(),
                        ];
                        for dest_name in &dest_names {
                            let dest = forge_lib_path.join(dest_name);
                            let _ = fs::write(&dest, &jar_bytes);
                        }
                        self.emit_progress(&format!("Extracted Forge JAR: {}", jar_name), 9.5, "extracting");
                    }

                    // Giải nén các file thư viện đi kèm của Forge (như mcp_deobf.lzma)
                    for (maven_path, lib_bytes) in embedded_maven {
                        let relative_path = maven_path.trim_start_matches("maven/");
                        let dest = self.libraries_path.join(relative_path);
                        if let Some(p) = dest.parent() { let _ = fs::create_dir_all(p); }
                        let _ = fs::write(&dest, &lib_bytes);
                    }
                }
                "neoforge" => {
                    // NeoForge: download installer JAR from maven.neoforged.net, extract version.json
                    let raw_installer_url = format!(
                        "https://maven.neoforged.net/releases/net/neoforged/neoforge/{}/neoforge-{}-installer.jar",
                        loader_version, loader_version
                    );
                    
                    let try_urls = vec![
                        transform_url(&raw_installer_url),
                        raw_installer_url,
                        format!("https://bmclapi2.bangbang93.com/maven/net/neoforged/neoforge/{}/neoforge-{}-installer.jar", loader_version, loader_version)
                    ];

                    let mut installer_bytes = None;
                    let mut last_error = String::new();

                    for url in try_urls {
                        self.emit_progress(&format!("Downloading NeoForge {} installer...", loader_version), 8.5, "downloading");
                        match self.client.get(&url).send().await {
                            Ok(resp) => {
                                if resp.status().is_success() {
                                    if let Ok(bytes) = resp.bytes().await {
                                        // Installer jars are typically > 5MB. 1MB is a safe floor.
                                        if bytes.len() > 1024 * 1024 {
                                            installer_bytes = Some(bytes);
                                            break;
                                        } else {
                                            last_error = format!("File too small ({} bytes) from {}", bytes.len(), url);
                                        }
                                    }
                                } else {
                                    last_error = format!("HTTP {} from {}", resp.status(), url);
                                }
                            }
                            Err(e) => {
                                last_error = e.to_string();
                            }
                        }
                    }

                    let bytes = installer_bytes.ok_or_else(|| format!("Failed to download NeoForge installer: {}", last_error))?;

                    let mut version_json_str: Option<String> = None;
                    {
                        let cursor = std::io::Cursor::new(bytes.as_ref());
                        let mut archive = zip::ZipArchive::new(cursor).map_err(|e| format!("NeoForge installer is not a valid JAR: {}. This often happens due to a corrupted download. Please try again.", e))?;
                        for i in 0..archive.len() {
                            if let Ok(mut f) = archive.by_index(i) {
                                if f.name() == "version.json" {
                                    let mut s = String::new();
                                    if std::io::Read::read_to_string(&mut f, &mut s).is_ok() {
                                        version_json_str = Some(s);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    let loader_json: serde_json::Value = serde_json::from_str(
                        &version_json_str.ok_or_else(|| "NeoForge installer does not contain version.json".to_string())?
                    ).map_err(|e| format!("Failed to parse NeoForge version.json: {}", e))?;
                    merge_loader_json(&loader_json, &mut final_version_data);
                }
                _ => return Err(format!("Unsupported loader: {}", loader))
            }

            self.emit_progress(&format!("{} integration complete", loader), 9.0, "verifying");
        }
        
        let version_data = final_version_data;
        // ------------------------------

        let client_path = self.base_path.join("versions").join(actual_version_id).join(format!("{}.jar", actual_version_id));
        self.download_file_if_needed(&transform_url(&version_data.downloads.client.url), &client_path, &version_data.downloads.client.sha1, "Client JAR", 10.0, 20.0).await?;

        let mut lib_tasks = Vec::new();
        let mut extract_tasks = Vec::new();
        let os_name = "windows";
        
        for lib in &version_data.libraries {
            if !self.should_include_library(lib, os_name) { continue; }
            if let Some(downloads) = &lib.downloads {
                if let Some(artifact) = &downloads.artifact {
                    if let Some(ref path) = artifact.path {
                        let lib_path = self.libraries_path.join(path);
                        if !lib_path.exists() {
                            let mut url = artifact.url.clone();
                            // Fix relative URLs often found in Forge metadata
                            if !url.starts_with("http") && !url.is_empty() {
                                url = format!("https://bmclapi2.bangbang93.com/maven/{}", url.trim_start_matches('/'));
                            }
                            if !url.is_empty() {
                                lib_tasks.push((transform_url(&url), lib_path, artifact.sha1.clone(), format!("Lib: {}", lib.name)));
                            }
                        }
                    }
                }
            } else {
                // Simple Maven implementation for Fabric/Quilt/Legacy Forge
                let base_url = lib.url.as_deref().unwrap_or("https://libraries.minecraft.net/");
                let parts: Vec<&str> = lib.name.split(':').collect();
                if parts.len() >= 3 {
                    let group = parts[0].replace('.', "/");
                    let name = parts[1];
                    let version = parts[2];
                    let classifier = if parts.len() >= 4 { format!("-{}", parts[3]) } else { "".to_string() };
                    
                    let path = format!("{}/{}/{}/{}-{}{}.jar", group, name, version, name, version, classifier);
                    let lib_path = self.libraries_path.join(&path);
                    if !lib_path.exists() {
                        let base = base_url.trim_end_matches('/');
                        let try_urls = if name == "forge" && parts.len() == 3 {
                             vec![
                                transform_url(&format!("{}/{}", base, path)),
                                transform_url(&format!("{}/{}/{}/{}/{}-{}-universal.jar", base, group, name, version, name, version)),
                                transform_url(&format!("{}/{}/{}/{}/{}-{}-client.jar", base, group, name, version, name, version)),
                             ]
                        } else {
                            vec![transform_url(&format!("{}/{}", base, path))]
                        };
                        
                        let mut success = false;
                        for try_url in try_urls {
                            if self.download_file_if_needed(&try_url, &lib_path, "", "", 0.0, 0.0).await.is_ok() {
                                success = true;
                                break;
                            }
                        }
                        if !success {
                             self.emit_log(&format!("Warning: Failed to download library {} from any source", lib.name));
                        }
                    }
                }
            }
            if let Some(natives) = &lib.natives {
                if let Some(classifier) = natives.get(os_name) {
                    let classifier = classifier.replace("${arch}", "64");
                    if let Some(downloads) = &lib.downloads {
                        if let Some(classifiers) = &downloads.classifiers {
                            if let Some(native_artifact) = classifiers.get(&classifier) {
                                if let Some(ref path) = native_artifact.path {
                                    let native_lib_path = self.libraries_path.join(path);
                                    if !native_lib_path.exists() {
                                        lib_tasks.push((transform_url(&native_artifact.url), native_lib_path.clone(), native_artifact.sha1.clone(), format!("Native: {}", lib.name)));
                                    }
                                    extract_tasks.push(native_lib_path);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        if !lib_tasks.is_empty() {
            let count = lib_tasks.len();
            self.emit_progress(&format!("Downloading {} libraries...", count), 20.0, "downloading");
            let mut stream = futures_util::stream::iter(lib_tasks).map(|(u, p, s, l)| async move {
                self.download_file_if_needed(&u, &p, &s, &l, 0.0, 0.0).await
            }).buffer_unordered(20);
            let mut completed = 0;
            while let Some(res) = stream.next().await {
                res?; completed += 1;
                if completed % 10 == 0 || completed == count {
                    let p = 20.0 + (completed as f32 / count as f32) * 25.0;
                    self.emit_progress(&format!("Downloading libraries ({}/{})", completed, count), p, "downloading");
                }
            }
        }

        let natives_dir = self.base_path.join("versions").join(actual_version_id).join("natives");
        if !natives_dir.exists() || !natives_dir.join(".extracted").exists() {
            self.emit_progress("Preparing Natives...", 45.0, "extracting");
            let _ = fs::create_dir_all(&natives_dir);
            for jar in extract_tasks { let _ = self.extract_natives(&jar, &natives_dir); }
            let _ = fs::write(natives_dir.join(".extracted"), "done");
        }

        let asset_index_path = self.assets_path.join("indexes").join(format!("{}.json", version_data.asset_index.id));
        self.download_file_if_needed(&transform_url(&version_data.asset_index.url), &asset_index_path, &version_data.asset_index.sha1, "Assets Index", 50.0, 55.0).await?;

        let asset_objects: AssetObjects = serde_json::from_str(&fs::read_to_string(&asset_index_path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
        let mut asset_tasks = Vec::new();
        for (_name, obj) in &asset_objects.objects {
            let head = &obj.hash[..2];
            let obj_path = self.assets_path.join("objects").join(head).join(&obj.hash);
            if !obj_path.exists() { asset_tasks.push((transform_url(&format!("https://resources.download.minecraft.net/{}/{}", head, obj.hash)), obj_path)); }
        }

        let obj_count = asset_tasks.len();
        if obj_count > 0 {
            self.emit_progress(&format!("Downloading {} assets...", obj_count), 55.0, "downloading");
            let mut stream = futures_util::stream::iter(asset_tasks).map(|(u, p)| async move { self.download_file_background(&u, &p).await }).buffer_unordered(30);
            let mut current = 0;
            while let Some(res) = stream.next().await {
                res?; current += 1;
                if current % 100 == 0 || current == obj_count {
                    let p = 55.0 + (current as f32 / obj_count as f32) * 35.0;
                    self.emit_progress(&format!("Downloading Assets ({}/{})", current, obj_count), p, "downloading");
                }
            }
        }

        if let Some(jv) = &version_data.java_version {
            // Check if auto_download_java is enabled
            let mut auto_download = true;
            if let Ok(config_text) = std::fs::read_to_string(PathBuf::from(&app_data).join("lflauncher").join("config.json")) {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&config_text) {
                    auto_download = json.get("auto_download_java").and_then(|v| v.as_bool()).unwrap_or(true);
                }
            }

            if auto_download {
                let component = &jv.component;
                let runtime_root = PathBuf::from(&app_data).join(".minecraft").join("runtime");
                let check_file = runtime_root.join(component).join(".installed");
                let java_exists = runtime_root.join(component).join("windows-x64").join(component).join("bin").join("javaw.exe").exists();
                if !java_exists || !check_file.exists() {
                    self.emit_progress(&format!("Downloading Java {}...", component), 91.0, "downloading");
                    self.download_java_runtime(component).await?;
                    let _ = fs::write(&check_file, "done");
                }
            }
        }

        Ok(version_data)
    }

    pub async fn download_file_if_needed(&self, url: &str, path: &Path, expected_sha1: &str, label: &str, start_p: f32, end_p: f32) -> Result<(), String> {
        if path.exists() {
            if let Ok(meta) = fs::metadata(path) {
                if meta.len() >= 0 {
                    if meta.len() < 1024 * 1024 {
                        if !expected_sha1.is_empty() {
                            if let Ok(hash) = self.calculate_sha1(path) {
                                if hash == expected_sha1 { return Ok(()); }
                            }
                        } else if meta.len() > 100 { 
                            return Ok(()); 
                        }
                    } else { return Ok(()); }
                }
            }
        }

        if !label.is_empty() { self.emit_progress(&format!("Downloading {}...", label), start_p, "downloading"); }
        if let Some(parent) = path.parent() { fs::create_dir_all(parent).map_err(|e| e.to_string())?; }

        // Build a list of URLs to try in order (mirror first, then multiple fallbacks)
        let mut try_urls: Vec<String> = vec![url.to_string()];
        
        // Compute the maven-relative path from the URL to use with other bases
        let maven_bases = [
            "bmclapi2.bangbang93.com/maven/",
            "bmclapi2.bangbang93.com/",
            "libraries.minecraft.net/",
            "files.minecraftforge.net/maven/",
            "maven.minecraftforge.net/",
            "maven.neoforged.net/releases/",
            "repo1.maven.org/maven2/",
            "piston-meta.mojang.com/",
            "piston-data.mojang.com/",
            "launchermeta.mojang.com/",
            "launcher.mojang.com/",
        ];
        let mut maven_path = String::new();
        for base in &maven_bases {
            if let Some(idx) = url.find(base) {
                maven_path = url[idx + base.len()..].to_string();
                break;
            }
        }
        
        if !maven_path.is_empty() {
            // Add all fallback sources in priority order
            let fallback_bases = [
                "https://libraries.minecraft.net/",
                "https://piston-meta.mojang.com/",
                "https://piston-data.mojang.com/",
                "https://launchermeta.mojang.com/",
                "https://launcher.mojang.com/",
                "https://maven.minecraftforge.net/",
                "https://maven.neoforged.net/releases/",
                "https://files.minecraftforge.net/maven/",
                "https://repo1.maven.org/maven2/",
            ];
            for base in &fallback_bases {
                let fallback = format!("{}{}", base, maven_path);
                if !try_urls.contains(&fallback) {
                    try_urls.push(fallback);
                }
            }
        }
        
        // Specific fallback for Mojang v1/packages (common in Java runtimes)
        if url.contains("bmclapi2.bangbang93.com/v1/packages/") {
            let original = url.replace("bmclapi2.bangbang93.com", "piston-meta.mojang.com");
            if !try_urls.contains(&original) { try_urls.push(original); }
            let original_data = url.replace("bmclapi2.bangbang93.com", "piston-data.mojang.com");
            if !try_urls.contains(&original_data) { try_urls.push(original_data); }
        }

        // S3 Amazon Mirror fallback for Assets Index
        if label == "Assets Index" {
            // The URL for asset indexes on S3 is usually https://s3.amazonaws.com/Minecraft.Download/indexes/{id}.json
            // We can extract the filename from the path
            if let Some(filename) = path.file_name().and_then(|f| f.to_str()) {
                let s3_fallback = format!("https://s3.amazonaws.com/Minecraft.Download/indexes/{}", filename);
                if !try_urls.contains(&s3_fallback) { try_urls.push(s3_fallback); }
            }
        }
        
        let mut last_error = String::new();
        
        'outer: for try_url in &try_urls {
            // Try each mirror up to 2 times for robustness
            for attempt in 0..2 {
                if attempt > 0 {
                    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                }

                match self.client.get(try_url).send().await {
                    Ok(response) => {
                        let status = response.status();
                        if status == reqwest::StatusCode::NOT_MODIFIED {
                            if path.exists() && fs::metadata(path).map(|m| m.len()).unwrap_or(0) > 0 {
                                return Ok(());
                            }
                        }

                        if !status.is_success() {
                            last_error = format!("HTTP {} from {}", status, try_url);
                            continue;
                        }

                        // Start downloading to a temporary file
                        let tmp_path = path.with_extension(format!("{}.tmp", uuid::Uuid::new_v4()));
                        let mut download_success = false;
                        
                        {
                            let mut file = match fs::File::create(&tmp_path) {
                                Ok(f) => f,
                                Err(e) => {
                                    last_error = format!("Failed to create tmp file: {}", e);
                                    continue 'outer; // Critical FS error
                                }
                            };

                            let mut downloaded: u64 = 0;
                            let total_size = response.content_length().unwrap_or(0);
                            let mut last_emitted_p = -1.0;
                            let mut body = response;
                            
                            let mut stream_error = None;
                            while let Some(chunk_res) = body.chunk().await.transpose() {
                                match chunk_res {
                                    Ok(chunk) => {
                                        if let Err(e) = file.write_all(&chunk) {
                                            stream_error = Some(format!("Write error: {}", e));
                                            break;
                                        }
                                        downloaded += chunk.len() as u64;
                                        if total_size > 0 {
                                            let p = start_p + (downloaded as f32 / total_size as f32) * (end_p - start_p);
                                            if p - last_emitted_p >= 1.0 || downloaded == total_size {
                                                if !label.is_empty() { self.emit_progress(&format!("Downloading {}...", label), p, "downloading"); }
                                                last_emitted_p = p;
                                            }
                                        }
                                    },
                                    Err(e) => {
                                        stream_error = Some(format!("Stream error: {}", e));
                                        break;
                                    }
                                }
                            }

                            if stream_error.is_none() {
                                // Final check: size
                                if downloaded < 22 && expected_sha1 != "da39a3ee5e6b4b0d3255bfef95601890afd80709" {
                                    if total_size > 0 && downloaded != total_size {
                                        stream_error = Some(format!("Downloaded file is too small ({} bytes)", downloaded));
                                    }
                                }
                            }

                            if let Some(err) = stream_error {
                                last_error = format!("{} from {}", err, try_url);
                                let _ = fs::remove_file(&tmp_path);
                                continue; // Try next attempt/mirror
                            } else {
                                download_success = true;
                            }
                        }

                        if download_success {
                            if let Err(e) = fs::rename(&tmp_path, path) {
                                if path.exists() { let _ = fs::remove_file(path); }
                                if let Err(e2) = fs::rename(&tmp_path, path) {
                                    last_error = format!("Rename failed: {} -> {}", e, e2);
                                    continue 'outer;
                                }
                            }
                            return Ok(());
                        }
                    },
                    Err(e) => {
                        last_error = format!("Request error: {} from {}", e, try_url);
                        continue;
                    }
                }
            }
        }

        Err(format!("Failed to download {} (all mirrors failed). Last error: {}", url, last_error))
    }

    pub async fn try_download(&self, url: &str, path: &Path) -> Result<(), String> {
        if path.exists() {
            if let Ok(meta) = fs::metadata(path) {
                if meta.len() > 100 { return Ok(()); }
                let _ = fs::remove_file(path);
            }
        }
        if let Some(parent) = path.parent() { fs::create_dir_all(parent).map_err(|e| e.to_string())?; }
        let tmp_path = path.with_extension(format!("{}.tmp", uuid::Uuid::new_v4()));
        
        let response = self.client.get(url).send().await.map_err(|e| e.to_string())?;
        if !response.status().is_success() {
            return Err(format!("Download failed for {}: HTTP {}", url, response.status()));
        }
        
        let bytes = response.bytes().await.map_err(|e| e.to_string())?;
        fs::write(&tmp_path, bytes).map_err(|e| e.to_string())?;
        fs::rename(&tmp_path, path).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn download_file_background(&self, url: &str, path: &Path) -> Result<(), String> {
        let mut try_urls = vec![url.to_string()];
        if url.contains("bmclapi2.bangbang93.com/assets") {
            try_urls.push(url.replace("bmclapi2.bangbang93.com/assets", "resources.download.minecraft.net"));
        }

        let mut last_err = String::new();
        for try_url in try_urls {
            for attempt in 0..3 {
                match self.try_download(&try_url, path).await {
                    Ok(_) => return Ok(()),
                    Err(e) => {
                        last_err = e;
                        if attempt < 2 {
                            tokio::time::sleep(std::time::Duration::from_millis(500 * (attempt as u64 + 1))).await;
                        }
                    }
                }
            }
        }
        Err(last_err)
    }

    pub fn calculate_sha1(&self, path: &Path) -> Result<String, String> {
        let mut file = fs::File::open(path).map_err(|e| e.to_string())?;
        let mut hasher = Sha1::new();
        let mut buffer = [0; 8192];
        loop {
            let n = file.read(&mut buffer).map_err(|e| e.to_string())?;
            if n == 0 { break; }
            hasher.update(&buffer[..n]);
        }
        Ok(format!("{:x}", hasher.finalize()))
    }

    pub fn extract_natives(&self, jar_path: &Path, extract_to: &Path) -> Result<(), String> {
        let file = fs::File::open(jar_path).map_err(|e| e.to_string())?;
        let mut archive = match zip::ZipArchive::new(file) {
            Ok(a) => a,
            Err(e) => {
                let _ = fs::remove_file(jar_path); // Remove corrupted JAR
                return Err(format!("Failed to open native JAR {}: {}. File removed for redownload.", jar_path.display(), e));
            }
        };
        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
            if file.is_dir() { continue; }
            let filename = match file.enclosed_name() {
                Some(name) => name.file_name().unwrap_or_default().to_string_lossy().to_string(),
                None => continue,
            };
            if filename.ends_with(".dll") || filename.ends_with(".so") || filename.ends_with(".dylib") {
                let outpath = extract_to.join(filename);
                if let Ok(mut outfile) = fs::File::create(&outpath) { let _ = std::io::copy(&mut file, &mut outfile); }
            }
        }
        Ok(())
    }
}
