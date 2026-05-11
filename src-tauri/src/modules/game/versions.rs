use std::fs;
use std::path::Path;
use serde_json::json;

#[tauri::command]
pub async fn get_all_version_sources() -> Result<serde_json::Value, String> {
    let app_data = std::env::var("APPDATA").map_err(|e| e.to_string())?;
    let cache_dir = Path::new(&app_data).join("lflauncher").join("versions");
    if !cache_dir.exists() {
        fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;
    }
    let cache_path = cache_dir.join("version_manifest.json");

    let mojang_url = "https://launchermeta.mojang.com/mc/game/version_manifest.json";
    let client = reqwest::Client::new();
    
    // Fetch Mojang manifest first to check for updates
    let mojang_res = client.get(mojang_url).send().await.map_err(|e| e.to_string())?;
    let mojang_json: serde_json::Value = mojang_res.json().await.map_err(|e| e.to_string())?;

    let mut is_new = true;
    if cache_path.exists() {
        if let Ok(content) = fs::read_to_string(&cache_path) {
            if let Ok(cached_json) = serde_json::from_str::<serde_json::Value>(&content) {
                // If latest release and snapshot are the same, we might not need to update
                if cached_json["latest"] == mojang_json["latest"] {
                    is_new = false;
                }
            }
        }
    }

    if !is_new {
        return Ok(json!({ 
            "status": "already_latest",
            "vanilla": mojang_json
        }));
    }

    // It's new or no cache, fetch others concurrently
    let fabric_url = "https://meta.fabricmc.net/v2/versions/game";
    let quilt_url = "https://meta.quiltmc.org/v3/versions";

    let (fabric_res, quilt_res) = tokio::join!(
        client.get(fabric_url).send(),
        client.get(quilt_url).send()
    );

    let fabric_json: Option<serde_json::Value> = match fabric_res {
        Ok(res) => res.json().await.ok(),
        Err(_) => None,
    };
    
    let quilt_json: Option<serde_json::Value> = match quilt_res {
        Ok(res) => res.json().await.ok(),
        Err(_) => None,
    };

    // Save mojang manifest to cache for next time
    let _ = fs::write(&cache_path, mojang_json.to_string());

    Ok(json!({
        "status": "updated",
        "vanilla": mojang_json,
        "fabric": fabric_json,
        "quilt": quilt_json
    }))
}

#[tauri::command]
pub async fn get_loader_versions(loader: String, game_version: String) -> Result<Vec<String>, String> {
    let client = reqwest::Client::new();
    
    match loader.to_lowercase().as_str() {
        "fabric" => {
            let url = format!("https://meta.fabricmc.net/v2/versions/loader/{}", game_version);
            let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
            let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
            let mut versions = Vec::new();
            if let Some(arr) = json.as_array() {
                for item in arr {
                    if let Some(loader_obj) = item.get("loader") {
                        if let Some(v) = loader_obj.get("version").and_then(|v| v.as_str()) {
                            versions.push(v.to_string());
                        }
                    }
                }
            }
            Ok(versions)
        }
        "quilt" => {
            let url = format!("https://meta.quiltmc.org/v3/versions/loader/{}", game_version);
            let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
            let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
            let mut versions = Vec::new();
            if let Some(arr) = json.as_array() {
                for item in arr {
                    if let Some(loader_obj) = item.get("loader") {
                        if let Some(v) = loader_obj.get("version").and_then(|v| v.as_str()) {
                            versions.push(v.to_string());
                        }
                    }
                }
            }
            Ok(versions)
        }
        "forge" => {
            let url = "https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml";
            let res = client.get(url).send().await.map_err(|e| e.to_string())?;
            let body = res.text().await.map_err(|e| e.to_string())?;
            let mut versions = Vec::new();
            
            let prefix = format!("{}-", game_version);
            
            for part in body.split("<version>").skip(1) {
                if let Some(v) = part.split("</version>").next() {
                    if v.starts_with(&prefix) || v == game_version {
                        versions.push(v.to_string());
                    }
                }
            }
            versions.reverse();
            Ok(versions)
        }
        "neoforge" => {
            let url = "https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml";
            let res = client.get(url).send().await.map_err(|e| e.to_string())?;
            let body = res.text().await.map_err(|e| e.to_string())?;
            let mut versions = Vec::new();
            
            let mc_parts: Vec<&str> = game_version.split('.').collect();
            if mc_parts.len() >= 2 {
                let major = mc_parts[1]; 
                let minor = if mc_parts.len() >= 3 { mc_parts[2] } else { "0" };
                let prefix = format!("{}.{}.", major, minor);
                
                for part in body.split("<version>").skip(1) {
                    if let Some(v) = part.split("</version>").next() {
                        if v.starts_with(&prefix) {
                            versions.push(v.to_string());
                        }
                    }
                }
            }
            
            versions.reverse();
            Ok(versions)
        }
        _ => Ok(vec![]),
    }
}

#[tauri::command]
pub fn get_cached_manifest() -> Result<serde_json::Value, String> {
    let app_data = std::env::var("APPDATA").map_err(|e| e.to_string())?;
    let cache_path = Path::new(&app_data).join("lflauncher").join("versions").join("version_manifest.json");
    
    if cache_path.exists() {
        let content = fs::read_to_string(cache_path).map_err(|e| e.to_string())?;
        let json: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        Ok(json)
    } else {
        Err("Manifest not found".into())
    }
}