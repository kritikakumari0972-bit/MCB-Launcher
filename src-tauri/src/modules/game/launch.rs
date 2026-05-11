use std::path::{PathBuf};
use tokio::io::{AsyncBufReadExt, BufReader};
use tauri::{Emitter};
use crate::models::{Profile, MinecraftVersion};
use crate::modules::game::game::{MinecraftLauncher, LaunchProgress};
use crate::modules::game::java;

impl MinecraftLauncher {
    pub async fn launch(&self, profile: &Profile, version_data: &MinecraftVersion, user_data: Option<crate::modules::auth::UserData>) -> Result<(), String> {
        self.emit_progress("Preparing launch arguments...", 95.0, "starting");

        let mut classpath: Vec<String> = Vec::new();
        let mut classpath_seen: std::collections::HashSet<String> = std::collections::HashSet::new();
        let os_name = "windows";

        #[cfg(target_os = "windows")]
        fn get_short_path(path: &str) -> String {
            use std::os::windows::ffi::OsStrExt;
            use windows::Win32::Storage::FileSystem::GetShortPathNameW;
            let wide: Vec<u16> = std::ffi::OsStr::new(path).encode_wide().chain(Some(0)).collect();
            let len = unsafe { GetShortPathNameW(windows::core::PCWSTR(wide.as_ptr()), None) };
            if len == 0 { return path.to_string(); }
            let mut buf = vec![0u16; len as usize];
            let res = unsafe { GetShortPathNameW(windows::core::PCWSTR(wide.as_ptr()), Some(&mut buf)) };
            if res == 0 { return path.to_string(); }
            String::from_utf16_lossy(&buf[..res as usize])
        }
        #[cfg(not(target_os = "windows"))]
        fn get_short_path(path: &str) -> String {
            path.to_string()
        }

        let base_path_short = get_short_path(&self.base_path.to_string_lossy());
        let game_dir_short = get_short_path(&self.game_dir.to_string_lossy());
        let assets_root = get_short_path(&self.assets_path.to_string_lossy());
        let library_dir = get_short_path(&self.libraries_path.to_string_lossy());


        for lib in &version_data.libraries {
            if !self.should_include_library(lib, os_name) { continue; }
            if let Some(downloads) = &lib.downloads {
                if let Some(artifact) = &downloads.artifact {
                    if let Some(ref path) = artifact.path {
                        let path_safe = path.replace('/', std::path::MAIN_SEPARATOR_STR);
                        let full = std::path::Path::new(&library_dir).join(path_safe).to_string_lossy().to_string();
                        let key = full.replace('\\', "/");
                        if classpath_seen.insert(key) { classpath.push(full); }
                    }
                }
            } else {
                // Mod loader library (Maven) — support optional classifier (group:name:version:classifier)
                let parts: Vec<&str> = lib.name.split(':').collect();
                if parts.len() >= 3 {
                    let group = parts[0].replace('.', "/");
                    let name = parts[1];
                    let version = parts[2];
                    let classifier = if parts.len() >= 4 { format!("-{}", parts[3]) } else { "".to_string() };
                    let path = format!("{}/{}/{}/{}-{}{}.jar", group, name, version, name, version, classifier).replace('/', std::path::MAIN_SEPARATOR_STR);
                    let full = std::path::Path::new(&library_dir).join(path).to_string_lossy().to_string();
                    let key = full.replace('\\', "/");
                    if classpath_seen.insert(key) { classpath.push(full); }
                }
            }
        }
        {
            let game_jar = std::path::Path::new(&base_path_short).join("versions").join(&version_data.id).join(format!("{}.jar", version_data.id)).to_string_lossy().to_string();
            let key = game_jar.replace('\\', "/");
            if classpath_seen.insert(key) { classpath.push(game_jar); }
        }

        let separator = if cfg!(target_os = "windows") { ";" } else { ":" };
        let classpath_str = classpath.join(separator);
        let natives_dir = get_short_path(&self.base_path.join("versions").join(&version_data.id).join("natives").to_string_lossy());

        let mut args = Vec::new();
        args.push(format!("-Xmx{}M", profile.ram_mb));
        
        let auth_name = user_data.as_ref().map(|u| u.name.as_str()).unwrap_or("Player");
        let account_type = user_data.as_ref().map(|u| u.account_type.as_str()).unwrap_or("Offline");
        let auth_uuid = user_data.as_ref().and_then(|u| u.uuid.as_deref()).map(|s| s.to_string()).unwrap_or_else(|| {
            // Generate standard Offline UUID: md5("OfflinePlayer:" + name)
            let hash = md5::compute(format!("OfflinePlayer:{}", auth_name));
            let mut uuid = format!("{:x}", hash);
            // Insert dashes to match UUID format: 8-4-4-4-12
            uuid.insert(20, '-');
            uuid.insert(16, '-');
            uuid.insert(12, '-');
            uuid.insert(8, '-');
            uuid
        });
        let auth_token = user_data.as_ref().and_then(|u| u.token.as_deref()).unwrap_or("0");

        // Authlib-Injector logic for Ely.by accounts
        if account_type == "Ely.by" {
            let injector_path = self.base_path.join("authlib-injector.jar");
            if !injector_path.exists() {
                self.emit_progress("Downloading authlib-injector...", 96.0, "downloading");
                let url = "https://github.com/yushijinhun/authlib-injector/releases/download/v1.2.7/authlib-injector-1.2.7.jar";
                match reqwest::get(url).await {
                    Ok(resp) if resp.status().is_success() => {
                        if let Ok(bytes) = resp.bytes().await {
                            let _ = std::fs::write(&injector_path, bytes);
                        }
                    }
                    _ => {
                        self.emit_log("Warning: Failed to download authlib-injector.jar. Skins might not work.");
                    }
                }
            }
            if injector_path.exists() {
                let injector_short = get_short_path(&injector_path.to_string_lossy());
                args.push(format!("-javaagent:{}={}", injector_short, "https://authserver.ely.by"));
            }
        }

        let replace_vars = |s: &str| -> String {
            s.replace("${auth_player_name}", auth_name)
             .replace("${version_name}", &version_data.id)
             .replace("${game_directory}", &game_dir_short)
             .replace("${assets_root}", &assets_root)
             .replace("${game_assets}", &assets_root)
             .replace("${assets_index_name}", &version_data.asset_index.id)
             .replace("${auth_uuid}", &auth_uuid)
             .replace("${auth_access_token}", auth_token)
             .replace("${auth_session}", auth_token)
             .replace("${user_properties}", "{}")
             .replace("${user_type}", if account_type == "Ely.by" { "mojang" } else { "legacy" })
             .replace("${version_type}", if profile.loader == "vanilla" { "release" } else { &profile.loader })
             .replace("${resolution_width}", &profile.resolution_width.unwrap_or(854).to_string())
             .replace("${resolution_height}", &profile.resolution_height.unwrap_or(480).to_string())
             .replace("${launcher_name}", "LFLauncher")
             .replace("${launcher_version}", env!("CARGO_PKG_VERSION"))
             .replace("${classpath}", &classpath_str)
             .replace("${classpath_separator}", separator)
             .replace("${natives_directory}", &natives_dir)
             .replace("${library_directory}", &library_dir)
             .replace("${clientid}", "LFLauncher")
             .replace("${auth_xuid}", "0")
        };

        if let Some(arguments) = &version_data.arguments {
            for v in &arguments.jvm { args.extend(self.collect_manifest_arguments(v, os_name, &replace_vars)); }
        } else {
            args.push(format!("-Djava.library.path={}", natives_dir));
            args.push("-cp".to_string()); args.push(classpath_str.clone());
        }
        if !profile.jvm_args.is_empty() { for arg in profile.jvm_args.split_whitespace() { args.push(arg.to_string()); } }
        args.push(version_data.main_class.clone());

        let mut game_args = Vec::new();
        if let Some(minecraft_args) = &version_data.minecraft_arguments {
            for arg in minecraft_args.split_whitespace() { game_args.push(replace_vars(arg)); }
        } else if let Some(arguments) = &version_data.arguments {
            for v in &arguments.game { game_args.extend(self.collect_manifest_arguments(v, os_name, &replace_vars)); }
        }
        args.extend(game_args);

        self.emit_progress("Starting Minecraft process...", 98.0, "starting");
        
        let java_path = {
            if let Some(path) = profile.java_executable.as_deref().filter(|p| !p.is_empty() && *p != "java") {
                get_short_path(path)
            } else {
                // Check if InstallPath is actually a Java directory (user mistake)
                let install_path = PathBuf::from(&profile.install_path);
                let candidates = [
                    install_path.join("bin").join("javaw.exe"),
                    install_path.join("bin").join("java.exe"),
                    install_path.join("jre").join("bin").join("javaw.exe"),
                ];
                
                let mut found_in_install = None;
                for c in &candidates {
                    if c.exists() {
                        found_in_install = Some(get_short_path(&c.to_string_lossy()));
                        break;
                    }
                }

                if let Some(path) = found_in_install {
                    path
                } else if let Some(jv) = &version_data.java_version {
                    let appdata = std::env::var("APPDATA").unwrap_or_default();
                    let bin_new = PathBuf::from(&appdata).join(".minecraft").join("runtime").join(&jv.component).join("windows-x64").join(&jv.component).join("bin");
                    let p = bin_new.join("javaw.exe");
                    if p.exists() { 
                        get_short_path(&p.to_string_lossy()) 
                    } else { 
                        get_short_path(&java::find_best_java(&profile.version, None))
                    }
                } else {
                    get_short_path(&java::find_best_java(&profile.version, None))
                }
            }
        };

        self.emit_log(&format!("Using Java executable: {}", java_path));
        self.emit_log(&format!("Running: {} {}", java_path, args.join(" ")));
        
        let mut child = tokio::process::Command::new(&java_path)
            .args(&args)
            .current_dir(std::path::Path::new(&game_dir_short)) // Chạy game trong đúng thư mục làm việc (dạng short path)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn Minecraft (Java Path: {}): {}", java_path, e))?;

        let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(1000);
        let app_log = self.app.clone();
        
        // Log Batcher task
        tokio::spawn(async move {
            let mut batch = Vec::new();
            let mut interval = tokio::time::interval(std::time::Duration::from_millis(100));
            loop {
                tokio::select! {
                    res = rx.recv() => {
                        if let Some(line) = res {
                            batch.push(line);
                            if batch.len() > 50 {
                                let _ = app_log.emit("game-log", batch.join("\n"));
                                batch.clear();
                            }
                        } else {
                            // All senders dropped, process finished
                            if !batch.is_empty() {
                                let _ = app_log.emit("game-log", batch.join("\n"));
                            }
                            break;
                        }
                    }
                    _ = interval.tick() => {
                        if !batch.is_empty() {
                            let _ = app_log.emit("game-log", batch.join("\n"));
                            batch.clear();
                        }
                    }
                }
            }
        });

        let stdout = child.stdout.take().unwrap();
        let stderr = child.stderr.take().unwrap();
        
        let tx_stdout = tx.clone();
        tokio::spawn(async move {
            let mut reader = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = reader.next_line().await { 
                let _ = tx_stdout.send(format!("[STDOUT] {}", line)).await; 
            }
        });

        let tx_stderr = tx.clone();
        tokio::spawn(async move {
            let mut reader = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = reader.next_line().await { 
                let _ = tx_stderr.send(format!("[STDERR] {}", line)).await; 
            }
        });

        let app_status = self.app.clone();
        tokio::spawn(async move {
            let status = child.wait().await;
            println!("Minecraft exited with status: {:?}", status);
            let _ = app_status.emit("launch-status", LaunchProgress { message: format!("Game closed: {:?}", status), percentage: 0.0, status: "closed".to_string() });
        });
        Ok(())
    }

    pub fn should_include_library(&self, lib: &crate::models::Library, os_name: &str) -> bool {
        let Some(rules) = &lib.rules else { return true; };
        let mut allowed = false;
        for rule in rules {
            let matches_os = rule.os.as_ref().map(|o| o.name == os_name).unwrap_or(true);
            if matches_os { allowed = rule.action == "allow"; }
        }
        allowed
    }

    pub fn is_argument_rule_allowed(&self, rules: &[serde_json::Value], os_name: &str) -> bool {
        let mut allowed = false;
        for rule in rules {
            if rule.get("features").is_some() { continue; }
            let matches_os = match rule.get("os") {
                Some(os) => os.get("name").and_then(|v| v.as_str()).map(|n| n == os_name).unwrap_or(false),
                None => true,
            };
            if matches_os { allowed = rule.get("action").and_then(|v| v.as_str()) == Some("allow"); }
        }
        allowed
    }

    pub fn collect_manifest_arguments(&self, arg: &serde_json::Value, os_name: &str, replace_vars: &dyn Fn(&str) -> String) -> Vec<String> {
        if let Some(s) = arg.as_str() { return vec![replace_vars(s)]; }
        let Some(obj) = arg.as_object() else { return Vec::new(); };
        let allowed = obj.get("rules").and_then(|v| v.as_array()).map(|r| self.is_argument_rule_allowed(r, os_name)).unwrap_or(true);
        if !allowed { return Vec::new(); }
        match obj.get("value") {
            Some(serde_json::Value::String(s)) => vec![replace_vars(s)],
            Some(serde_json::Value::Array(vs)) => vs.iter().filter_map(|v| v.as_str()).map(replace_vars).collect(),
            _ => Vec::new(),
        }
    }
}
