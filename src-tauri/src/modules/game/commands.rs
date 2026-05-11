use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};
use crate::models::{Profile};
use crate::modules::game::game::{MinecraftLauncher, LaunchProgress};

#[tauri::command]
pub async fn play_game(app: AppHandle, profile_id: String) -> Result<(), String> {
    let app_data = std::env::var("APPDATA").map_err(|e| e.to_string())?;
    let profiles_path = Path::new(&app_data).join("lflauncher").join("profiles.json");
    if !profiles_path.exists() { return Err("No profiles found.".to_string()); }
    let content = fs::read_to_string(&profiles_path).map_err(|e| e.to_string())?;
    let profiles: Vec<Profile> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    let profile = profiles.iter().find(|p| p.id == profile_id).ok_or_else(|| "Profile not found".to_string())?;

    // Check Memory if enabled
    if let Ok(settings) = crate::modules::settings::settings::load_launcher_settings() {
        if settings["warn_low_memory"].as_bool().unwrap_or(true) {
            let available_ram = crate::modules::shared_utils::get_available_ram_mb();
            let required_ram = profile.ram_mb as u64;
            
            if available_ram < required_ram {
                return Err(format!(
                    "Not enough available memory! You have allocated {}MB for this profile, but your system only has {}MB free. Please close some applications or reduce allocated RAM in settings.",
                    required_ram, available_ram
                ));
            }
        }
    }

    let shared_base = PathBuf::from(&app_data).join(".minecraft");
    let assets_path = shared_base.join("assets");
    let libraries_path = shared_base.join("libraries");
    
    // Each profile has its own separate instance folder named after the profile name, with a /minecraft subfolder
    let folder_name = if profile.name.is_empty() { &profile_id } else { &profile.name };
    let instance_path = PathBuf::from(&app_data).join("lflauncher").join("instances").join(folder_name).join("minecraft");
    let base_path = instance_path.clone(); // Versions will be stored here
    let game_dir = if profile.install_path == "auto" { instance_path.clone() } else { PathBuf::from(&profile.install_path) };
    
    let launcher = MinecraftLauncher::new(app.clone(), base_path, assets_path, libraries_path, game_dir);
    let user_data = crate::modules::auth::get_secure_user(app.clone()).await.unwrap_or(None);
    
    let version_data = match launcher.install(&profile.version, &profile.loader, &profile.loader_version).await {
        Ok(v) => v,
        Err(e) => {
            launcher.save_error_log(&profile.version, &e);
            let _ = app.emit("launch-status", LaunchProgress { message: format!("Install failed: {}", e), percentage: 0.0, status: "error".to_string() });
            return Err(e);
        }
    };

    if let Err(e) = launcher.launch(profile, &version_data, user_data).await {
        launcher.save_error_log(&profile.version, &e);
        let _ = app.emit("launch-status", LaunchProgress { message: format!("Launch failed: {}", e), percentage: 0.0, status: "error".to_string() });
        return Err(e);
    }
    launcher.emit_progress("Game is running!", 100.0, "success");
    Ok(())
}

#[tauri::command]
pub fn open_log_folder() -> Result<(), String> {
    let app_data = std::env::var("APPDATA").map_err(|e| e.to_string())?;
    let logs_dir = Path::new(&app_data).join("lflauncher").join("logs");
    let _ = fs::create_dir_all(&logs_dir);
    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer").arg(logs_dir).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_recent_logs() -> Result<Vec<String>, String> {
    use std::cmp::Reverse;
    let app_data = std::env::var("APPDATA").map_err(|e| e.to_string())?;
    let logs_dir = Path::new(&app_data).join("lflauncher").join("logs");
    if !logs_dir.exists() { return Ok(vec![]); }
    let mut entries: Vec<_> = fs::read_dir(&logs_dir).map_err(|e| e.to_string())?.filter_map(|e| e.ok()).filter(|e| e.path().extension().map(|x| x == "log").unwrap_or(false)).collect();
    entries.sort_by_key(|e| Reverse(e.file_name()));
    Ok(entries.iter().take(5).filter_map(|e| fs::read_to_string(e.path()).ok()).collect())
}

#[tauri::command]
pub fn check_installation(profile_id: String) -> Result<bool, String> {
    let app_data = std::env::var("APPDATA").map_err(|e| e.to_string())?;
    let profiles_path = Path::new(&app_data).join("lflauncher").join("profiles.json");
    if !profiles_path.exists() { return Ok(false); }
    let content = fs::read_to_string(&profiles_path).map_err(|e| e.to_string())?;
    let profiles: Vec<Profile> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    let profile = profiles.iter().find(|p| p.id == profile_id).ok_or_else(|| "Profile not found".to_string())?;

    let mut actual_version = profile.version.clone();
    if actual_version == "Latest release" || actual_version == "Latest snapshot" {
        let cache_path = Path::new(&app_data).join("lflauncher").join("versions").join("version_manifest.json");
        if let Ok(content) = fs::read_to_string(cache_path) {
            if let Ok(manifest) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(v) = if actual_version == "Latest release" { manifest["latest"]["release"].as_str() } else { manifest["latest"]["snapshot"].as_str() } {
                    actual_version = v.to_string();
                }
            }
        }
    }
    let shared_base = PathBuf::from(&app_data).join(".minecraft");
    let folder_name = if profile.name.is_empty() { &profile_id } else { &profile.name };
    let instance_path = PathBuf::from(&app_data).join("lflauncher").join("instances").join(folder_name).join("minecraft");
    let jar_path = instance_path.join("versions").join(&actual_version).join(format!("{}.jar", actual_version));
    let indexes_dir = shared_base.join("assets").join("indexes");
    let has_any_index = indexes_dir.exists() && fs::read_dir(&indexes_dir).map(|mut d| d.next().is_some()).unwrap_or(false);
    Ok(jar_path.exists() && has_any_index)
}

#[tauri::command]
pub fn export_logs(logs: String) -> Result<(), String> {
    if let Some(path) = rfd::FileDialog::new().set_file_name("lflauncher_logs.txt").save_file() {
        std::fs::write(&path, logs).map_err(|e| e.to_string())?;
    }
    Ok(())
}
