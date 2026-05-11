use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use sha2::{Sha256, Digest};
use tauri::Manager;

const ELY_BY_AUTH_URL: &str = "https://authserver.ely.by/auth/authenticate";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserData {
    pub name: String,
    #[serde(rename = "type")]
    pub account_type: String,
    pub avatar: String,
    pub token: Option<String>,
    pub uuid: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SecureStore {
    data: UserData,
    checksum: String,
}

const SALT: &str = "LF_LAUNCHER_SECRET_SALT_2026_PRO"; // Secret salt for integrity check

fn get_storage_path(app_handle: &tauri::AppHandle) -> PathBuf {
    let mut path = app_handle.path().app_data_dir().expect("Failed to get app data dir");
    if !path.exists() {
        let _ = fs::create_dir_all(&path);
    }
    path.push("auth.db");
    path
}

fn get_accounts_storage_path(app_handle: &tauri::AppHandle) -> PathBuf {
    let mut path = app_handle.path().app_data_dir().expect("Failed to get app data dir");
    if !path.exists() {
        let _ = fs::create_dir_all(&path);
    }
    path.push("accounts.db");
    path
}

fn calculate_checksum(data: &UserData) -> String {
    let mut hasher = Sha256::new();
    let json = serde_json::to_string(data).unwrap();
    hasher.update(json.as_bytes());
    hasher.update(SALT.as_bytes());
    hex::encode(hasher.finalize())
}

#[tauri::command]
pub async fn save_secure_user(app_handle: tauri::AppHandle, user_data: UserData) -> Result<(), String> {
    let checksum = calculate_checksum(&user_data);
    let store = SecureStore {
        data: user_data.clone(),
        checksum,
    };
    
    let path = get_storage_path(&app_handle);
    let json = serde_json::to_string(&store).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    
    // Also save to account list
    let _ = add_account_to_list(app_handle, user_data).await;
    
    println!(" [RustAuth] Secure user data saved and added to account list");
    Ok(())
}

#[tauri::command]
pub async fn get_all_accounts(app_handle: tauri::AppHandle) -> Result<Vec<UserData>, String> {
    let path = get_accounts_storage_path(&app_handle);
    if !path.exists() {
        return Ok(vec![]);
    }
    
    let json = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let accounts: Vec<UserData> = serde_json::from_str(&json).unwrap_or_else(|_| vec![]);
    Ok(accounts)
}

#[tauri::command]
pub async fn add_account_to_list(app_handle: tauri::AppHandle, user_data: UserData) -> Result<(), String> {
    let mut accounts = get_all_accounts(app_handle.clone()).await?;
    
    // Check if account already exists (by name and type)
    if let Some(existing) = accounts.iter_mut().find(|a| a.name == user_data.name && a.account_type == user_data.account_type) {
        *existing = user_data;
    } else {
        accounts.push(user_data);
    }
    
    let path = get_accounts_storage_path(&app_handle);
    let json = serde_json::to_string(&accounts).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn remove_account(app_handle: tauri::AppHandle, name: String, account_type: String) -> Result<(), String> {
    let mut accounts = get_all_accounts(app_handle.clone()).await?;
    accounts.retain(|a| !(a.name == name && a.account_type == account_type));
    
    let path = get_accounts_storage_path(&app_handle);
    let json = serde_json::to_string(&accounts).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_secure_user(app_handle: tauri::AppHandle) -> Result<Option<UserData>, String> {
    let path = get_storage_path(&app_handle);
    if !path.exists() {
        return Ok(None);
    }
    
    let json = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let store: SecureStore = match serde_json::from_str(&json) {
        Ok(s) => s,
        Err(_) => return Err("Corrupted data".to_string()),
    };
    
    // Verify Integrity
    let expected_checksum = calculate_checksum(&store.data);
    if store.checksum != expected_checksum {
        println!(" [RustAuth] ERROR: INTEGRITY CHECK FAILED!");
        return Err("Integrity check failed! Data was modified outside the launcher.".to_string());
    }
    
    println!(" [RustAuth] Integrity check passed for user: {}", store.data.name);
    Ok(Some(store.data))
}

#[tauri::command]
pub async fn logout_secure_user(app_handle: tauri::AppHandle) -> Result<(), String> {
    let path = get_storage_path(&app_handle);
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    println!(" [RustAuth] User logged out, secure data cleared");
    Ok(())
}

#[tauri::command]
pub async fn sync_user_from_backend(app_handle: tauri::AppHandle) -> Result<UserData, String> {
    let current_user = get_secure_user(app_handle.clone()).await?.ok_or("No user logged in")?;
    let token = current_user.token.clone().ok_or("No access token found")?;

    if current_user.account_type == "Ely.by" {
        let client = reqwest::Client::new();
        let response = client
            .get("https://account.ely.by/api/account/v1/info")
            .bearer_auth(&token)
            .send()
            .await
            .map_err(|e| format!("Network error: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Ely.by API error: {}", response.status()));
        }

        let info: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
        let username = info["username"].as_str().unwrap_or(&current_user.name).to_string();
        let uuid = info["uuid"].as_str().map(|s| s.to_string());
        let avatar = format!("https://skinsystem.ely.by/skins/{}.png", username);

        let updated_user = UserData {
            name: username,
            account_type: "Ely.by".to_string(),
            avatar,
            token: Some(token),
            uuid,
        };

        save_secure_user(app_handle, updated_user.clone()).await?;
        println!(" [RustAuth] Ely.by profile synced for: {}", updated_user.name);
        return Ok(updated_user);
    }

    Err("Unsupported account type for sync".to_string())
}

/// Authenticate with Ely.by using email + password via Yggdrasil protocol.
/// No browser redirect or deep link callback needed.
#[tauri::command]
pub async fn ely_by_authenticate(
    app_handle: tauri::AppHandle,
    email: String,
    password: String,
) -> Result<UserData, String> {
    println!(" [ElyBy] Authenticating via Yggdrasil...");
    let client = reqwest::Client::new();

    let body = serde_json::json!({
        "username": email,
        "password": password,
        "clientToken": uuid::Uuid::new_v4().to_string(),
        "requestUser": true
    });

    let response = client
        .post(ELY_BY_AUTH_URL)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let err_body: serde_json::Value = response.json().await.unwrap_or_default();
        let message = err_body["errorMessage"]
            .as_str()
            .unwrap_or("Invalid email or password");
        return Err(message.to_string());
    }

    let data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    let access_token = data["accessToken"]
        .as_str()
        .ok_or("No accessToken in response")?
        .to_string();

    let profile = &data["selectedProfile"];
    let username = profile["name"]
        .as_str()
        .ok_or("No profile name in response")?
        .to_string();

    // Convert Minecraft UUID format (no dashes) to standard UUID format
    let raw_uuid = profile["id"].as_str().unwrap_or("");
    let uuid = if raw_uuid.len() == 32 {
        format!(
            "{}-{}-{}-{}-{}",
            &raw_uuid[0..8],
            &raw_uuid[8..12],
            &raw_uuid[12..16],
            &raw_uuid[16..20],
            &raw_uuid[20..32]
        )
    } else {
        raw_uuid.to_string()
    };

    let avatar = format!("https://skinsystem.ely.by/skins/{}.png", username);

    let user_data = UserData {
        name: username.clone(),
        account_type: "Ely.by".to_string(),
        avatar,
        token: Some(access_token),
        uuid: Some(uuid),
    };

    save_secure_user(app_handle, user_data.clone()).await?;
    println!(" [ElyBy] Login successful for: {}", username);
    Ok(user_data)
}

/// Fetch an image from a URL using native Rust (bypasses browser CORS).
/// Returns the image as a base64-encoded data URL.
#[tauri::command]
pub async fn fetch_image_as_base64(url: String) -> Result<String, String> {
    println!(" [SkinFetch] Downloading skin from: {}", url);
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 LFLauncher/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(&url).send().await.map_err(|e| format!("Request error: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    let b64 = {
        const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let mut out = String::new();
        let bytes_slice = bytes.as_ref();
        let mut i = 0;
        while i < bytes_slice.len() {
            let b0 = bytes_slice[i] as u32;
            let b1 = if i + 1 < bytes_slice.len() { bytes_slice[i + 1] as u32 } else { 0 };
            let b2 = if i + 2 < bytes_slice.len() { bytes_slice[i + 2] as u32 } else { 0 };
            let c0 = (b0 >> 2) as usize;
            let c1 = (((b0 & 3) << 4) | (b1 >> 4)) as usize;
            let c2 = (((b1 & 15) << 2) | (b2 >> 6)) as usize;
            let c3 = (b2 & 63) as usize;
            out.push(CHARS[c0] as char);
            out.push(CHARS[c1] as char);
            if i + 1 < bytes_slice.len() { out.push(CHARS[c2] as char); } else { out.push('='); }
            if i + 2 < bytes_slice.len() { out.push(CHARS[c3] as char); } else { out.push('='); }
            i += 3;
        }
        out
    };

    println!(" [SkinFetch] Skin fetched, size: {} bytes", bytes.len());
    Ok(format!("data:image/png;base64,{}", b64))
}
