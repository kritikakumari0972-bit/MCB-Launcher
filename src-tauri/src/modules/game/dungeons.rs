use tauri::{command};

#[command]
pub async fn is_dungeons_installed() -> Result<bool, String> {
    Ok(false)
}
