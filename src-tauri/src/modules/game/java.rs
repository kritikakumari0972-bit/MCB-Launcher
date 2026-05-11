use std::path::{Path, PathBuf};
use std::fs;
use crate::modules::game::game::MinecraftLauncher;

/// Determine the minimum Java major version required for a given Minecraft version string.
pub fn required_java_range(mc_version: &str) -> (u32, u32) {
    if mc_version.starts_with('b') || mc_version.starts_with('a') {
        return (8, 99); // Allow newer Java for Alpha/Beta
    }
    let parts: Vec<&str> = mc_version.split('.').collect();
    let minor = parts.get(1).and_then(|s| s.parse::<u32>().ok()).unwrap_or(0);

    if minor <= 16 { return (8, 99); } // Allow newer Java for 1.16 and below
    if minor <= 20 { return (17, 99); }
    (21, 99)
}

pub fn get_java_version(java_exe: &Path) -> Option<u32> {
    let output = std::process::Command::new(java_exe)
        .arg("-version")
        .stderr(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .output()
        .ok()?;

    let text = String::from_utf8_lossy(&output.stderr).to_string()
        + &String::from_utf8_lossy(&output.stdout);

    for line in text.lines() {
        if line.contains("version") {
            if let Some(start) = line.find('"') {
                let rest = &line[start + 1..];
                if let Some(end) = rest.find('"') {
                    let ver_str = &rest[..end];
                    let nums: Vec<&str> = ver_str.split('.').collect();
                    if let Some(first) = nums.first() {
                        let major: u32 = if *first == "1" {
                            nums.get(1).and_then(|s| s.parse().ok()).unwrap_or(0)
                        } else {
                            first.parse().unwrap_or(0)
                        };
                        if major > 0 { return Some(major); }
                    }
                }
            }
        }
    }
    None
}

pub fn find_best_java(mc_version: &str, preferred: Option<&str>) -> String {
    if let Some(p) = preferred {
        if !p.is_empty() && p != "java" {
            let pb = PathBuf::from(p);
            if pb.exists() { return p.to_string(); }
        }
    }

    // Check if auto_detect_java is enabled
    let app_data = std::env::var("APPDATA").unwrap_or_default();
    let config_path = PathBuf::from(&app_data).join("lflauncher").join("config.json");
    if let Ok(config_text) = std::fs::read_to_string(config_path) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&config_text) {
            if let Some(false) = json.get("auto_detect_java").and_then(|v| v.as_bool()) {
                return "java".to_string();
            }
        }
    }

    let (min_java, max_java) = required_java_range(mc_version);
    let mut search_roots: Vec<PathBuf> = Vec::new();

    for env_var in &["ProgramFiles", "ProgramFiles(x86)", "ProgramW6432"] {
        if let Ok(root) = std::env::var(env_var) {
            let p = PathBuf::from(&root);
            search_roots.push(p.join("Java"));
            search_roots.push(p.join("Eclipse Adoptium"));
            search_roots.push(p.join("Microsoft"));
            search_roots.push(p.join("Temurin"));
            search_roots.push(p.join("OpenJDK"));
        }
    }
    if let Ok(jh) = std::env::var("JAVA_HOME") { search_roots.push(PathBuf::from(jh)); }
    if let Ok(appdata) = std::env::var("APPDATA") { 
        search_roots.push(PathBuf::from(&appdata).join(".minecraft").join("runtime")); 
        search_roots.push(PathBuf::from(&appdata).join("lflauncher").join("runtime").join("java")); 
    }

    let mut candidates: Vec<(u32, PathBuf)> = Vec::new();
    for root in &search_roots {
        if !root.exists() { continue; }
        if let Ok(entries) = std::fs::read_dir(root) {
            for entry in entries.flatten() {
                let jdir = entry.path();
                for candidate in &[jdir.join("bin").join("java.exe"), jdir.join("jre").join("bin").join("java.exe")] {
                    if candidate.exists() {
                        if let Some(ver) = get_java_version(candidate) { candidates.push((ver, candidate.clone())); }
                    }
                }
                if jdir.is_dir() {
                    if let Ok(subs) = std::fs::read_dir(&jdir) {
                        for sub in subs.flatten() {
                            let sp = sub.path();
                            for candidate in &[sp.join("bin").join("java.exe"), sp.join("jre").join("bin").join("java.exe")] {
                                if candidate.exists() {
                                    if let Some(ver) = get_java_version(candidate) { candidates.push((ver, candidate.clone())); }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    let valid: Vec<&(u32, PathBuf)> = candidates.iter().filter(|(ver, _)| *ver >= min_java).collect();
    if valid.is_empty() { return "java".to_string(); }

    let chosen = {
        let in_range: Vec<&(u32, PathBuf)> = valid.iter().copied().filter(|(ver, _)| *ver <= max_java).collect();
        if !in_range.is_empty() { in_range.into_iter().max_by_key(|(ver, _)| *ver) }
        else { valid.into_iter().min_by_key(|(ver, _)| *ver) }
    };

    chosen.map(|(_, p)| p.to_string_lossy().to_string()).unwrap_or_else(|| "java".to_string())
}

impl MinecraftLauncher {
    pub async fn download_java_runtime(&self, component: &str) -> Result<(), String> {
        let all_runtimes_url = "https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json";
        let resp = self.client.get(all_runtimes_url).send().await.map_err(|e| e.to_string())?;
        let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

        let manifest_url = json["windows-x64"][component][0]["manifest"]["url"]
            .as_str().ok_or_else(|| format!("Java component '{}' not found", component))?.to_string();

        let manifest_resp = self.client.get(&manifest_url).send().await.map_err(|e| e.to_string())?;
        let manifest_json: serde_json::Value = manifest_resp.json().await.map_err(|e| e.to_string())?;
        let files = manifest_json["files"].as_object().ok_or("No files in Java manifest")?;

        let appdata = std::env::var("APPDATA").unwrap_or_default();
        let install_root = PathBuf::from(&appdata).join(".minecraft").join("runtime").join(component).join("windows-x64").join(component);

        let mut tasks = Vec::new();
        for (file_path, file_info) in files {
            let dest = install_root.join(file_path);
            if file_info["type"].as_str() == Some("directory") {
                let _ = fs::create_dir_all(&dest);
                continue;
            }
            if let Some(raw) = file_info["downloads"]["raw"].as_object() {
                let url = raw["url"].as_str().unwrap_or("").to_string();
                let sha1 = raw["sha1"].as_str().unwrap_or("").to_string();
                if !url.is_empty() { tasks.push((url, dest, sha1)); }
            }
        }

        let total = tasks.len();
        let mut downloaded = 0;
        let mut stream = futures_util::stream::iter(tasks).map(|(url, path, sha1)| async move {
            use crate::modules::shared_utils::transform_url;
            let t_url = transform_url(&url);
            let try_urls = vec![t_url, url];
            let mut last_err = String::new();
            
            for url_to_try in try_urls {
                for attempt in 0..3 {
                    let res = if sha1.is_empty() { self.try_download(&url_to_try, &path).await }
                    else { self.download_file_if_needed(&url_to_try, &path, &sha1, "", 0.0, 0.0).await };
                    
                    if res.is_ok() { return Ok(()); }
                    last_err = res.unwrap_err();
                    if attempt < 2 { tokio::time::sleep(std::time::Duration::from_millis(500)).await; }
                }
            }
            Err(format!("Failed to download java file after trying all mirrors: {}", last_err))
        }).buffer_unordered(20);

        use futures_util::StreamExt;
        while let Some(res) = stream.next().await {
            res?;
            downloaded += 1;
            if downloaded % 100 == 0 || downloaded == total {
                let p = 91.0 + (downloaded as f32 / total as f32) * 7.0;
                self.emit_progress(&format!("Downloading Java runtime ({}/{})", downloaded, total), p, "downloading");
            }
        }
        Ok(())
    }
}

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use std::io::Write;
use futures_util::StreamExt;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct JavaMajorVersion {
    pub version: String,
    pub release_time: String,
    pub recommended: bool,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct JavaRuntime {
    pub version: String,
    pub name: String,
    pub release_time: String,
    pub package_type: String,
    pub url: String,
    pub is_installed: bool,
    pub path: Option<String>,
    pub provider: Option<String>,
    pub major_version: Option<String>,
    pub folder_id: Option<String>,
}

#[tauri::command]
pub async fn get_java_versions(provider: String) -> Result<Vec<JavaMajorVersion>, String> {
    let url = format!("https://meta.prismlauncher.org/v1/{}/index.json", provider);
    let resp = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let mut releases = Vec::new();
    
    if let Some(versions) = json["versions"].as_array() {
        for v in versions {
            let version = v["version"].as_str().unwrap_or("").to_string();
            let release_time = v["releaseTime"].as_str().unwrap_or("").to_string();
            let recommended = v["recommended"].as_bool().unwrap_or(false);
            
            releases.push(JavaMajorVersion {
                version,
                release_time,
                recommended,
            });
        }
    }
    Ok(releases)
}

#[tauri::command]
pub async fn get_java_releases(provider: String, major_version: String) -> Result<Vec<JavaRuntime>, String> {
    let url = format!("https://meta.prismlauncher.org/v1/{}/{}.json", provider, major_version);
    let resp = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let mut releases = Vec::new();
    
    let appdata = std::env::var("APPDATA").unwrap_or_default();
    
    if let Some(runtimes) = json["runtimes"].as_array() {
        for r in runtimes {
            if r["runtimeOS"].as_str() != Some("windows-x64") {
                continue;
            }
            
            let name = r["name"].as_str().unwrap_or("unknown").to_string();
            let package_type = r["packageType"].as_str().unwrap_or("jre").to_string();
            let release_time = r["releaseTime"].as_str().unwrap_or("").to_string();
            let url_str = r["url"].as_str().unwrap_or("").to_string();
            
            let mut version_str = major_version.clone();
            if let Some(n) = r["version"]["name"].as_str() {
                version_str = n.to_string();
            } else if let Some(b) = r["version"]["build"].as_u64() {
                version_str = b.to_string();
            }

            // We identify the installed runtime by its exact name or URL hash?
            // Actually, we can install it using the unique identifier which we can just make `name` + `version_str`.
            // Let's use `name` + `_` + `version_str` as the install folder name, so we can detect it.
            let folder_id = format!("{}_{}", name, version_str.replace(" ", "_").replace(".", "_"));
            let install_path = PathBuf::from(&appdata).join("lflauncher").join("runtime").join("java").join(&provider).join(&major_version).join(&folder_id);
            
            let mut is_installed = false;
            let mut path = None;

            if install_path.exists() {
                if let Ok(entries) = std::fs::read_dir(&install_path) {
                    for entry in entries.flatten() {
                        let candidate_bin = entry.path().join("bin").join("java.exe");
                        if candidate_bin.exists() {
                            is_installed = true;
                            path = Some(candidate_bin.to_string_lossy().to_string());
                            break;
                        }
                        
                        // For directly nested bin
                        if entry.path().file_name().unwrap_or_default() == "bin" {
                             let exe = entry.path().join("java.exe");
                             if exe.exists() {
                                 is_installed = true;
                                 path = Some(exe.to_string_lossy().to_string());
                                 break;
                             }
                        }
                    }
                }
            }

            releases.push(JavaRuntime {
                version: version_str,
                name,
                release_time,
                package_type,
                url: url_str,
                is_installed,
                path,
                provider: Some(provider.clone()),
                major_version: Some(major_version.clone()),
                folder_id: Some(folder_id),
            });
        }
    }
    
    // Sort by version (descending)
    releases.sort_by(|a, b| b.version.cmp(&a.version));
    
    Ok(releases)
}

#[derive(Clone, Serialize)]
pub struct JavaDownloadProgress {
    pub progress: f32,
    pub status: String,
}

#[tauri::command]
pub async fn install_java(provider: String, major_version: String, folder_id: String, download_url: String, app: AppHandle) -> Result<String, String> {
    if download_url.is_empty() {
        return Err("No download URL provided".to_string());
    }

    let emit_log = |msg: String| {
        let _ = app.emit("game-log", format!("[Java Installation] {}", msg));
    };

    let emit_progress = |progress: f32, status: &str| {
        let _ = app.emit("java-download-progress", JavaDownloadProgress {
            progress,
            status: status.to_string(),
        });
    };

    emit_log(format!("Starting Java installation for provider: {}, version: {}, folder: {}", provider, major_version, folder_id));
    emit_log(format!("Download URL: {}", download_url));

    let appdata = std::env::var("APPDATA").unwrap_or_default();
    let runtime_dir = PathBuf::from(&appdata).join("lflauncher").join("runtime").join("java").join(&provider).join(&major_version).join(&folder_id);
    emit_log(format!("Installation directory: {}", runtime_dir.display()));

    if runtime_dir.exists() {
        emit_log("Cleaning up existing installation directory...".to_string());
        let _ = std::fs::remove_dir_all(&runtime_dir);
    }
    std::fs::create_dir_all(&runtime_dir).map_err(|e| {
        let err = format!("Failed to create installation directory: {}", e);
        emit_log(err.clone());
        err
    })?;

    let client = reqwest::Client::new();
    let mut installed_java_exe = String::new();

    if download_url.ends_with("manifest.json") {
        emit_log("Detected Mojang manifest-based download.".to_string());
        emit_progress(0.0, "Fetching manifest...");

        let manifest_resp = client.get(&download_url).send().await.map_err(|e| e.to_string())?;
        let manifest_json: serde_json::Value = manifest_resp.json().await.map_err(|e| e.to_string())?;
        let files = manifest_json["files"].as_object().ok_or("No files in Java manifest")?;

        let mut tasks = Vec::new();
        for (file_path, file_info) in files {
            let dest = runtime_dir.join(file_path);
            if file_info["type"].as_str() == Some("directory") {
                let _ = fs::create_dir_all(&dest);
                continue;
            }
            if let Some(raw) = file_info["downloads"]["raw"].as_object() {
                let url = raw["url"].as_str().unwrap_or("").to_string();
                let sha1 = raw["sha1"].as_str().unwrap_or("").to_string();
                if !url.is_empty() { tasks.push((url, dest, sha1)); }
            }
        }

        let total = tasks.len();
        emit_log(format!("Downloading {} files from manifest...", total));
        let mut downloaded = 0;
        
        let mut stream = futures_util::stream::iter(tasks).map(|(url, path, _sha1)| {
            let client = client.clone();
            async move {
                if let Some(p) = path.parent() { let _ = fs::create_dir_all(p); }
                let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
                if !resp.status().is_success() { return Err(format!("HTTP {}", resp.status())); }
                let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
                fs::write(&path, bytes).map_err(|e| e.to_string())?;
                Ok(())
            }
        }).buffer_unordered(20);

        while let Some(res) = stream.next().await {
            res.map_err(|e| {
                emit_log(format!("Failed to download manifest file: {}", e));
                e
            })?;
            downloaded += 1;
            if downloaded % 50 == 0 || downloaded == total {
                let p = (downloaded as f32 / total as f32) * 100.0;
                emit_progress(p, "Downloading...");
            }
        }

        // Try to find java.exe in the manifest structure
        // Usually it's in bin/java.exe or similar
        let candidates = [
            runtime_dir.join("bin").join("java.exe"),
            runtime_dir.join("jre").join("bin").join("java.exe"),
        ];
        for c in &candidates {
            if c.exists() {
                installed_java_exe = c.to_string_lossy().to_string();
                break;
            }
        }
        
        // If not found in common spots, search recursively
        if installed_java_exe.is_empty() {
            fn find_java_recursive(dir: &Path) -> Option<String> {
                if let Ok(entries) = fs::read_dir(dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_dir() {
                            if let Some(found) = find_java_recursive(&path) { return Some(found); }
                        } else if path.file_name().unwrap_or_default() == "java.exe" && path.to_string_lossy().contains("bin") {
                            return Some(path.to_string_lossy().to_string());
                        }
                    }
                }
                None
            }
            if let Some(found) = find_java_recursive(&runtime_dir) {
                installed_java_exe = found;
            }
        }
    } else {
        emit_log("Detected archive-based download (.zip).".to_string());
        emit_progress(0.0, "Downloading...");

        let res = client.get(&download_url).send().await.map_err(|e| {
            let err = format!("Failed to connect to download URL: {}", e);
            emit_log(err.clone());
            err
        })?;

        let total_size = res.content_length().unwrap_or(0);
        emit_log(format!("Content length: {} bytes", total_size));

        let temp_dir = std::env::temp_dir();
        let zip_path = temp_dir.join(format!("java_{}.zip", folder_id));
        let mut file = std::fs::File::create(&zip_path).map_err(|e| e.to_string())?;

        let mut downloaded: u64 = 0;
        let mut stream = res.bytes_stream();

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| e.to_string())?;
            file.write_all(&chunk).map_err(|e| e.to_string())?;
            downloaded += chunk.len() as u64;

            if total_size > 0 {
                let progress = (downloaded as f32 / total_size as f32) * 80.0;
                emit_progress(progress, "Downloading...");
            }
        }

        emit_log("Download complete. Extracting...".to_string());
        emit_progress(80.0, "Extracting...");

        let zip_file = std::fs::File::open(&zip_path).map_err(|e| e.to_string())?;
        let mut archive = zip::ZipArchive::new(zip_file).map_err(|e| e.to_string())?;

        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
            let outpath = match file.enclosed_name() {
                Some(path) => runtime_dir.join(path),
                None => continue,
            };

            if file.is_dir() {
                std::fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
            } else {
                if let Some(p) = outpath.parent() {
                    if !p.exists() {
                        std::fs::create_dir_all(p).map_err(|e| e.to_string())?;
                    }
                }
                let mut outfile = std::fs::File::create(&outpath).map_err(|e| e.to_string())?;
                std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
                
                if outpath.file_name().unwrap_or_default() == "java.exe" && outpath.to_string_lossy().contains("bin") {
                    installed_java_exe = outpath.to_string_lossy().to_string();
                }
            }
        }
        let _ = std::fs::remove_file(zip_path);
    }

    emit_log("Process complete.".to_string());
    emit_progress(100.0, "Done");

    if installed_java_exe.is_empty() {
        let err = "java.exe not found in downloaded runtime.".to_string();
        emit_log(err.clone());
        return Err(err);
    }

    emit_log(format!("Java installed successfully at: {}", installed_java_exe));
    Ok(installed_java_exe)
}

#[tauri::command]
pub async fn remove_java(provider: String, major_version: String, folder_id: String) -> Result<(), String> {
    let appdata = std::env::var("APPDATA").unwrap_or_default();
    let runtime_dir = PathBuf::from(&appdata).join("lflauncher").join("runtime").join("java").join(&provider).join(&major_version).join(&folder_id);
    if runtime_dir.exists() {
        std::fs::remove_dir_all(runtime_dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_installed_java() -> Result<Vec<JavaRuntime>, String> {
    let appdata = std::env::var("APPDATA").unwrap_or_default();
    let base_path = PathBuf::from(&appdata).join("lflauncher").join("runtime").join("java");
    
    let mut runtimes = Vec::new();
    
    if !base_path.exists() {
        return Ok(runtimes);
    }

    // Walk through providers
    if let Ok(providers) = fs::read_dir(&base_path) {
        for provider_entry in providers.flatten() {
            let provider_path = provider_entry.path();
            if !provider_path.is_dir() { continue; }
            let provider_name = provider_path.file_name().unwrap_or_default().to_string_lossy().to_string();

            // Walk through major versions
            if let Ok(majors) = fs::read_dir(&provider_path) {
                for major_entry in majors.flatten() {
                    let major_path = major_entry.path();
                    if !major_path.is_dir() { continue; }
                    let major_version = major_path.file_name().unwrap_or_default().to_string_lossy().to_string();

                    // Walk through folder_ids
                    if let Ok(folders) = fs::read_dir(&major_path) {
                        for folder_entry in folders.flatten() {
                            let folder_path = folder_entry.path();
                            if !folder_path.is_dir() { continue; }
                            
                            let folder_id = folder_path.file_name().unwrap_or_default().to_string_lossy().to_string();
                            
                            // Find java.exe
                            let mut path = None;
                            if let Ok(entries) = fs::read_dir(&folder_path) {
                                for entry in entries.flatten() {
                                    let bin = entry.path().join("bin").join("java.exe");
                                    if bin.exists() {
                                        path = Some(bin.to_string_lossy().to_string());
                                        break;
                                    }
                                    if entry.path().file_name().unwrap_or_default() == "bin" {
                                        let exe = entry.path().join("java.exe");
                                        if exe.exists() {
                                            path = Some(exe.to_string_lossy().to_string());
                                            break;
                                        }
                                    }
                                }
                            }

                            // If not found in direct children, try one level deeper (for some archive extractions)
                            if path.is_none() {
                                if let Ok(entries) = fs::read_dir(&folder_path) {
                                    for entry in entries.flatten() {
                                        if entry.path().is_dir() {
                                            let bin = entry.path().join("bin").join("java.exe");
                                            if bin.exists() {
                                                path = Some(bin.to_string_lossy().to_string());
                                                break;
                                            }
                                        }
                                    }
                                }
                            }

                            if let Some(p) = path {
                                let parts: Vec<&str> = folder_id.splitn(2, '_').collect();
                                let name = parts.get(0).unwrap_or(&"Unknown").to_string();
                                let version = parts.get(1).unwrap_or(&"Unknown").replace("_", ".");

                                runtimes.push(JavaRuntime {
                                    version,
                                    name: format!("{} ({})", name, provider_name),
                                    release_time: "".to_string(),
                                    package_type: "jre".to_string(),
                                    url: "".to_string(),
                                    is_installed: true,
                                    path: Some(p),
                                    provider: Some(provider_name.clone()),
                                    major_version: Some(major_version.clone()),
                                    folder_id: Some(folder_id),
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Sort by version descending
    runtimes.sort_by(|a, b| b.version.cmp(&a.version));
    
    Ok(runtimes)
}
