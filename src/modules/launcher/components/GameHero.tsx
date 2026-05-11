import React from "react";
import { ChevronDown, ExternalLink, Volume2, VolumeX, X } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import MemoryWarningModal from "./MemoryWarningModal";
import "@shared/components/GameHero.css";

interface GameHeroProps {
  activeNav?: string;
}

const GameHero: React.FC<GameHeroProps> = ({ activeNav }) => {
  const [profiles, setProfiles] = React.useState<any[]>([]);
  const [currentBg, setCurrentBg] = React.useState(activeNav === "dungeons" ? "/other_dungeons.jpg" : "/original_image.jpg");
  const [prevBg, setPrevBg] = React.useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = React.useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [selectedProfile, setSelectedProfile] = React.useState<any>(null);
  const [isInstalled, setIsInstalled] = React.useState(true);
  const [isRunning, setIsRunning] = React.useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = React.useState(false);
  const [shouldRenderVideo, setShouldRenderVideo] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isMemoryWarningOpen, setIsMemoryWarningOpen] = React.useState(false);
  const [memCheckData, setMemCheckData] = React.useState({ required: 0, available: 0, profileId: "" });
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const loadProfiles = async () => {
    try {
      if (activeNav === "windows") {
        const [installed, webData, savedProfiles]: [any, any, any] = await Promise.all([
          invoke("get_installed_bedrock_versions"),
          invoke("get_bedrock_versions"),
          invoke("get_bedrock_profiles")
        ]);

        const list: any[] = [];

        if (savedProfiles && savedProfiles.length > 0) {
          savedProfiles.forEach((p: any) => {
            const isInstalled = installed.find((i: any) => i.version === p.Version);
            list.push({
              ...p,
              Id: p.Id,
              Name: p.Name,
              Version: p.Version,
              IconPath: p.IconPath || "/grass_icon.png",
              isBedrock: true,
              isInstalled: !!isInstalled,
              path: isInstalled?.path,
              package_family: isInstalled?.package_family || (p.PackageType === 'uwp' ? "Microsoft.MinecraftUWP_8wekyb3d8bbwe" : "Microsoft.MinecraftWindows_8wekyb3d8bbwe"),
              uuid: p.Uuid,
              package_type: p.PackageType,
              revision: p.Revision,
              isProfile: true
            });
          });
        } else {
          // Fallback if no profiles exist
          installed.forEach((i: any) => {
            list.push({ Id: i.version, Name: i.name, Version: i.version, IconPath: "/grass_icon.png", isBedrock: true, isInstalled: true, path: i.path, package_family: i.package_family });
          });

          if (webData && webData.uwp && Array.isArray(webData.uwp) && webData.uwp.length > 0) {
            const latest = webData.uwp[0];
            if (!list.find(v => v.Version === latest[0])) {
              list.push({ Id: latest[1], Name: latest[0], Version: latest[0], IconPath: "/grass_icon.png", isBedrock: true, isInstalled: false, id: latest[1], revision: latest[2], package_type: 'uwp' });
            }
          }
        }

        setProfiles(list);
        if (list.length > 0) {
          // Try to restore last selected profile if possible
          const settings: any = await invoke("load_launcher_settings");
          const savedId = settings.last_selected_profile_be_id;
          const found = list.find(p => p.Id === savedId);
          setSelectedProfile(found || list[0]);
        }
      } else {
        const data: any[] = await invoke("get_profiles");
        setProfiles(data);
        if (data.length > 0) {
          const settings: any = await invoke("load_launcher_settings");
          const savedId = settings.last_selected_profile_id;
          const found = data.find(p => p.Id === savedId);
          setSelectedProfile(found || data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load profiles:", err);
    }
  };

  React.useEffect(() => {
    loadProfiles();
  }, [activeNav]);

  const checkInstallStatus = async (profile: any) => {
    if (!profile) return;
    if (profile.isBedrock) {
      try {
        const installed: any[] = await invoke("get_installed_bedrock_versions");
        const found = installed.find(i => i.version === profile.Version);
        setIsInstalled(!!found);
        if (found && !profile.isInstalled) {
          // Update selected profile with installation info if it was missing
          setSelectedProfile({
            ...profile,
            isInstalled: true,
            path: found.path,
            package_family: found.package_family
          });
        }
      } catch (err) {
        console.error("Failed to check bedrock install status:", err);
        setIsInstalled(profile.isInstalled);
      }
      return;
    }
    try {
      if (activeNav === "dungeons") {
        setIsInstalled(true); // Always true to show PLAY/GET button if we want, but we'll change the text
      } else {
        const status: boolean = await invoke("check_installation", { profileId: profile.Id });
        setIsInstalled(status);
      }
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    if (selectedProfile) {
      checkInstallStatus(selectedProfile);
      if (selectedProfile.isBedrock) {
        invoke("set_last_selected_profile_be", { id: selectedProfile.Id })
          .catch(err => console.error("Failed to save selected bedrock profile:", err));
      } else {
        invoke("set_last_selected_profile", { id: selectedProfile.Id })
          .catch(err => console.error("Failed to save selected profile:", err));
      }
    }
  }, [selectedProfile]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  React.useEffect(() => {
    setIsRunning(false);
  }, [activeNav]);

  React.useEffect(() => {
    const newBg = activeNav === "dungeons" ? "/other_dungeons.jpg" : "/original_image.jpg";

    // Force intro effect by clearing prevBg and starting transition
    setPrevBg(null);
    setCurrentBg(newBg);
    setIsTransitioning(true);
  }, [activeNav]);

  // Handle transition timer
  React.useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => setIsTransitioning(false), 100); // Slightly longer for better entry feel
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  // Handle video rendering lifecycle for fade out
  React.useEffect(() => {
    if (isPlayingVideo) {
      setShouldRenderVideo(true);
    } else {
      const timer = setTimeout(() => setShouldRenderVideo(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [isPlayingVideo]);

  const handlePlay = async () => {
    if (!selectedProfile) return;
    try {
      if (selectedProfile.isBedrock) {
        const { listen } = await import("@tauri-apps/api/event");
        const unlisten = await listen("launch-status", (_event: any) => {
          // setDownloadProgress(event.payload);
        });

        try {
          if (selectedProfile.isInstalled) {
            await invoke("play_bedrock_version", {
              path: selectedProfile.path,
              packageFamily: selectedProfile.package_family
            });
          } else {
            // Download and install
            await invoke("install_bedrock_version", {
              id: selectedProfile.isProfile ? (selectedProfile.uuid || selectedProfile.Version) : (selectedProfile.id || selectedProfile.Version),
              url: selectedProfile.url,
              packageType: selectedProfile.package_type || 'uwp',
              revision: selectedProfile.revision
            });

            // Reload profiles to get the installed path/family
            const installed: any[] = await invoke("get_installed_bedrock_versions");
            const found = installed.find(i => i.version === selectedProfile.Version);

            if (found) {
              // Automatically play after installation
              await invoke("play_bedrock_version", {
                path: found.path,
                packageFamily: found.package_family
              });
            }
          }
          loadProfiles();
        } finally {
          unlisten();
          // setDownloadProgress(null);
        }
      } else if (activeNav === "dungeons") {
        await openUrl("https://www.minecraft.net/en-us/store/minecraft-dungeons-ultimate-edition");
      } else {
        // Pre-check memory if enabled
        const settings: any = await invoke("load_launcher_settings");
        if (settings.warn_low_memory) {
          const availableRam: number = await invoke("get_memory_info");
          const requiredRam = selectedProfile.ram_mb || selectedProfile.RamMb || 2048;

          if (availableRam < requiredRam) {
            setMemCheckData({ required: requiredRam, available: availableRam, profileId: selectedProfile.Id });
            setIsMemoryWarningOpen(true);
            return; // Stop here and show overlay
          }
        }
        await invoke("play_game", { profileId: selectedProfile.Id });
      }
    } catch (err) {
      console.error("Launch error:", err);
      alert("Error: " + err);
    }
  };

  const handleConfirmLaunch = async () => {
    setIsMemoryWarningOpen(false);
    if (memCheckData.profileId) {
      try {
        await invoke("play_game", { profileId: memCheckData.profileId });
      } catch (err) {
        console.error("Failed to start game after warning:", err);
      }
    }
  };

  const getIcon = (path: string) => {
    if (!path || path === "ms-appx:///Assets/Icons/vanilla.png") return "/installation_icons/Grass_Block.png";
    if (path === "ms-appx:///Assets/Icons/fabric.png") return "/installation_icons/Crafting_Table.png";
    return path;
  };

  const videoId = activeNav === "dungeons" ? "9Y0TZkTjbc8" : "KNnHdKKfRCQ";

  return (
    <section className="relative h-[550px] overflow-hidden">
      <div className="absolute inset-0 z-0 bg-black">
        {/* Video Layer */}
        <div className={`absolute inset-0 z-10 transition-opacity duration-[1200ms] ${isPlayingVideo ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {shouldRenderVideo && (
            <>
              <iframe
                className="absolute inset-0 w-[140%] h-[140%] left-[-20%] top-[-20%] object-cover pointer-events-none select-none"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&modestbranding=1&rel=0&loop=1&playlist=${videoId}&iv_load_policy=3&showinfo=0&disablekb=1&fs=0&origin=${window.location.origin}`}
                title="Minecraft Game Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              {/* Transparent overlay to block YouTube hover controls */}
              <div className="absolute inset-0 z-20 pointer-events-auto" />
            </>
          )}
        </div>

        {/* Static Background Layer */}
        <div className={`absolute inset-0 z-0 transition-opacity duration-[1000ms] ${isPlayingVideo ? 'opacity-0' : 'opacity-100'}`}>
          {prevBg && (
            <img
              src={prevBg}
              alt="Previous Background"
              className="absolute inset-0 w-full h-full object-cover opacity-100"
            />
          )}
          <img
            key={currentBg}
            src={currentBg}
            alt="Current Background"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
            style={{ animation: isTransitioning ? 'none' : 'fadeIn 0.5s ease-out forwards' }}
          />
        </div>

        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent z-10" />
      </div>

      {/* Video Controls moved outside to be clickable */}
      <div className={`absolute left-6 bottom-[100px] flex items-center gap-1.5 z-50 transition-opacity duration-200 ${isDropdownOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {!isPlayingVideo ? (
          <button
            onClick={() => setIsPlayingVideo(true)}
            className="w-10 h-10 bg-[#3c3b3b] border-2 border-[#5a5959] shadow-[2px_2px_0px_#000] flex items-center justify-center hover:bg-[#4c4b4b] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all group/vbtn pointer-events-auto cursor-pointer"
            title="Play Preview Video"
          >
            <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1" />
          </button>
        ) : (
          <>
            <button
              onClick={() => openUrl(`https://youtu.be/${videoId}`)}
              className="w-10 h-10 bg-[#3c3b3b] border-2 border-[#5a5959] shadow-[2px_2px_0px_#000] flex items-center justify-center hover:bg-[#4c4b4b] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all pointer-events-auto cursor-pointer"
              title="Open in YouTube"
            >
              <ExternalLink size={18} />
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-10 h-10 bg-[#3c3b3b] border-2 border-[#5a5959] shadow-[2px_2px_0px_#000] flex items-center justify-center hover:bg-[#4c4b4b] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all pointer-events-auto cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button
              onClick={() => setIsPlayingVideo(false)}
              className="w-10 h-10 bg-[#3c3b3b] border-2 border-[#5a5959] shadow-[2px_2px_0px_#000] flex items-center justify-center hover:bg-[#4c4b4b] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all pointer-events-auto cursor-pointer"
              title="Close Video"
            >
              <X size={20} />
            </button>
          </>
        )}
      </div>

      <div className="relative z-10 h-full flex flex-col justify-end p-0">
        <div className="flex-1 flex items-center justify-center pb-90">
          <img
            key={activeNav} // Key forces re-animation of the logo
            src={activeNav === "dungeons" ? "/dungeons.png" : "/title.png"}
            alt={activeNav === "dungeons" ? "Minecraft Dungeons Logo" : "Minecraft Logo"}
            className="max-w-[300px] drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] animate-title"
          />
        </div>

        <div className="flex items-center justify-between bg-[#262626]">
          {/* Left part */}
          <div className="flex-1 basis-0 flex justify-start items-center gap-4">
            <div className="relative" ref={dropdownRef}>
              {isDropdownOpen && (
                <div className="absolute bottom-full left-0 w-full min-w-[250px] max-h-[300px] overflow-y-auto bg-[#161616] shadow-[0_10px_40px_rgba(0,0,0,0.6)] z-50 flex flex-col animate-fade-in border border-white/5 custom-scrollbar">
                  {profiles.map((inst) => {
                    const isSelected = selectedProfile?.Id === inst.Id;
                    return (
                      <div
                        key={inst.Id}
                        onClick={() => {
                          setSelectedProfile(inst);
                          setIsDropdownOpen(false);
                        }}
                        className={`flex items-center gap-4 py-3 px-4 cursor-pointer transition-colors hover:bg-minecraft-green group ${isSelected ? "bg-white/5" : ""
                          }`}
                      >
                        <img src={getIcon(inst.IconPath)} alt={inst.Name} className="w-10 h-10 object-contain" />
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-white tracking-wide">{inst.Name}</span>
                          <span className={`text-[12px] transition-colors group-hover:text-white/90 ${isSelected ? "text-white/80" : "text-text-dim"}`}>
                            {inst.Version}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between gap-12 text-white cursor-pointer px-4 py-3 transition-all rounded-[2px] border border-transparent hover:bg-white/5"
                style={{ visibility: activeNav === "dungeons" ? "hidden" : "visible" }}
              >
                <div className="flex items-center gap-4">
                  {selectedProfile && (
                    <>
                      <img src={getIcon(selectedProfile.IconPath)} alt={selectedProfile.Name} className="w-10 h-10 object-contain" />
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold leading-tight tracking-wide">{selectedProfile.Name}</span>
                        <span className="text-[12px] text-text-dim leading-tight">{selectedProfile.Version}</span>
                      </div>
                    </>
                  )}
                </div>
                <ChevronDown size={22} className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
              </div>
            </div>
          </div>

          <button
            onClick={handlePlay}
            disabled={isRunning}
            className="play-button -translate-y-2/5"
            style={activeNav === "dungeons" ? {
              backgroundImage: "url('/doungeons_button.png')",
              color: "#8f1f0b",
              opacity: isRunning ? 0.7 : 1,
              cursor: isRunning ? "default" : "pointer"
            } : {}}
          >
            {activeNav === "dungeons" ? "BUY OFFICIAL" : (isRunning ? "RUNNING" : (isInstalled ? "PLAY" : "INSTALL"))}
          </button>

          {/* Right part */}
          <div className="flex-1 basis-0 flex justify-end pr-6">
            <div className="text-white text-[11px] font-bold text-right opacity-80 uppercase tracking-tighter max-w-[150px]">
              NOT ASSOCIATED OR APPROVED BY MOJANG
            </div>
          </div>
        </div>
      </div>
      <MemoryWarningModal
        isOpen={isMemoryWarningOpen}
        onClose={() => setIsMemoryWarningOpen(false)}
        onConfirm={handleConfirmLaunch}
        requiredRam={memCheckData.required}
        availableRam={memCheckData.available}
      />
    </section>
  );
};

export default GameHero;
