use std::fs;
use std::path::Path;
use serde_json::json;

#[tauri::command]
pub fn save_launcher_settings(
    disable_gpu: bool,
    show_releases: bool,
    show_snapshots: bool,
    show_old_beta: bool,
    show_old_alpha: bool,
    open_log_on_start: bool,
    keep_launcher_open: bool,
    big_text: bool,
    auto_detect_java: bool,
    auto_download_java: bool,
    warn_low_memory: bool,
) -> Result<(), String> {
    let app_data = std::env::var("APPDATA").map_err(|e| e.to_string())?;
    let config_dir = Path::new(&app_data).join("lflauncher");
    
    if !config_dir.exists() {
        let _ = fs::create_dir_all(&config_dir);
    }
    
    let config_path = config_dir.join("config.json");
    let mut config = if config_path.exists() {
        let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
        serde_json::from_str::<serde_json::Value>(&content).unwrap_or_else(|_| json!({}))
    } else {
        json!({})
    };

    config["disable_gpu"] = json!(disable_gpu);
    config["show_releases"] = json!(show_releases);
    config["show_snapshots"] = json!(show_snapshots);
    config["show_old_beta"] = json!(show_old_beta);
    config["show_old_alpha"] = json!(show_old_alpha);
    config["open_log_on_start"] = json!(open_log_on_start);
    config["keep_launcher_open"] = json!(keep_launcher_open);
    config["big_text"] = json!(big_text);
    config["auto_detect_java"] = json!(auto_detect_java);
    config["auto_download_java"] = json!(auto_download_java);
    config["warn_low_memory"] = json!(warn_low_memory);
    
    fs::write(config_path, serde_json::to_string_pretty(&config).unwrap_or_else(|_| config.to_string())).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn set_last_selected_profile(id: String) -> Result<(), String> {
    let app_data = std::env::var("APPDATA").map_err(|e| e.to_string())?;
    let config_path = Path::new(&app_data).join("lflauncher").join("config.json");
    
    let mut config = if config_path.exists() {
        let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
        serde_json::from_str::<serde_json::Value>(&content).unwrap_or_else(|_| json!({}))
    } else {
        json!({})
    };

    config["last_selected_profile_id"] = json!(id);
    
    fs::write(config_path, serde_json::to_string_pretty(&config).unwrap_or_else(|_| config.to_string())).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn set_last_selected_profile_be(id: String) -> Result<(), String> {
    let app_data = std::env::var("APPDATA").map_err(|e| e.to_string())?;
    let config_path = Path::new(&app_data).join("lflauncher").join("config.json");
    
    let mut config = if config_path.exists() {
        let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
        serde_json::from_str::<serde_json::Value>(&content).unwrap_or_else(|_| json!({}))
    } else {
        json!({})
    };

    config["last_selected_profile_be_id"] = json!(id);
    
    fs::write(config_path, serde_json::to_string_pretty(&config).unwrap_or_else(|_| config.to_string())).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn load_launcher_settings() -> Result<serde_json::Value, String> {
    let app_data = std::env::var("APPDATA").map_err(|e| e.to_string())?;
    let config_path = Path::new(&app_data).join("lflauncher").join("config.json");
    
    if config_path.exists() {
        let content = fs::read_to_string(config_path).map_err(|e| e.to_string())?;
        let mut json: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        
        // Ensure defaults if missing
        if json.get("disable_gpu").is_none() { json["disable_gpu"] = json!(true); }
        if json.get("show_releases").is_none() { json["show_releases"] = json!(true); }
        if json.get("show_snapshots").is_none() { json["show_snapshots"] = json!(false); }
        if json.get("show_old_beta").is_none() { json["show_old_beta"] = json!(false); }
        if json.get("show_old_alpha").is_none() { json["show_old_alpha"] = json!(false); }
        if json.get("open_log_on_start").is_none() { json["open_log_on_start"] = json!(false); }
        if json.get("keep_launcher_open").is_none() { json["keep_launcher_open"] = json!(true); }
        if json.get("big_text").is_none() { json["big_text"] = json!(false); }
        if json.get("auto_detect_java").is_none() { json["auto_detect_java"] = json!(true); }
        if json.get("auto_download_java").is_none() { json["auto_download_java"] = json!(true); }
        if json.get("warn_low_memory").is_none() { json["warn_low_memory"] = json!(true); }
        if json.get("last_selected_profile_id").is_none() { json["last_selected_profile_id"] = json!(""); }
        if json.get("last_selected_profile_be_id").is_none() { json["last_selected_profile_be_id"] = json!(""); }

        Ok(json)
    } else {
        // Default settings
        Ok(json!({ 
            "disable_gpu": true,
            "show_releases": true,
            "show_snapshots": false,
            "show_old_beta": false,
            "show_old_alpha": false,
            "open_log_on_start": false,
            "keep_launcher_open": true,
            "big_text": false,
            "auto_detect_java": true,
            "auto_download_java": true,
            "warn_low_memory": true,
            "last_selected_profile_id": "",
            "last_selected_profile_be_id": ""
        }))
    }
}
