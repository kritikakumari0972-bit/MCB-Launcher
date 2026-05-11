use std::path::Path;

#[tauri::command]
pub fn refresh_memory() {
    #[cfg(target_os = "windows")]
    unsafe {
        use windows::Win32::System::Threading::{GetCurrentProcess, SetProcessWorkingSetSize};
        let _ = SetProcessWorkingSetSize(GetCurrentProcess(), usize::MAX, usize::MAX);
    }
}

pub fn get_available_ram_mb() -> u64 {
    #[cfg(target_os = "windows")]
    unsafe {
        use windows::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};
        let mut mem_info = MEMORYSTATUSEX::default();
        mem_info.dwLength = std::mem::size_of::<MEMORYSTATUSEX>() as u32;
        if GlobalMemoryStatusEx(&mut mem_info).is_ok() {
            return mem_info.ullAvailPhys / 1024 / 1024;
        }
    }
    0
}

#[tauri::command]
pub fn get_memory_info() -> Result<u64, String> {
    Ok(get_available_ram_mb())
}

#[tauri::command]
pub async fn open_folder(path: String, profile_name: Option<String>) -> Result<(), String> {
    let target_path = if path == "auto" {
        let app_data = std::env::var("APPDATA").map_err(|e| e.to_string())?;
        let base = Path::new(&app_data).join("lflauncher").join("instances");
        if let Some(name) = profile_name {
            base.join(name).to_string_lossy().to_string()
        } else {
            base.to_string_lossy().to_string()
        }
    } else {
        path
    };

    if Path::new(&target_path).exists() {
        std::process::Command::new("explorer")
            .arg(&target_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    } else {
        let parent = Path::new(&target_path).parent().ok_or("No parent directory")?;
        if parent.exists() {
            std::process::Command::new("explorer")
                .arg(parent)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn pick_directory() -> Result<Option<String>, String> {
    let res = rfd::AsyncFileDialog::new()
        .pick_folder()
        .await;
    
    Ok(res.map(|f| f.path().to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn pick_file() -> Result<Option<String>, String> {
    let res = rfd::AsyncFileDialog::new()
        .add_filter("Java Executable", &["exe", "jar"])
        .pick_file()
        .await;
    
    Ok(res.map(|f| f.path().to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn check_path_exists(path: String, profile_name: Option<String>) -> Result<bool, String> {
    let target_path = if path == "auto" {
        let app_data = std::env::var("APPDATA").map_err(|e| e.to_string())?;
        let base = Path::new(&app_data).join("lflauncher").join("instances");
        if let Some(name) = profile_name {
            base.join(name).to_string_lossy().to_string()
        } else {
            base.to_string_lossy().to_string()
        }
    } else {
        path
    };

    Ok(Path::new(&target_path).exists())
}

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
pub fn transform_url(original_url: &str) -> String {
    // using BMCLAPI as a high-speed mirror
    original_url
        .replace("launchermeta.mojang.com", "bmclapi2.bangbang93.com")
        .replace("launcher.mojang.com", "bmclapi2.bangbang93.com")
        .replace("resources.download.minecraft.net", "bmclapi2.bangbang93.com/assets")
        .replace("libraries.minecraft.net", "bmclapi2.bangbang93.com/maven")
        .replace("piston-meta.mojang.com", "bmclapi2.bangbang93.com")
        .replace("piston-data.mojang.com", "bmclapi2.bangbang93.com")
        .replace("maven.minecraftforge.net", "bmclapi2.bangbang93.com/maven")
        .replace("maven.neoforged.net", "bmclapi2.bangbang93.com/maven")
        .replace("meta.fabricmc.net", "bmclapi2.bangbang93.com/fabric-meta")
        .replace("meta.quiltmc.org", "bmclapi2.bangbang93.com/quilt-meta")
}
