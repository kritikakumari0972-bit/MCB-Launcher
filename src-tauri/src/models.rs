use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "PascalCase")]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub version: String,
    pub loader: String,
    pub loader_version: String,
    pub ram_mb: i32,
    pub jvm_args: String,
    pub last_played: String,
    pub icon_path: String,
    pub allow_multi_instance: bool,
    pub install_path: String,
    pub resolution_width: Option<i32>,
    pub resolution_height: Option<i32>,
    pub java_executable: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VersionManifest {
    pub latest: Latest,
    pub versions: Vec<VersionInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Latest {
    pub release: String,
    pub snapshot: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionInfo {
    pub id: String,
    pub r#type: String,
    pub url: String,
    pub time: String,
    pub release_time: String,
    pub sha1: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JavaVersion {
    pub component: String,
    pub major_version: u32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MinecraftVersion {
    pub id: String,
    pub libraries: Vec<Library>,
    pub asset_index: AssetIndex,
    pub downloads: Downloads,
    pub main_class: String,
    pub minecraft_arguments: Option<String>,
    pub arguments: Option<Arguments>,
    pub java_version: Option<JavaVersion>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Library {
    pub name: String,
    pub downloads: Option<LibDownloads>,
    pub url: Option<String>,
    pub rules: Option<Vec<Rule>>,
    pub natives: Option<std::collections::HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LibDownloads {
    pub artifact: Option<Artifact>,
    pub classifiers: Option<std::collections::HashMap<String, Artifact>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Artifact {
    pub path: Option<String>,   // Not always present (e.g. client jar in old versions)
    pub sha1: String,
    pub size: u64,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetIndex {
    pub id: String,
    pub sha1: String,
    pub size: u64,
    pub total_size: Option<u64>,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Downloads {
    pub client: Artifact,
    pub server: Option<Artifact>,  // server may be absent in some version JSONs
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Rule {
    pub action: String,
    pub os: Option<OsRule>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OsRule {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Arguments {
    #[serde(default)]
    pub game: Vec<serde_json::Value>,
    #[serde(default)]
    pub jvm: Vec<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AssetObjects {
    pub objects: std::collections::HashMap<String, AssetObject>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LauncherSettings {
    pub disable_gpu: bool,
    pub show_releases: bool,
    pub show_snapshots: bool,
    pub show_old_beta: bool,
    pub show_old_alpha: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AssetObject {
    pub hash: String,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BedrockVersion {
    pub id: String,
    pub uuid: Option<String>,
    pub r#type: String, // release, preview
    pub package_type: String, // uwp, gdk
    pub download_urls: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BedrockInstallation {
    pub name: String,
    pub version: String,
    pub package_type: String, // uwp, gdk
    pub path: String,
    pub package_family: String,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "PascalCase")]
pub struct BedrockProfile {
    pub id: String,
    pub name: String,
    pub version: String,
    pub uuid: Option<String>, // For UWP UpdateID
    pub package_type: String, // uwp, gdk
    pub last_played: Option<String>,
    pub icon_path: String,
    pub revision: Option<i32>,
}
