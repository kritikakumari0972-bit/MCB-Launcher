import React, { useState, useEffect } from "react";
import { ChevronDown, Check, ExternalLink, Terminal } from "lucide-react";
import MinecraftHeader from "./MinecraftHeader";
import LanguageSelector from "@shared/components/LanguageSelector";
import { invoke } from "@tauri-apps/api/core";
import AccountsModal from "../../auth/components/AccountsModal";
import OfflineLoginModal from "../../auth/components/OfflineLoginModal";
import ElyByLoginModal from "../../auth/components/ElyByLoginModal";
import PlayerAvatar from "../../shared/components/PlayerAvatar";
import JavaSettings from "./settings/JavaSettings";
import { openUrl } from "@tauri-apps/plugin-opener";

interface SettingsProps {
  onToggleLogs?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onToggleLogs }) => {
  const [activeTab, setActiveTab] = useState("General");
  const [selectedLang, setSelectedLang] = useState("English - United States");
  const [disableGpu, setDisableGpu] = useState(true);
  const [filters, setFilters] = useState({
    releases: true,
    snapshots: false,
    old_beta: false,
    old_alpha: false
  });
  const [openLogOnStart, setOpenLogOnStart] = useState(false);
  const [keepLauncherOpen, setKeepLauncherOpen] = useState(true);
  const [bigText, setBigText] = useState(false);
  const [autoDetectJava, setAutoDetectJava] = useState(true);
  const [autoDownloadJava, setAutoDownloadJava] = useState(true);
  const [warnLowMemory, setWarnLowMemory] = useState(true);
  const [showRestartHint, setShowRestartHint] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [isOfflineLoginOpen, setIsOfflineLoginOpen] = useState(false);
  const [isElyByLoginOpen, setIsElyByLoginOpen] = useState(false);

  useEffect(() => {
    setActiveTab("General");

    // Fetch current user
    invoke<any>("get_secure_user")
      .then((user) => {
        if (user) {
          setCurrentUser(user);
          setRefreshKey(Date.now());
        }
      })
      .catch((err) => console.error("Failed to fetch user:", err));

    // Tải cấu hình từ Rust
    invoke<any>("load_launcher_settings")
      .then((config) => {
        if (config) {
          if (typeof config.disable_gpu === "boolean") setDisableGpu(config.disable_gpu);
          setFilters({
            releases: config.show_releases ?? true,
            snapshots: config.show_snapshots ?? false,
            old_beta: config.show_old_beta ?? false,
            old_alpha: config.show_old_alpha ?? false
          });
          if (typeof config.open_log_on_start === "boolean") setOpenLogOnStart(config.open_log_on_start);
          if (typeof config.keep_launcher_open === "boolean") setKeepLauncherOpen(config.keep_launcher_open);
          if (typeof config.big_text === "boolean") {
            setBigText(config.big_text);
            if (config.big_text) document.documentElement.classList.add("big-text");
            else document.documentElement.classList.remove("big-text");
          }
          if (typeof config.auto_detect_java === "boolean") setAutoDetectJava(config.auto_detect_java);
          if (typeof config.auto_download_java === "boolean") setAutoDownloadJava(config.auto_download_java);
          if (typeof config.warn_low_memory === "boolean") setWarnLowMemory(config.warn_low_memory);
        }
      })
      .catch((err) => {
        console.error("Failed to load settings:", err);
      });
  }, []);

  const saveAllSettings = (newGpu: boolean, newFilters: any, newOpenLogOnStart: boolean, newKeepLauncherOpen: boolean, newBigText: boolean, newAutoDetectJava: boolean, newAutoDownloadJava: boolean, newWarnLowMemory: boolean) => {
    invoke("save_launcher_settings", {
      disableGpu: newGpu,
      showReleases: newFilters.releases,
      showSnapshots: newFilters.snapshots,
      showOldBeta: newFilters.old_beta,
      showOldAlpha: newFilters.old_alpha,
      openLogOnStart: newOpenLogOnStart,
      keepLauncherOpen: newKeepLauncherOpen,
      bigText: newBigText,
      autoDetectJava: newAutoDetectJava,
      autoDownloadJava: newAutoDownloadJava,
      warnLowMemory: newWarnLowMemory
    }).catch(err => {
      console.error("Failed to save settings:", err);
    });
  };

  const handleDisableGpuChange = (checked: boolean) => {
    setDisableGpu(checked);
    setShowRestartHint(true);
    saveAllSettings(checked, filters, openLogOnStart, keepLauncherOpen, bigText, autoDetectJava, autoDownloadJava, warnLowMemory);
  };


  const tabs = ["General", "Accounts", "Java", "About"];

  return (
    <div className="flex flex-col h-full bg-main-bg text-white font-sans select-none">
      <MinecraftHeader
        title="Settings"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="bg-[#262626]"
      />

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-10 bg-[#2e2e2e] custom-scrollbar">
        {activeTab === "General" ? (
          <div className="max-w-[800px] flex flex-col gap-10 pb-20">
            {/* Language Section */}
            <section className="flex flex-col gap-3 relative z-40">
              <h2 className="text-[11px] font-extrabold text-[#999] uppercase tracking-tighter">Language</h2>
              <LanguageSelector
                selectedLang={selectedLang}
                onSelect={setSelectedLang}
              />
            </section>

            {/* Restart Hint */}
            {showRestartHint && (
              <div className="bg-[#cc3333]/20 border border-[#cc3333] p-4 text-[13px] text-white flex items-center justify-between">
                <span>Changes to hardware acceleration require a restart of the Launcher.</span>
              </div>
            )}

            {/* Review Section */}
            <div className="flex items-center gap-4">
              <button className="bg-transparent border border-[#555] rounded-[1px] px-6 py-1.5 text-[12px] font-bold text-white hover:bg-white/5 transition-colors">
                Review the Launcher
              </button>
              <button
                onClick={onToggleLogs}
                className="flex items-center gap-2 bg-transparent border border-[#555] rounded-[1px] px-4 py-1.5 text-[12px] font-bold text-white hover:bg-white/5 transition-colors"
              >
                <Terminal size={14} className="text-minecraft-green" />
                Show Logs
              </button>
              <div className="w-8 h-8 flex items-center justify-center">
                <img src="/zombie_icon.png" alt="Zombie" className="w-8 h-8 object-contain" />
              </div>
            </div>

            {/* Launcher Settings */}
            <section className="flex flex-col gap-4">
              <h2 className="text-[11px] font-extrabold text-[#999] uppercase tracking-tighter">Launcher Settings</h2>
              <div className="flex flex-col gap-4">
                <Checkbox
                  label="Keep the Launcher open while games are running"
                  checked={keepLauncherOpen}
                  onChange={(checked) => {
                    setKeepLauncherOpen(checked);
                    saveAllSettings(disableGpu, filters, openLogOnStart, checked, bigText, autoDetectJava, autoDownloadJava, warnLowMemory);
                  }}
                />
                <Checkbox
                  label="Disable hardware acceleration (requires restarting the Launcher)"
                  checked={disableGpu}
                  onChange={handleDisableGpuChange}
                />
              </div>
            </section>

            {/* Accessibility Settings */}
            <section className="flex flex-col gap-4">
              <h2 className="text-[11px] font-extrabold text-[#999] uppercase tracking-tighter">Launcher Accessibility Settings</h2>
              <div className="flex flex-col gap-4">
                <Checkbox
                  label="Make text size bigger"
                  checked={bigText}
                  onChange={(checked) => {
                    setBigText(checked);
                    if (checked) document.documentElement.classList.add("big-text");
                    else document.documentElement.classList.remove("big-text");
                    saveAllSettings(disableGpu, filters, openLogOnStart, keepLauncherOpen, checked, autoDetectJava, autoDownloadJava, warnLowMemory);
                  }}
                />
              </div>
            </section>

            {/* Java Edition Settings */}
            <section className="flex flex-col gap-4">
              <h2 className="text-[11px] font-extrabold text-[#999] uppercase tracking-tighter">Minecraft: Java Edition Settings</h2>
              <div className="flex flex-col gap-4">
                <Checkbox
                  label="Open output log when Minecraft: Java Edition starts"
                  checked={openLogOnStart}
                  onChange={(checked) => {
                    setOpenLogOnStart(checked);
                    saveAllSettings(disableGpu, filters, checked, keepLauncherOpen, bigText, autoDetectJava, autoDownloadJava, warnLowMemory);
                  }}
                />
              </div>
            </section>

            {/* Java Detection Settings */}
            <section className="flex flex-col gap-4">
              <h2 className="text-[11px] font-extrabold text-[#999] uppercase tracking-tighter">Java Detection</h2>
              <div className="flex flex-col gap-4">
                <Checkbox
                  label="Auto-detect Java version"
                  checked={autoDetectJava}
                  onChange={(checked) => {
                    setAutoDetectJava(checked);
                    saveAllSettings(disableGpu, filters, openLogOnStart, keepLauncherOpen, bigText, checked, autoDownloadJava, warnLowMemory);
                  }}
                />
                <Checkbox
                  label="Auto-download Mojang Java"
                  checked={autoDownloadJava}
                  onChange={(checked) => {
                    setAutoDownloadJava(checked);
                    saveAllSettings(disableGpu, filters, openLogOnStart, keepLauncherOpen, bigText, autoDetectJava, checked, warnLowMemory);
                  }}
                />
                <Checkbox
                  label="Warn when there is not enough memory available (Cảnh báo khi không đủ bộ nhớ trống)"
                  checked={warnLowMemory}
                  onChange={(checked) => {
                    setWarnLowMemory(checked);
                    saveAllSettings(disableGpu, filters, openLogOnStart, keepLauncherOpen, bigText, autoDetectJava, autoDownloadJava, checked);
                  }}
                />
              </div>
              <div className="mt-2">
                <button className="bg-transparent border border-[#555] rounded-[1px] px-5 py-2 text-[12px] font-bold text-white hover:bg-white/5 transition-colors">
                  Test Settings
                </button>
              </div>
            </section>

            {/* Quick Play Section */}
            <section className="flex flex-col gap-4">
              <div>
                <button
                  onClick={() => openUrl("https://buymeacoffee.com/tranphuphaq")}
                  className="bg-[#e7c23a] hover:bg-[#d4b134] text-black px-5 py-2 text-[13px] cursor-pointer font-bold rounded-[1px] transition-colors"
                >
                  Buy me a cafe
                </button>
              </div>
            </section>
          </div>
        ) : activeTab === "Accounts" ? (
          <div className="max-w-[800px] flex flex-col gap-8 pb-20">
            {/* Microsoft Account Header */}
            <div className="flex items-center gap-3">
              <div className="grid grid-cols-2 gap-0.5 w-5 h-5">
                <div className="bg-[#f25022]" />
                <div className="bg-[#7fbb00]" />
                <div className="bg-[#00a1f1]" />
                <div className="bg-[#ffbb00]" />
              </div>
              <span className="text-[16px] font-bold text-white">Microsoft</span>
            </div>

            {/* Account List */}
            <div className="flex flex-col gap-6">
              {currentUser ? (
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <PlayerAvatar
                      skinUrl={currentUser.avatar}
                      size={40}
                      className="bg-black/20"
                      refreshKey={refreshKey}
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[16px] font-extrabold">{currentUser.name}</span>
                        <span className="text-[10px] font-extrabold bg-minecraft-green px-1.5 py-0.5 text-white uppercase rounded-[1px]">Active</span>
                      </div>
                      <span className="text-[11px] text-[#999] uppercase tracking-wider">{currentUser.type || "Microsoft Account"}</span>
                    </div>
                  </div>
                  <button className="p-1 px-3 border border-[#444] rounded-[1px] hover:bg-white/5 transition-colors">
                    <span className="text-[14px]">...</span>
                  </button>
                </div>
              ) : (
                <div className="text-[14px] text-gray-500 italic">No account logged in.</div>
              )}

              <div>
                <button
                  onClick={() => setIsAccountsModalOpen(true)}
                  className="bg-transparent border border-[#555] rounded-[1px] px-6 py-1.5 text-[12px] font-bold text-white hover:bg-white/5 transition-colors"
                >
                  {currentUser ? "Switch Account" : "Add Account"}
                </button>
              </div>

              <AccountsModal
                isOpen={isAccountsModalOpen}
                onClose={() => setIsAccountsModalOpen(false)}
                currentUsername={currentUser?.name || ""}
                currentAccountType={currentUser?.type || ""}
                onSwitch={async (account) => {
                  await invoke("save_secure_user", { userData: account });
                  window.location.reload();
                }}
                onAddAccount={() => {
                  setIsAccountsModalOpen(false);
                  setIsOfflineLoginOpen(true);
                }}
                onAddElyBy={() => {
                  setIsAccountsModalOpen(false);
                  setIsElyByLoginOpen(true);
                }}
              />

              <ElyByLoginModal
                isOpen={isElyByLoginOpen}
                onClose={() => setIsElyByLoginOpen(false)}
                onSuccess={async () => {
                  setIsElyByLoginOpen(false);
                  window.location.reload();
                }}
              />

              <OfflineLoginModal
                isOpen={isOfflineLoginOpen}
                onClose={() => setIsOfflineLoginOpen(false)}
                onConfirm={async (username) => {
                  const newUser = {
                    name: username,
                    type: "Offline account",
                    avatar: "/user_icon.png",
                    token: null
                  };
                  await invoke("save_secure_user", { userData: newUser });
                  setIsOfflineLoginOpen(false);
                  window.location.reload();
                }}
              />
            </div>

            <div className="mt-8">
              <div className="flex items-center gap-2 text-[11px] font-extrabold text-[#999] uppercase tracking-tighter cursor-pointer hover:text-white transition-colors">
                Advanced Options
                <ChevronDown size={14} />
              </div>
            </div>
          </div>
        ) : activeTab === "Java" ? (
          <JavaSettings
            autoDetectJava={autoDetectJava}
            setAutoDetectJava={(checked) => {
              setAutoDetectJava(checked);
              saveAllSettings(disableGpu, filters, openLogOnStart, keepLauncherOpen, bigText, checked, autoDownloadJava, warnLowMemory);
            }}
            autoDownloadJava={autoDownloadJava}
            setAutoDownloadJava={(checked) => {
              setAutoDownloadJava(checked);
              saveAllSettings(disableGpu, filters, openLogOnStart, keepLauncherOpen, bigText, autoDetectJava, checked, warnLowMemory);
            }}
          />
        ) : (
          <div className="max-w-[800px] flex flex-col gap-8 pb-20 text-[13px]">
            {/* Launcher for Windows */}
            <section className="flex flex-col gap-3 pb-6 border-b border-[#2a2a2a]">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <h3 className="text-[16px] font-extrabold">Launcher for Windows</h3>
                  <span className="text-[#999]">Windows 10.0 1.0.0</span>
                  <span className="text-[#999]">Thursday, April 30, 2026 at 11:14:46 PM</span>
                  <span className="text-[#999] text-[11px] break-all">a7b2c8d4e9f0a1b2c3d4e5f6a7b2c8d4e9f0a1b2</span>
                </div>
                <div className="flex flex-col gap-4 items-end">
                  <button className="bg-transparent border border-[#555] rounded-[1px] px-4 py-1.5 text-[12px] font-bold text-white hover:bg-white/5 transition-colors">
                    What's New
                  </button>
                  <a href="#" className="flex items-center gap-1.5 font-bold hover:underline">
                    Report a Launcher bug
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </section>

            {/* Bootstrap */}
            <section className="flex flex-col gap-1 pb-6 border-b border-[#2a2a2a]">
              <h3 className="text-[16px] font-extrabold">Bootstrap</h3>
              <span className="text-[#999]">1.0.0</span>
              <span className="text-[#999]">Thursday, April 30, 2026 at 11:10:00 PM</span>
              <span className="text-[#999] text-[11px] break-all">f2e3d4c5b6a7f2e3d4c5b6a7f2e3d4c5b6a7f2e3</span>
            </section>

            {/* UI Section */}
            <section className="flex flex-col gap-1 pb-6 border-b border-[#2a2a2a]">
              <h3 className="text-[16px] font-extrabold">UI</h3>
              <span className="text-[#999]">1.0.0</span>
              <span className="text-[#999]">Thursday, April 30, 2026 at 11:12:30 PM</span>
              <span className="text-[#999] text-[11px] break-all">a7b2c8d4e9f0a1b2c3d4e5f6a7b2c8d4e9f0a1b2</span>
            </section>

            {/* Legal Section */}
            <section className="flex flex-col gap-2 pb-6 border-b border-[#2a2a2a]">
              <h3 className="text-[16px] font-extrabold uppercase tracking-tight mb-1">Legal</h3>
              <p className="text-[#dedede]">
                For the End User License Agreement (EULA), click <a href="#" className="font-bold flex-inline items-center gap-1 hover:underline">here <ExternalLink size={12} className="inline mb-1" /></a>.
              </p>
              <p className="text-[#dedede]">
                For the Privacy Policy, click <a href="#" className="font-bold flex-inline items-center gap-1 hover:underline">here <ExternalLink size={12} className="inline mb-1" /></a>.
              </p>
            </section>

            {/* Credits Section */}
            <section className="flex flex-col gap-4">
              <h3 className="text-[16px] font-extrabold">Credits and Third-party licenses</h3>
              <div className="flex flex-col gap-2">
                <p className="text-[#999]">A big thanks to:</p>
                <div className="flex items-center gap-2 pl-4">
                  <div className="w-1.5 h-1.5 bg-[#999] rotate-45" />
                  <p className="text-[#dedede]">
                    <a href="#" className="font-bold hover:underline inline-flex items-center gap-1">NameMC <ExternalLink size={12} /></a> for letting us use your awesome work as inspiration for Skins
                  </p>
                </div>
              </div>
              <div>
                <button className="bg-transparent border border-[#555] rounded-[1px] px-5 py-2 text-[12px] font-bold text-white hover:bg-white/5 transition-colors">
                  Third-party licenses
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

const Checkbox: React.FC<{
  label: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}> = ({ label, defaultChecked = false, checked, onChange }) => {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);

  const isChecked = checked !== undefined ? checked : internalChecked;

  const toggle = () => {
    const nextValue = !isChecked;
    if (onChange) {
      onChange(nextValue);
    } else {
      setInternalChecked(nextValue);
    }
  };

  return (
    <label
      className="flex items-start gap-3 cursor-pointer group w-fit"
      onClick={toggle}
    >
      <div className={`mt-0.5 w-[18px] h-[18px] rounded-[1px] flex items-center justify-center border transition-all ${isChecked ? 'bg-minecraft-green border-minecraft-green' : 'bg-transparent border-[#555] group-hover:border-[#999]'}`}>
        {isChecked && <Check size={14} className="text-white" strokeWidth={4} />}
      </div>
      <span className="text-[13px] text-[#dedede] leading-tight group-hover:text-white transition-colors">{label}</span>
    </label>
  );
};

export default Settings;
