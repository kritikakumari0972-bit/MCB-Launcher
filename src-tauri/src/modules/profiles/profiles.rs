use std::fs;
use std::path::{Path, PathBuf};
use crate::models::{Profile, BedrockProfile};

#[tauri::command]
pub async fn delete_installation(profile_id: String, delete_files: bool) -> Result<(), String> {
    let app_data = std::env::var("APPDATA").map_err(|e| e.to_string())?;
    let profiles_path = Path::new(&app_data).join("lflauncher").join("profiles.json");
    
    if !profiles_path.exists() { return Ok(()); }
    
    let content = fs::read_to_string(&profiles_path).map_err(|e| e.to_string())?;
    let mut profiles: Vec<Profile> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    if let Some(pos) = profiles.iter().position(|p| p.id == profile_id) {
        let profile = profiles.remove(pos);
        
        if delete_files {
            let folder_name = if profile.name.is_empty() { &profile_id } else { &profile.name };
            let instance_path = PathBuf::from(&app_data).join("lflauncher").join("instances").join(folder_name);
            if instance_path.exists() {
                let _ = fs::remove_dir_all(instance_path);
            }
        }
        
        let new_content = serde_json::to_string_pretty(&profiles).map_err(|e| e.to_string())?;
        fs::write(profiles_path, new_content).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn delete_bedrock_installation(profile_id: String) -> Result<(), String> {
    let app_data = std::env::var("APPDATA").map_err(|e| e.to_string())?;
    let profiles_path = Path::new(&app_data).join("lflauncher").join("profiles_be.json");
    
    // 1. Try to remove from profiles.json if it exists
    if profiles_path.exists() {
        if let Ok(content) = fs::read_to_string(&profiles_path) {
            if let Ok(mut profiles) = serde_json::from_str::<Vec<BedrockProfile>>(&content) {
                if let Some(pos) = profiles.iter().position(|p| p.id == profile_id) {
                    let profile = profiles.remove(pos);
                    // If it was a profile, try deleting by its version name first
                    let bedrock_dir = Path::new(&app_data).join("lflauncher").join("bedrock_versions").join(&profile.version);
                    if bedrock_dir.exists() {
                        let _ = fs::remove_dir_all(bedrock_dir);
                    }
                    let _ = fs::write(&profiles_path, serde_json::to_string_pretty(&profiles).unwrap_or_default());
                }
            }
        }
    }
    
    // 2. Also try to delete folder directly using profile_id (it might be the version name for non-profile items)
    let bedrock_dir = Path::new(&app_data).join("lflauncher").join("bedrock_versions").join(&profile_id);
    if bedrock_dir.exists() {
        let _ = fs::remove_dir_all(bedrock_dir);
    }

    Ok(())
}

#[tauri::command]
pub async fn save_profile(profile: Profile) -> Result<(), String> {
    let app_data = std::env::var("APPDATA").map_err(|e| e.to_string())?;
    let profiles_path = Path::new(&app_data).join("lflauncher").join("profiles.json");
    
    // Ensure parent directory exists
    if let Some(parent) = profiles_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    
    let mut profiles: Vec<Profile> = if profiles_path.exists() {
        let content = fs::read_to_string(&profiles_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_else(|_| vec![])
    } else {
        vec![]
    };

    if let Some(existing) = profiles.iter_mut().find(|p| p.id == profile.id) {
        *existing = profile;
    } else {
        profiles.push(profile);
    }

    let content = serde_json::to_string_pretty(&profiles).map_err(|e| e.to_string())?;
    fs::write(profiles_path, content).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_profiles() -> Result<Vec<Profile>, String> {
    let app_data = std::env::var("APPDATA").map_err(|e| e.to_string())?;
    let profiles_path = Path::new(&app_data).join("lflauncher").join("profiles.json");
    
    if profiles_path.exists() {
        let content = fs::read_to_string(profiles_path).map_err(|e| e.to_string())?;
        let profiles: Vec<Profile> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        Ok(profiles)
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
pub async fn save_bedrock_profile(profile: BedrockProfile) -> Result<(), String> {
    let app_data = std::env::var("APPDATA").map_err(|e| e.to_string())?;
    let profiles_path = Path::new(&app_data).join("lflauncher").join("profiles_be.json");
    
    if let Some(parent) = profiles_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    
    let mut profiles: Vec<BedrockProfile> = if profiles_path.exists() {
        let content = fs::read_to_string(&profiles_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_else(|_| vec![])
    } else {
        vec![]
    };

    if let Some(existing) = profiles.iter_mut().find(|p| p.id == profile.id) {
        *existing = profile;
    } else {
        profiles.push(profile);
    }

    let content = serde_json::to_string_pretty(&profiles).map_err(|e| e.to_string())?;
    fs::write(profiles_path, content).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_bedrock_profiles() -> Result<Vec<BedrockProfile>, String> {
    let app_data = std::env::var("APPDATA").map_err(|e| e.to_string())?;
    let profiles_path = Path::new(&app_data).join("lflauncher").join("profiles_be.json");
    
    if profiles_path.exists() {
        let content = fs::read_to_string(profiles_path).map_err(|e| e.to_string())?;
        let profiles: Vec<BedrockProfile> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        Ok(profiles)
    } else {
        Ok(vec![])
    }
}
