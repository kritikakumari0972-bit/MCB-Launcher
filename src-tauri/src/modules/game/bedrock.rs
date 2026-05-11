#![allow(non_snake_case)]
extern crate windows_core;
use std::fs;
use std::path::{Path};
use tauri::{command, AppHandle, Emitter};
use crate::models::{BedrockInstallation};
use std::io::Write;
use windows::{
    Security::Authentication::Web::Core::*,
    Security::Credentials::*,
    Security::Cryptography::{CryptographicBuffer, BinaryStringEncoding},
    Foundation::*,
    Foundation::Collections::*,
    Management::Deployment::*,
};

#[windows_core::interface("07650a66-66ea-489d-aa90-0dabc75f3567")]
pub unsafe trait ITokenBrokerInternalStatics: windows_core::IUnknown {
    fn GetIids(&self, count: *mut u32, iids: *mut *mut windows_core::GUID) -> windows_core::HRESULT;
    fn GetRuntimeClassName(&self, name: *mut *mut core::ffi::c_void) -> windows_core::HRESULT;
    fn GetTrustLevel(&self, trust_level: *mut i32) -> windows_core::HRESULT;
    fn filler_GetTokenSilently(&self) -> windows_core::HRESULT;
    fn filler_GetSecureInputParameters(&self) -> windows_core::HRESULT;
    fn filler_ReportBackgroundCompletion(&self) -> windows_core::HRESULT;
    fn filler_FindAccount(&self) -> windows_core::HRESULT;
    fn filler_FindAccountForApp(&self) -> windows_core::HRESULT;
    fn filler_FindAccountForProvider(&self) -> windows_core::HRESULT;
    fn FindAllAccountsAsync(&self, result: *mut *mut core::ffi::c_void) -> windows_core::HRESULT;
}

#[derive(serde::Serialize, Clone)]
pub struct BedrockProgress {
    pub message: String,
    pub percentage: f32,
    pub status: String,
}

#[command]
pub async fn get_bedrock_versions() -> std::result::Result<serde_json::Value, String> {
    let app_data = std::env::var("APPDATA").map_err(|e| e.to_string())?;
    let cache_path = Path::new(&app_data).join("lflauncher").join("bedrock_versions_cache.json");
    
    // Check if cache exists and is fresh (e.g., less than 1 hour old)
    if cache_path.exists() {
        if let Ok(metadata) = fs::metadata(&cache_path) {
            if let Ok(modified) = metadata.modified() {
                if let Ok(elapsed) = modified.elapsed() {
                    if elapsed.as_secs() < 3600 {
                        if let Ok(content) = fs::read_to_string(&cache_path) {
                            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                                return Ok(json);
                            }
                        }
                    }
                }
            }
        }
    }

    let client = reqwest::Client::new();
    let uwp_url = "https://mrarm.io/r/w10-vdb";
    let gdk_url = "https://raw.githubusercontent.com/MinecraftBedrockArchiver/GdkLinks/refs/heads/master/urls.min.json";

    let (uwp_res, gdk_res) = tokio::join!(
        client.get(uwp_url).send(),
        client.get(gdk_url).send()
    );

    let uwp_json: Option<serde_json::Value> = match uwp_res {
        Ok(res) => res.json().await.ok(),
        Err(_) => None,
    };
    
    let gdk_json: Option<serde_json::Value> = match gdk_res {
        Ok(res) => res.json().await.ok(),
        Err(_) => None,
    };

    let result = serde_json::json!({
        "uwp": uwp_json,
        "gdk": gdk_json
    });

    // Save to cache
    let _ = fs::write(&cache_path, serde_json::to_string(&result).unwrap_or_default());

    Ok(result)
}

#[command]
pub async fn get_installed_bedrock_versions() -> std::result::Result<Vec<BedrockInstallation>, String> {
    let app_data = std::env::var("APPDATA").map_err(|e| e.to_string())?;
    let bedrock_dir = Path::new(&app_data).join("lflauncher").join("bedrock_versions");
    
    if !bedrock_dir.exists() {
        return Ok(vec![]);
    }

    let mut installations = Vec::new();
    if let Ok(entries) = fs::read_dir(bedrock_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let is_gdk = path.join("MicrosoftGame.Config").exists();
                let is_uwp = path.join("AppxManifest.xml").exists();
                
                if is_gdk || is_uwp {
                    let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                    let package_family = if is_uwp {
                        "Microsoft.MinecraftUWP_8wekyb3d8bbwe".to_string()
                    } else {
                        "Microsoft.MinecraftWindows_8wekyb3d8bbwe".to_string()
                    };

                    installations.push(BedrockInstallation {
                        name: name.clone(),
                        version: name,
                        package_type: if is_gdk { "gdk".to_string() } else { "uwp".to_string() },
                        path: path.to_string_lossy().to_string(),
                        package_family,
                    });
                }
            }
        }
    }
    
    Ok(installations)
}

pub async fn get_msa_token(app: &AppHandle) -> std::result::Result<String, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    let app_handle = app.clone();

    std::thread::spawn(move || {
        let _ = app_handle.emit("game-log", "[Auth] Starting STA thread for authentication...");
        
        unsafe {
            use windows::Win32::System::Com::{CoInitializeEx, CoUninitialize, COINIT_APARTMENTTHREADED};
            let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
            
            let result = (|| -> std::result::Result<String, String> {
                let name = windows_core::HSTRING::from("Windows.Internal.Security.Authentication.Web.TokenBrokerInternal");
                let statics: ITokenBrokerInternalStatics = windows::Win32::System::WinRT::RoGetActivationFactory(&name).map_err(|e| {
                    format!("[Auth] RoGetActivationFactory failed: {}", e)
                })?;

                let _ = app_handle.emit("game-log", "[Auth] Finding accounts (STA with pump)...");
                let mut op_ptr = std::ptr::null_mut();
                statics.FindAllAccountsAsync(&mut op_ptr).ok().map_err(|e| {
                    format!("[Auth] FindAllAccountsAsync failed: {}", e)
                })?;
                
                let op: IAsyncOperation<IVectorView<WebAccount>> = std::mem::transmute(op_ptr);
                
                // Manual message pump to avoid STA deadlocks
                while op.Status().map_err(|e| e.to_string())? == AsyncStatus::Started {
                    use windows::Win32::UI::WindowsAndMessaging::{PeekMessageW, TranslateMessage, DispatchMessageW, PM_REMOVE};
                    let mut msg = unsafe { std::mem::zeroed() };
                    unsafe {
                        if PeekMessageW(&mut msg, None, 0, 0, PM_REMOVE).into() {
                            TranslateMessage(&msg);
                            DispatchMessageW(&msg);
                        }
                    }
                    std::thread::sleep(std::time::Duration::from_millis(5));
                }

                let accounts = op.GetResults().map_err(|e| {
                    format!("[Auth] GetResults (FindAllAccounts) failed: {}", e)
                })?;
                
                if accounts.Size().map_err(|e| e.to_string())? == 0 {
                    return Err("No Microsoft account found. Please sign in to the Microsoft Store.".to_string());
                }
                
                let account = accounts.GetAt(0).map_err(|e| e.to_string())?;
                let _ = app_handle.emit("game-log", format!("[Auth] Found account: {}", account.UserName().unwrap_or_default()));

                let _ = app_handle.emit("game-log", "[Auth] Finding provider...");
                let provider_op = WebAuthenticationCoreManager::FindAccountProviderWithAuthorityAsync(
                    &windows_core::HSTRING::from("https://login.microsoft.com"), 
                    &windows_core::HSTRING::from("consumers")
                ).map_err(|e| e.to_string())?;
                
                while provider_op.Status().map_err(|e| e.to_string())? == AsyncStatus::Started {
                    use windows::Win32::UI::WindowsAndMessaging::{PeekMessageW, TranslateMessage, DispatchMessageW, PM_REMOVE};
                    let mut msg = unsafe { std::mem::zeroed() };
                    unsafe {
                        if PeekMessageW(&mut msg, None, 0, 0, PM_REMOVE).into() {
                            TranslateMessage(&msg);
                            DispatchMessageW(&msg);
                        }
                    }
                    std::thread::sleep(std::time::Duration::from_millis(5));
                }
                let provider = provider_op.GetResults().map_err(|e| e.to_string())?;
                
                let request = WebTokenRequest::Create(
                    &provider, 
                    &windows_core::HSTRING::from("service::dcat.update.microsoft.com::MBI_SSL"), 
                    &windows_core::HSTRING::from("{28520974-CE92-4F36-A219-3F255AF7E61E}")
                ).map_err(|e| e.to_string())?;

                let _ = app_handle.emit("game-log", "[Auth] Requesting token silently (STA with pump)...");
                let result_op = WebAuthenticationCoreManager::GetTokenSilentlyWithWebAccountAsync(&request, &account)
                    .map_err(|e| e.to_string())?;
                
                while result_op.Status().map_err(|e| e.to_string())? == AsyncStatus::Started {
                    use windows::Win32::UI::WindowsAndMessaging::{PeekMessageW, TranslateMessage, DispatchMessageW, PM_REMOVE};
                    let mut msg = unsafe { std::mem::zeroed() };
                    unsafe {
                        if PeekMessageW(&mut msg, None, 0, 0, PM_REMOVE).into() {
                            TranslateMessage(&msg);
                            DispatchMessageW(&msg);
                        }
                    }
                    std::thread::sleep(std::time::Duration::from_millis(5));
                }
                let result = result_op.GetResults().map_err(|e| e.to_string())?;

                if result.ResponseStatus().map_err(|e| e.to_string())? != WebTokenRequestStatus::Success {
                    return Err(format!("[Auth] GetTokenSilently failed: {:?}", result.ResponseStatus()));
                }

                let token = result.ResponseData().map_err(|e| e.to_string())?.GetAt(0).map_err(|e| e.to_string())?.Token().map_err(|e| e.to_string())?;
                
                let binary = CryptographicBuffer::ConvertStringToBinary(&token, BinaryStringEncoding::Utf16LE).map_err(|e| e.to_string())?;
                let token_base64 = CryptographicBuffer::EncodeToBase64String(&binary).map_err(|e| e.to_string())?;
                Ok(token_base64.to_string())
            })();

            let _ = tx.send(result);
            CoUninitialize();
        }
    });

    rx.await.map_err(|e| e.to_string())?
}

async fn get_uwp_url(app: &AppHandle, update_id: &str, revision: i32, token: &str) -> std::result::Result<String, String> {
    let client = reqwest::Client::new();
    
    let now = chrono::Utc::now();
    let created = now.to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    let expires = (now + chrono::Duration::minutes(5)).to_rfc3339_opts(chrono::SecondsFormat::Secs, true);

    let _ = app.emit("game-log", format!("[WU] Requesting UpdateID: {}, Revision: {}", update_id, revision));

    let soap_request = format!(
        r#"<s:Envelope xmlns:a="http://www.w3.org/2005/08/addressing" xmlns:s="http://www.w3.org/2003/05/soap-envelope">
    <s:Header>
        <a:Action s:mustUnderstand="1">http://www.microsoft.com/SoftwareDistribution/Server/ClientWebService/GetExtendedUpdateInfo2</a:Action>
        <a:MessageID>urn:uuid:5754a03d-d8d5-489f-b24d-efc31b3fd32d</a:MessageID>
        <a:To s:mustUnderstand="1">https://fe3.delivery.mp.microsoft.com/ClientWebService/client.asmx/secured</a:To>
        <o:Security s:mustUnderstand="1" xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
            <Timestamp xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
                <Created>{}</Created>
                <Expires>{}</Expires>
            </Timestamp>
            <WindowsUpdateTicketsToken wsu:id="ClientMSA" xmlns="http://schemas.microsoft.com/msus/2014/10/WindowsUpdateAuthorization" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
                <TicketType Name="MSA" Version="1.0" Policy="MBI_SSL">
                    <User>{}</User>
                </TicketType>
                <TicketType Name="AAD" Version="1.0" Policy="MBI_SSL" />
            </WindowsUpdateTicketsToken>
        </o:Security>
    </s:Header>
    <s:Body>
        <GetExtendedUpdateInfo2 xmlns="http://www.microsoft.com/SoftwareDistribution/Server/ClientWebService">
            <updateIDs>
                <UpdateIdentity>
                    <UpdateID>{}</UpdateID>
                    <RevisionNumber>{}</RevisionNumber>
                </UpdateIdentity>
            </updateIDs>
            <infoTypes>
                <XmlUpdateFragmentType>FileUrl</XmlUpdateFragmentType>
            </infoTypes>
            <deviceAttributes>E:BranchReadinessLevel=CBB&amp;DataVer_RS5=1942&amp;FlightRing=Retail&amp;InstallLanguage=en-US&amp;OSUILocale=en-US&amp;InstallationType=Client&amp;OSSkuId=48&amp;App=WU&amp;OSArchitecture=AMD64&amp;WuClientVer=10.0.19041.1&amp;OSVersion=10.0.19041.1&amp;DeviceFamily=Windows.Desktop</deviceAttributes>
        </GetExtendedUpdateInfo2>
    </s:Body>
</s:Envelope>"#,
        created, expires, token, update_id, if revision < 1 { 1 } else { revision }
    );

    let _ = app.emit("game-log", format!("[WU] Full SOAP request:\n{}", soap_request));

    let _ = app.emit("game-log", "[WU] Sending SOAP request to Microsoft...");
    let response = client.post("https://fe3.delivery.mp.microsoft.com/ClientWebService/client.asmx/secured")
        .header("Content-Type", "application/soap+xml; charset=utf-8")
        .header("User-Agent", "Windows-Update-Agent/10.0.19041.1 Client-Protocol/2.0")
        .body(soap_request)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;

    let _ = app.emit("game-log", format!("[WU] Response from Microsoft:\n{}", response));
    let mut urls = Vec::new();
    let mut search_idx = 0;
    while let Some(start) = response[search_idx..].find("<Url>") {
        let url_start = search_idx + start + 5;
        if let Some(end) = response[url_start..].find("</Url>") {
            let mut url = response[url_start..url_start + end].to_string();
            url = url.replace("&amp;", "&");
            urls.push(url);
            search_idx = url_start + end;
        } else {
            break;
        }
    }

    let _ = app.emit("game-log", format!("[WU] Found {} URLs in response.", urls.len()));
    for u in &urls {
        let _ = app.emit("game-log", format!("[WU] Available URL: {}", u));
    }

    let best_url = urls.iter()
        .find(|u| u.starts_with("http://tlu.dl.delivery.mp.microsoft.com/"))
        .cloned()
        .or_else(|| urls.first().cloned());

    if let Some(url) = best_url {
        let _ = app.emit("game-log", format!("[WU] Selected download URL: {}", url));
        Ok(url)
    } else {
        let _ = app.emit("game-log", "[WU] Failed to find a valid delivery URL in SOAP response.");
        Err("Failed to find download URL in SOAP response".to_string())
    }
}

fn emit_bedrock_progress(app: &AppHandle, msg: &str, p: f32, status: &str) {
    let _ = app.emit("launch-status", BedrockProgress {
        message: msg.to_string(),
        percentage: p,
        status: status.to_string(),
    });
    let _ = app.emit("game-log", format!("[Progress] {}", msg));
}

#[command]
pub async fn install_bedrock_version(
    app: AppHandle,
    id: String,
    folder_name: Option<String>,
    url: Option<String>,
    package_type: String,
    revision: Option<i32>
) -> std::result::Result<(), String> {
    let mut download_url = url.unwrap_or_default();
    
    if download_url.is_empty() && (package_type == "uwp" || package_type == "gdk") {
        emit_bedrock_progress(&app, "Authenticating with Microsoft Store...", 0.0, "downloading");
        let token = get_msa_token(&app).await?;
        emit_bedrock_progress(&app, "Resolving download URL...", 5.0, "downloading");
        download_url = get_uwp_url(&app, &id, revision.unwrap_or(1), &token).await?;
    }
    
    let app_data = std::env::var("APPDATA").map_err(|e| e.to_string())?;
    let folder = folder_name.unwrap_or_else(|| id.clone());
    let bedrock_dir = Path::new(&app_data).join("lflauncher").join("bedrock_versions").join(&folder);
    
    // Check if already exists and is valid
    if bedrock_dir.exists() {
        let has_manifest = bedrock_dir.join("AppxManifest.xml").exists() || bedrock_dir.join("MicrosoftGame.Config").exists();
        if has_manifest {
            emit_bedrock_progress(&app, "Version already present, skipping download...", 80.0, "extracting");
        } else {
            // Directory exists but is empty or invalid, clean it up
            let _ = fs::remove_dir_all(&bedrock_dir);
        }
    }

    if !bedrock_dir.exists() {
        let temp_dir = Path::new(&app_data).join("lflauncher").join("temp");
        let _ = fs::create_dir_all(&temp_dir);
        
        let file_ext = if package_type == "uwp" { ".appx" } else { ".msixvc" };
        let temp_path = temp_dir.join(format!("{}{}", id, file_ext));

        emit_bedrock_progress(&app, &format!("Downloading {}...", id), 0.0, "downloading");

        // Download
        let client = reqwest::Client::new();
        let response = client.get(&download_url)
            .header("User-Agent", "Windows-Update-Agent/10.0.19041.1 Client-Protocol/2.0")
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !response.status().is_success() {
            return Err(format!("Download failed with status: {}", response.status()));
        }

        let total_size = response.content_length().unwrap_or(0);
        let mut downloaded: u64 = 0;
        
        {
            let mut file = std::fs::File::create(&temp_path).map_err(|e| e.to_string())?;
            use futures_util::StreamExt;
            let mut stream = response.bytes_stream();

            while let Some(item) = stream.next().await {
                let chunk = item.map_err(|e| e.to_string())?;
                file.write_all(&chunk).map_err(|e| e.to_string())?;
                downloaded += chunk.len() as u64;
                
                if total_size > 0 {
                    let p = (downloaded as f32 / total_size as f32) * 80.0;
                    emit_bedrock_progress(&app, &format!("Downloading {}...", id), p, "downloading");
                }
            }
            file.flush().map_err(|e| e.to_string())?;
        }

        emit_bedrock_progress(&app, "Extracting...", 80.0, "extracting");

        if package_type == "uwp" {
            // Extract UWP (ZIP)
            let file = fs::File::open(&temp_path).map_err(|e| e.to_string())?;
            let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
            let _ = fs::create_dir_all(&bedrock_dir);
            
            let total_files = archive.len();
            for i in 0..total_files {
                {
                    let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
                    let outpath = bedrock_dir.join(file.name());
                    if file.name().ends_with('/') {
                        let _ = fs::create_dir_all(&outpath);
                    } else {
                        if let Some(p) = outpath.parent() {
                            let _ = fs::create_dir_all(&p);
                        }
                        let mut outfile = fs::File::create(&outpath).map_err(|e| e.to_string())?;
                        std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
                    }
                }
                emit_bedrock_progress(&app, "Extracting...", 80.0 + (i as f32 / total_files as f32) * 20.0, "extracting");
            }
            let _ = fs::remove_file(bedrock_dir.join("AppxSignature.p7x"));
        } else {
            // GDK
            let _ = fs::create_dir_all(&bedrock_dir);
            let msixvc_file = bedrock_dir.join(format!("{}.msixvc", id));
            std::io::copy(&mut fs::File::open(&temp_path).map_err(|e| e.to_string())?, &mut fs::File::create(&msixvc_file).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
            
            // Register GDK
            emit_bedrock_progress(&app, "Registering GDK with Windows...", 90.0, "registering");
            let ps_cmd = format!("Add-AppxPackage -Path '{}'", msixvc_file.to_string_lossy());
            let _ = std::process::Command::new("powershell")
                .args(["-NoProfile", "-Command", &ps_cmd])
                .output();
        }

        let _ = fs::remove_file(&temp_path);
    }
    
    // Final Step: Registration (for UWP)
    if package_type == "uwp" {
        emit_bedrock_progress(&app, "Registering with Windows...", 95.0, "registering");
        let _ = app.emit("game-log", "Starting silent registration via PackageManager...");
        
        let manifest_path = bedrock_dir.join("AppxManifest.xml");
        if manifest_path.exists() {
            use windows_core::HSTRING;
            let package_manager = PackageManager::new().map_err(|e| e.to_string())?;
            let manifest_uri = Uri::CreateUri(&HSTRING::from(manifest_path.to_string_lossy().to_string())).map_err(|e| e.to_string())?;
            
            let deployment_operation = package_manager.RegisterPackageAsync::<&Uri, Option<&IIterable<Uri>>>(
                &manifest_uri,
                None,
                DeploymentOptions::DevelopmentMode
            ).map_err(|e| e.to_string())?;
            
            // Wait for registration
            while deployment_operation.Status().map_err(|e| e.to_string())? == AsyncStatus::Started {
                std::thread::sleep(std::time::Duration::from_millis(50));
            }
 
            if let Err(e) = deployment_operation.GetResults() {
                let err = e.to_string();
                if !err.contains("0x80073CF3") && !err.contains("0x80073CF6") && !err.contains("already exists") {
                    return Err(format!("Registration failed: {}", err));
                }
                let _ = app.emit("game-log", "Already registered or version conflict. Continuing...");
            }
        }
    }

    // Auto-launch after installation
    emit_bedrock_progress(&app, "Finalizing and launching...", 98.0, "launching");
    let package_family = if package_type == "uwp" {
        "Microsoft.MinecraftUWP_8wekyb3d8bbwe"
    } else {
        "Microsoft.MinecraftWindows_8wekyb3d8bbwe"
    };
    
    tokio::time::sleep(std::time::Duration::from_millis(1000)).await;

    let launch_cmd = format!("Start-Process \"explorer.exe\" \"shell:AppsFolder\\{}!App\"", package_family);
    let _ = app.emit("game-log", format!("Auto-launching: {}", launch_cmd));
    let _ = std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", &launch_cmd])
        .spawn();

    emit_bedrock_progress(&app, "Installation complete & Game launched", 100.0, "success");
    let _ = app.emit("game-log", "Bedrock installation finished successfully.");
    Ok(())
}

#[command]
pub async fn play_bedrock_version(app: AppHandle, path: String, package_family: String) -> std::result::Result<(), String> {
    let dir_path = Path::new(&path);
    let manifest_path = dir_path.join("AppxManifest.xml");
    
    // Check if it's GDK (we saved it as a .msixvc file in the directory)
    let gdk_file = fs::read_dir(dir_path)
        .ok()
        .and_then(|mut d| d.find(|e| e.as_ref().map(|x| x.path().extension().map_or(false, |ext| ext == "msixvc")).unwrap_or(false)))
        .map(|e| e.unwrap().path());

    emit_bedrock_progress(&app, "Launching...", 0.0, "launching");

    if let Some(msixvc_path) = gdk_file {
        // For GDK, we stage the package directly using PowerShell
        emit_bedrock_progress(&app, "Staging GDK package...", 20.0, "launching");
        let ps_cmd = format!(
            "Add-AppxPackage -Path '{}'",
            msixvc_path.to_string_lossy()
        );
        let output = std::process::Command::new("powershell")
            .args(["-NoProfile", "-Command", &ps_cmd])
            .output()
            .map_err(|e| e.to_string())?;
            
        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr).to_string();
            if !err.contains("already installed") && !err.contains("already exists") {
                 return Err(err);
            }
        }
    } else {
        // UWP Launch Logic
        if !manifest_path.exists() {
            return Err("AppxManifest.xml not found in the version folder.".to_string());
        }

        // Silent Native Registration (Source chính logic)
        emit_bedrock_progress(&app, "Registering with Windows...", 40.0, "launching");
        use windows_core::HSTRING;
        let package_manager = PackageManager::new().map_err(|e| e.to_string())?;
        let manifest_uri = Uri::CreateUri(&HSTRING::from(manifest_path.to_string_lossy().to_string())).map_err(|e| e.to_string())?;
        
        // We use None for dependencies and specify the type explicitly to satisfy the compiler
        let deployment_operation = package_manager.RegisterPackageAsync::<&Uri, Option<&IIterable<Uri>>>(
            &manifest_uri,
            None,
            DeploymentOptions::DevelopmentMode
        ).map_err(|e| e.to_string())?;

        // Wait for registration to complete
        while deployment_operation.Status().map_err(|e| e.to_string())? == AsyncStatus::Started {
            std::thread::sleep(std::time::Duration::from_millis(50));
        }

        if let Err(e) = deployment_operation.GetResults() {
            let err = e.to_string();
            if !err.contains("0x80073CF3") && !err.contains("0x80073CF6") && !err.contains("already exists") {
                return Err(format!("Registration failed: {}", err));
            }
            let _ = app.emit("game-log", "Already registered. Continuing to launch...");
        }
    }

    // Delay to allow Windows Shell to index the new ID
    emit_bedrock_progress(&app, "Preparing environment...", 80.0, "launching");
    let _ = app.emit("game-log", "Registration complete. Waiting for Windows Shell to update...");
    tokio::time::sleep(std::time::Duration::from_millis(1000)).await;

    // Launch using shell:AppsFolder (PowerShell Start-Process is more reliable for UWP/GDK)
    emit_bedrock_progress(&app, "Starting process...", 95.0, "launching");
    let launch_cmd = format!("Start-Process \"explorer.exe\" \"shell:AppsFolder\\{}!App\"", package_family);
    let _ = app.emit("game-log", format!("Launching via PowerShell: {}", launch_cmd));
    let _ = std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", &launch_cmd])
        .spawn();

    emit_bedrock_progress(&app, "Game launched", 100.0, "success");
    Ok(())
}
