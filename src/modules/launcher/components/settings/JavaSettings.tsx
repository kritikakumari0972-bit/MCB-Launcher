import React, { useState, useEffect } from "react";
import { RefreshCw, Download, Trash2, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";



interface JavaMajorVersion {
  version: string;
  releaseTime: string;
  recommended: boolean;
}

interface JavaRuntime {
  version: string;
  name: string;
  releaseTime: string;
  packageType: string;
  url: string;
  isInstalled: boolean;
  path: string | null;
  provider?: string;
  majorVersion?: string;
  folderId?: string;
}

const PROVIDERS = [
  { id: "local", name: "Installed", short: "Ins" },
  { id: "net.minecraft.java", name: "Mojang", short: "M" },
  { id: "net.adoptium.java", name: "Adoptium", short: "Ad" },
  { id: "com.azul.java", name: "Azul Zulu", short: "Az" },
  { id: "com.ibm.java", name: "IBM Semeru Open", short: "OJ9" },
];

interface JavaSettingsProps {
  autoDetectJava: boolean;
  setAutoDetectJava: (checked: boolean) => void;
  autoDownloadJava: boolean;
  setAutoDownloadJava: (checked: boolean) => void;
}

const JavaSettings: React.FC<JavaSettingsProps> = () => {
  const [activeSubTab] = useState("Installations");


  const [activeProvider, setActiveProvider] = useState(PROVIDERS[0].id);
  const [majorVersions, setMajorVersions] = useState<JavaMajorVersion[]>([]);
  const [activeMajorVersion, setActiveMajorVersion] = useState<string | null>(null);

  const [runtimes, setRuntimes] = useState<JavaRuntime[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRuntime, setSelectedRuntime] = useState<JavaRuntime | null>(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ progress: number; status: string } | null>(null);

  // Fetch Major Versions when Provider changes
  useEffect(() => {
    if (activeSubTab !== "Installations") return;

    let isMounted = true;
    const fetchMajors = async () => {
      setLoading(true);
      setMajorVersions([]);
      setRuntimes([]);
      setSelectedRuntime(null);
      setActiveMajorVersion(null);

      try {
        if (activeProvider === "local") {
          if (isMounted) {
            setMajorVersions([{ version: "all", releaseTime: "", recommended: true }]);
            setActiveMajorVersion("all");
          }
          return;
        }

        const res = await invoke<JavaMajorVersion[]>("get_java_versions", { provider: activeProvider });
        if (isMounted) {
          setMajorVersions(res);
          if (res.length > 0) {
            setActiveMajorVersion(res[0].version);
          } else {
            setLoading(false);
          }
        }
      } catch (e) {
        console.error("Failed to fetch java major versions:", e);
        if (isMounted) setLoading(false);
      }
    };
    fetchMajors();

    return () => { isMounted = false; };
  }, [activeSubTab, activeProvider]);

  const fetchRuntimes = async () => {
    if (!activeMajorVersion) return;
    setLoading(true);
    setSelectedRuntime(null);
    try {
      if (activeProvider === "local") {
        const res = await invoke<JavaRuntime[]>("get_installed_java");
        setRuntimes(res);
      } else {
        const res = await invoke<JavaRuntime[]>("get_java_releases", { provider: activeProvider, majorVersion: activeMajorVersion });
        setRuntimes(res);
      }
    } catch (e) {
      console.error("Failed to fetch java runtimes:", e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Runtimes when Major Version changes
  useEffect(() => {
    fetchRuntimes();
  }, [activeMajorVersion]);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    const setupListener = async () => {
      unlisten = await listen<{ progress: number; status: string }>("java-download-progress", (event) => {
        setDownloadProgress(event.payload);
      });
    };
    setupListener();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleDownload = async () => {
    if (!selectedRuntime || !activeMajorVersion) return;
    try {
      setIsDownloading(true);
      setDownloadProgress({ progress: 0, status: "Starting..." });

      // Compute folder_id logic (must match backend)
      const folderId = `${selectedRuntime.name}_${selectedRuntime.version.replace(/ /g, "_").replace(/\./g, "_")}`;

      await invoke("install_java", {
        provider: activeProvider,
        majorVersion: activeMajorVersion,
        folderId,
        downloadUrl: selectedRuntime.url
      });
      await fetchRuntimes();
    } catch (e) {
      console.error("Download failed:", e);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleRemove = async () => {
    if (!selectedRuntime) return;
    try {
      setLoading(true);
      const provider = selectedRuntime.provider || activeProvider;
      const majorVersion = selectedRuntime.majorVersion || activeMajorVersion;
      const folderId = selectedRuntime.folderId || `${selectedRuntime.name}_${selectedRuntime.version.replace(/ /g, "_").replace(/\./g, "_")}`;
      
      if (!provider || !majorVersion || provider === "local") {
          console.error("Cannot remove Java: missing metadata or invalid provider");
          return;
      }

      await invoke("remove_java", { provider, majorVersion, folderId });
      await fetchRuntimes();
    } catch (e) {
      console.error("Remove failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear().toString().slice(-2)}`;
  };

  return (
    <div className="max-w-[800px] flex flex-col gap-8 pb-20 text-[13px]">
      <div className="flex flex-col gap-4 relative">

          {/* Provider Tabs (Horizontal) */}
          <div className="flex items-center gap-2 border-b border-[#444] pb-2 overflow-x-auto custom-scrollbar">
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => setActiveProvider(p.id)}
                disabled={isDownloading}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-[1px] cursor-pointer transition-colors font-bold disabled:opacity-50 border-b-2 -mb-[9px] ${activeProvider === p.id ? 'text-white border-minecraft-green' : 'text-[#999] border-transparent hover:text-white hover:border-[#555]'}`}
              >
                <div className="w-4 h-4 shrink-0 flex items-center justify-center bg-black/20 rounded-[1px] text-[8px]">
                  {p.short}
                </div>
                {p.name}
              </button>
            ))}
          </div>

          <div className="flex gap-4 min-h-[400px]">
            {activeProvider !== "local" && (
              <div className="w-[140px] shrink-0 flex flex-col gap-1 pr-4 border-r border-[#444]">
                <div className="text-[11px] font-extrabold text-[#999] uppercase tracking-tighter mb-2 pl-2">Major Version</div>
                {majorVersions.map(mv => (
                  <button
                    key={mv.version}
                    onClick={() => setActiveMajorVersion(mv.version)}
                    disabled={isDownloading}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-[1px] transition-colors text-left font-bold disabled:opacity-50 ${activeMajorVersion === mv.version ? 'bg-minecraft-green text-white' : 'text-[#aaa] hover:bg-white/5 hover:text-white'}`}
                  >
                    <span className="capitalize">Java {mv.version.replace('java', '')}</span>
                  </button>
                ))}
                {majorVersions.length === 0 && !loading && (
                  <div className="text-[#666] italic text-[12px] pl-2">No versions found</div>
                )}
              </div>
            )}

            {/* Right Area: Table */}
            <div className="flex-1 flex flex-col gap-4 relative">
              {isDownloading && downloadProgress && (
                <div className="absolute inset-0 z-10 bg-[#111]/80  flex flex-col items-center justify-center rounded-[1px] border border-[#555]">
                  <Loader2 className="animate-spin mb-4 text-minecraft-green" size={32} />
                  <div className="font-bold text-[14px]">{downloadProgress.status}</div>
                  <div className="w-[300px] h-1.5 bg-[#222] mt-4 rounded-full overflow-hidden">
                    <div className="h-full bg-minecraft-green transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, downloadProgress.progress))}%` }} />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDownload}
                    disabled={!selectedRuntime || isDownloading}
                    className="flex items-center gap-2 bg-[#2b2b2b] border border-[#555] hover:bg-[#333] disabled:opacity-50 transition-colors rounded-[1px] px-4 py-1.5 text-[12px] font-bold">
                    <Download size={14} /> Download
                  </button>
                  <button
                    onClick={handleRemove}
                    disabled={!selectedRuntime || isDownloading || (activeProvider === "local" && !selectedRuntime.provider)}
                    className="flex items-center gap-2 bg-[#cc3333]/10 border border-[#cc3333]/50 text-[#ff4444] hover:bg-[#cc3333]/20 disabled:opacity-50 transition-colors rounded-[1px] px-4 py-1.5 text-[12px] font-bold">
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
                <button
                  onClick={fetchRuntimes}
                  disabled={loading || isDownloading || (!activeMajorVersion && activeProvider !== "local")}
                  className="flex items-center gap-2 bg-transparent border border-[#555] hover:bg-white/5 disabled:opacity-50 transition-colors rounded-[1px] px-4 py-1.5 text-[12px] font-bold">
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
                </button>
              </div>

              <div className="flex flex-col border border-[#444] rounded-[1px] overflow-hidden flex-1">
                <div className="grid grid-cols-[2fr_3fr_1.5fr_1fr] gap-4 bg-[#1e1e1e] border-b border-[#444] p-2 text-[12px] font-bold text-[#999]">
                  <div className="pl-2">Version</div>
                  <div>Java Name</div>
                  <div>Released</div>
                  <div>Type</div>
                </div>
                <div className="flex-1 min-h-[300px] max-h-[400px] overflow-y-auto bg-black/20 flex flex-col custom-scrollbar">
                  {loading ? (
                    <div className="m-auto flex items-center justify-center p-4">
                      <Loader2 size={24} className="animate-spin text-[#999]" />
                    </div>
                  ) : runtimes.length === 0 ? (
                    <div className="m-auto bg-[#111] px-6 py-4 rounded-[1px] border border-[#333]">
                      <span className="text-[14px] font-bold text-[#aaa]">No runtimes found for this major version</span>
                    </div>
                  ) : (
                    runtimes.map(r => (
                      <div
                        key={`${r.name}_${r.version}_${r.path}`}
                        onClick={() => setSelectedRuntime(r)}
                        className={`grid grid-cols-[2fr_3fr_1.5fr_1fr] gap-4 p-2 pl-4 text-[13px] border-b border-[#333] cursor-pointer transition-colors ${selectedRuntime?.path === r.path ? 'bg-minecraft-green/20 border-l-2 border-l-minecraft-green pl-[14px]' : 'hover:bg-white/5 border-l-2 border-l-transparent'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white truncate" title={r.version}>{r.version}</span>
                          {(r.isInstalled || activeProvider === "local") && <span className="bg-minecraft-green/20 text-minecraft-green text-[10px] px-1.5 py-0.5 rounded-[1px] font-extrabold uppercase shrink-0">Installed</span>}
                        </div>
                        <div className="flex items-center text-[#999] truncate" title={r.name}>{r.name}</div>
                        <div className="flex items-center text-[#999]">{formatDate(r.releaseTime)}</div>
                        <div className="flex items-center text-[#999]">{r.packageType}</div>
                      </div>
                    ))
                  )}
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JavaSettings;
