pub mod models;
pub mod modules;

use crate::modules::shared_utils::refresh_memory;
use crate::modules::settings::{save_launcher_settings, load_launcher_settings, set_last_selected_profile, set_last_selected_profile_be};
use crate::modules::profiles::{save_profile, get_profiles, save_bedrock_profile, get_bedrock_profiles, delete_installation, delete_bedrock_installation};
use crate::modules::game::{get_all_version_sources, get_cached_manifest, get_loader_versions, get_bedrock_versions, get_installed_bedrock_versions, install_bedrock_version, play_bedrock_version, is_dungeons_installed};
use crate::modules::shared_utils::{open_folder, pick_directory, pick_file, greet, check_path_exists, get_memory_info};
use crate::modules::game::{play_game, check_installation, open_log_folder, get_recent_logs, export_logs};
use crate::modules::game::java::{get_java_versions, get_java_releases, install_java, remove_java, get_installed_java};
use crate::modules::auth::{save_secure_user, get_secure_user, logout_secure_user, sync_user_from_backend, get_all_accounts, remove_account, ely_by_authenticate, fetch_image_as_base64};
use tauri::Manager;
use tauri::Emitter;
use tauri_plugin_deep_link::DeepLinkExt;

#[tauri::command]
fn exit_launcher(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .map(|w| {
                    let _ = w.set_focus();
                });
            // Forward arguments to the webview for deep-link processing
            let _ = app.emit("single-instance-auth", args);
        }))
        .invoke_handler(tauri::generate_handler![
            greet, 
            refresh_memory,
            save_launcher_settings,
            load_launcher_settings,
            get_all_version_sources,
            get_cached_manifest,
            get_loader_versions,
            save_profile,
            get_profiles,
            open_folder,
            pick_directory,
            pick_file,
            set_last_selected_profile,
            set_last_selected_profile_be,
            play_game,
            check_installation,
            open_log_folder,
            get_recent_logs,
            export_logs,
            save_secure_user,
            get_secure_user,
            logout_secure_user,
            sync_user_from_backend,
            get_java_versions,
            get_java_releases,
            install_java,
            remove_java,
            get_installed_java,
            get_bedrock_versions,
            get_installed_bedrock_versions,
            install_bedrock_version,
            play_bedrock_version,
            save_bedrock_profile,
            get_bedrock_profiles,
            is_dungeons_installed,
            get_all_accounts,
            remove_account,
            ely_by_authenticate,
            fetch_image_as_base64,
            check_path_exists,
            delete_installation,
            delete_bedrock_installation,
            get_memory_info,
            exit_launcher
        ])
        .on_window_event(|_window, event| {
            match event {
                tauri::WindowEvent::Focused(false) => {
                    refresh_memory();
                }
                _ => {}
            }
        })
        .setup(|app| {
            #[cfg(all(desktop, not(test)))]
            {
                let handle = app.handle().clone();
                // Ensure the scheme is registered
                let _ = app.deep_link().register("lflauncher");
                
                app.deep_link().on_open_url(move |event| {
                    let urls: Vec<String> = event.urls().into_iter().map(|u| u.to_string()).collect();
                    println!("Received deep link urls: {:?}", urls);
                    let _ = handle.emit("single-instance-auth", urls);
                });
            }

            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(std::time::Duration::from_secs(300));
                loop {
                    interval.tick().await;
                    refresh_memory();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
