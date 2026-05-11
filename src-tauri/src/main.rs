// Prevents additional console window on Windows in release, DO NOT REMOVE!!
// Force rebuild to update app icons - 2026-04-04
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

fn main() {
    dotenvy::dotenv().ok();
    #[cfg(target_os = "windows")]
    unsafe {
        use windows::Win32::System::JobObjects::{
            AssignProcessToJobObject, CreateJobObjectW, SetInformationJobObject,
            JobObjectExtendedLimitInformation,
            JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
            JOB_OBJECT_LIMIT_SILENT_BREAKAWAY_OK,
        };
        use windows::Win32::System::Threading::GetCurrentProcess;

        if let Ok(job_handle) = CreateJobObjectW(None, None) {
            let mut info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
            // Cho phép các tiến trình con thoát khỏi job nếu cần và không tự động kill khi launcher đóng
            info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_SILENT_BREAKAWAY_OK;

            let _ = SetInformationJobObject(
                job_handle,
                JobObjectExtendedLimitInformation,
                &info as *const _ as *const _,
                std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
            );
            let _ = AssignProcessToJobObject(job_handle, GetCurrentProcess());
            
            // Ngăn Rust tự động drop (đóng) handle khi kết thúc scope.
            // Điều này đảm bảo Job Object luôn tồn tại và sẽ kill con khi lflauncher.exe kết thúc.
            let _ = job_handle;
        }
    }

    // Tối ưu hóa bộ nhớ cho Production
    let mut args = Vec::new();
    
    // Đọc thiết lập từ file hoặc environment (giả lập bằng cách kiểm tra nếu có flag disable-gpu)
    // Trong thực tế, WebView2 có thể được cấu hình qua biến môi trường trước khi chạy
    let app_data = std::env::var("APPDATA").unwrap_or_default();
    let config_path = std::path::Path::new(&app_data).join("lflauncher").join("config.json");
    
    let mut disable_gpu = true; // Mặc định tắt GPU để tiết kiệm RAM như cũ
    
    if config_path.exists() {
        if let Ok(content) = std::fs::read_to_string(config_path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(val) = json.get("disable_gpu").and_then(|v| v.as_bool()) {
                    disable_gpu = val;
                }
            }
        }
    }

    // Software Renderer (Tiết kiệm ~60-100MB RAM từ GPU Process)
    if disable_gpu {
        args.push("--disable-gpu");
    }
    
    // Gộp tiến trình (Giảm số lượng process trong Task Manager)
    args.push("--single-process");
    
    // Tên hiển thị trong Task Manager cho các tiến trình con
    // Lưu ý: WebView2 đôi khi vẫn dùng tên gốc nếu không được bundle đúng cách
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_name) = exe_path.file_name() {
             std::env::set_var("WEBVIEW2_BROWSER_EXECUTABLE_NAME", exe_name);
        }
    }
    
    // Giới hạn số lượng renderer process
    args.push("--renderer-process-limit=1");
    
    // Đảm bảo WebView2 sử dụng chung User Data Folder để gộp process ổn định
    let data_path = std::path::Path::new(&app_data).join("lflauncher").join("webview_data");
    std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", data_path.to_str().unwrap_or_default());
    
    // Tắt cache lùi/tiến (Tiết kiệm RAM khi chuyển trang)
    args.push("--disable-back-forward-cache");
    
    // Tắt các tính năng không cần thiết để giảm RAM
    args.push("--disable-features=CalculateNativeWinOcclusion,LayoutNG,SubresourceRedirect");
    
    // Tối ưu mạng (Nếu app không dùng proxy phức tạp)
    args.push("--proxy-auto-detect=0");
    args.push("--no-proxy-server");

    std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", args.join(" "));

    lflauncher_lib::run()
}
