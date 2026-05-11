use std::path::{Path, PathBuf};
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use std::fs;
use std::io::{Write};

#[derive(Serialize, Clone)]
pub struct LaunchProgress {
    pub message: String,
    pub percentage: f32,
    pub status: String, // "downloading", "extracting", "verifying", "starting", "error", "success", "closed"
}

pub struct MinecraftLauncher {
    pub app: AppHandle,
    pub client: reqwest::Client,
    pub base_path: PathBuf,      // Instance specific (contains versions)
    pub assets_path: PathBuf,    // Shared across all instances
    pub libraries_path: PathBuf, // Shared across all instances
    pub game_dir: PathBuf,       // Working directory (usually same as base_path)
}

impl MinecraftLauncher {
    pub fn new(app: AppHandle, base_path: PathBuf, assets_path: PathBuf, libraries_path: PathBuf, game_dir: PathBuf) -> Self {
        Self {
            app,
            client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(60))
                .connect_timeout(std::time::Duration::from_secs(15))
                .tcp_keepalive(Some(std::time::Duration::from_secs(60)))
                .no_gzip() // JAR files are already compressed, avoid decompression issues
                .no_brotli()
                .no_deflate()
                .build()
                .unwrap_or_default(),
            base_path,
            assets_path,
            libraries_path,
            game_dir,
        }
    }

    pub fn emit_progress(&self, msg: &str, percent: f32, status: &str) {
        let _ = self.app.emit("launch-status", LaunchProgress {
            message: msg.to_string(),
            percentage: percent,
            status: status.to_string(),
        });
        self.emit_log(&format!("[Progress] {} ({}%)", msg, percent));
    }

    pub fn emit_log(&self, msg: &str) {
        let _ = self.app.emit("game-log", msg);
    }

    pub fn save_error_log(&self, version: &str, error: &str) {
        let Ok(app_data) = std::env::var("APPDATA") else { return };
        let logs_dir = Path::new(&app_data).join("lflauncher").join("logs");
        let _ = fs::create_dir_all(&logs_dir);

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default();
        let filename = format!("crash_{}.log", now.as_secs());
        let log_path = logs_dir.join(&filename);

        let content = format!(
            "=== LFLauncher Crash Log ===\nTimestamp: {}\nVersion: {}\n\nError:\n{}\n",
            now.as_secs(), version, error
        );
        if let Ok(mut file) = fs::File::create(&log_path) {
            let _ = file.write_all(content.as_bytes());
        }
    }
}
