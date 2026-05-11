import React from "react";
import CreateInstallation from "./CreateInstallation";
import PlayWarningModal from "./PlayWarningModal";
import MemoryWarningModal from "./MemoryWarningModal";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, Check, ExternalLink } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";

import JavaItem from "./installations/JavaItem";

interface InstallationsProps {
  activeNav?: string;
  onPlay?: () => void;
}

const Installations: React.FC<InstallationsProps> = ({ activeNav, onPlay }) => {
  const [isCreating, setIsCreating] = React.useState(false);
  const [editingProfile, setEditingProfile] = React.useState<any | null>(null);
  const [isWarningOpen, setIsWarningOpen] = React.useState(false);
  const [isMemoryWarningOpen, setIsMemoryWarningOpen] = React.useState(false);
  const [memCheckData, setMemCheckData] = React.useState({ required: 0, available: 0, profileId: "" });
  const [profiles, setProfiles] = React.useState<any[]>([]);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"Name" | "LastPlayed">("LastPlayed");
  const [isSortOpen, setIsSortOpen] = React.useState(false);
  const [filters, setFilters] = React.useState({
    releases: true,
    snapshots: true,
    modded: true
  });

  const menuRef = React.useRef<HTMLDivElement>(null);
  const sortRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadProfiles = async () => {
    try {
      const result: any[] = await invoke("get_profiles");
      const enriched = await Promise.all(result.map(async (p) => {
        try {
          const isInstalled = await invoke("check_path_exists", {
            path: p.InstallPath || p.install_path || "auto",
            profileName: p.Name || p.name || p.Id || p.id
          });
          return { ...p, isInstalled };
        } catch {
          return { ...p, isInstalled: false };
        }
      }));
      setProfiles(enriched);
    } catch (err) {
      console.error("Failed to load profiles:", err);
    }
  };

  React.useEffect(() => {
    loadProfiles();
  }, [isCreating, editingProfile]);

  const filteredAndSortedProfiles = React.useMemo(() => {
    return profiles
      .filter(p => {
        // Search filter
        if (searchTerm && !p.Name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }

        // Version type filter
        const isModded = p.Loader && p.Loader !== 'vanilla';
        const isSnapshot = !isModded && (
          /^[0-9]{2}w[0-9]{2}[a-z]$/.test(p.Version) || // e.g. 24w12a
          p.Version.toLowerCase().includes("pre") ||
          p.Version.toLowerCase().includes("rc") ||
          p.Version.toLowerCase().includes("alpha") ||
          p.Version.toLowerCase().includes("beta")
        );
        const isRelease = !isModded && !isSnapshot;

        if (isModded && !filters.modded) return false;
        if (isSnapshot && !filters.snapshots) return false;
        if (isRelease && !filters.releases) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "Name") {
          return a.Name.localeCompare(b.Name);
        } else {
          // Sort by LastPlayed (recent first)
          return new Date(b.LastPlayed || 0).getTime() - new Date(a.LastPlayed || 0).getTime();
        }
      });
  }, [profiles, searchTerm, sortBy, filters]);

  const handlePlayClick = (profile: any) => {
    handlePlayGame(profile.Id);
  };

  const handlePlayGame = async (profileId: string) => {
    try {
      // 1. Pre-check memory if enabled
      const profile = profiles.find(p => p.Id === profileId);
      if (profile) {
        const settings: any = await invoke("load_launcher_settings");
        if (settings.warn_low_memory) {
          const availableRam: number = await invoke("get_memory_info");
          const requiredRam = profile.ram_mb || profile.RamMb || 2048;

          if (availableRam < requiredRam) {
            setMemCheckData({ required: requiredRam, available: availableRam, profileId });
            setIsMemoryWarningOpen(true);
            return; // Stop here and show overlay
          }
        }
      }

      await invoke("play_game", { profileId });
    } catch (err) {
      console.error("Failed to start game:", err);
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

  const handleConfirmPlay = () => {
    console.log("Starting game...");
    setIsWarningOpen(false);
    onPlay?.();
  };

  const handleDuplicate = async (profile: any) => {
    try {
      const newProfile = {
        ...profile,
        Id: crypto.randomUUID(),
        Name: `${profile.Name} (Copy)`,
        LastPlayed: new Date().toISOString()
      };
      await invoke("save_profile", { profile: newProfile });
      loadProfiles();
    } catch (err) {
      console.error("Failed to duplicate profile:", err);
    }
  };

  const handleDelete = async (item: any) => {
    const isBedrock = item.isBedrock || activeNav === "windows";
    const confirmMsg = `Are you sure you want to delete "${item.Name || item.name}"?${item.isInstalled ? "\nThis will also delete the game folder." : ""}`;

    if (!window.confirm(confirmMsg)) return;

    try {
      if (isBedrock) {
        await invoke("delete_bedrock_installation", { profileId: item.Id || item.id });
        loadBedrockData();
      } else {
        await invoke("delete_installation", {
          profileId: item.Id || item.id,
          deleteFiles: item.isInstalled
        });
        loadProfiles();
      }
    } catch (err) {
      console.error("Failed to delete installation:", err);
      alert("Failed to delete: " + err);
    }
  };

  const [allBedrockVersions, setAllBedrockVersions] = React.useState<any[]>([]);

  const loadBedrockData = async () => {
    try {
      // 1. Load local data first for instant response
      const [installed, savedProfiles]: [any, any] = await Promise.all([
        invoke("get_installed_bedrock_versions"),
        invoke("get_bedrock_profiles")
      ]);

      const processList = (installedData: any[], profiles: any[]) => {
        const list: any[] = [];
        const processedVersions = new Set<string>();

        // 1. Add saved profiles first
        if (profiles && Array.isArray(profiles)) {
          profiles.forEach((p: any) => {
            const version = p.Version || p.version;
            const uuid = p.Uuid || p.uuid;

            // Match installed version by either version string or UUID (UpdateID)
            const isInstalled = installedData.find((i: any) =>
              i.version === version || (uuid && i.version === uuid)
            );

            list.push({
              ...p,
              Name: p.Name || p.name,
              Version: version,
              Uuid: uuid,
              Id: p.Id || p.id || uuid,
              isInstalled: !!isInstalled,
              path: isInstalled?.path || p.path || p.InstallPath,
              package_family: isInstalled?.package_family || p.PackageFamily || (p.PackageType === 'uwp' ? "Microsoft.MinecraftUWP_8wekyb3d8bbwe" : "Microsoft.MinecraftWindows_8wekyb3d8bbwe"),
              isProfile: true,
              isBedrock: true
            });

            if (isInstalled) {
              processedVersions.add(isInstalled.version);
            }
            processedVersions.add(version);
            if (uuid) processedVersions.add(uuid);
          });
        }

        // 2. Add installed versions that don't have a profile yet
        installedData.forEach((i: any) => {
          if (!processedVersions.has(i.version)) {
            list.push({
              ...i,
              Name: i.name || i.version,
              Version: i.version,
              Id: i.id || i.version,
              isInstalled: true,
              isProfile: false,
              isBedrock: true
            });
          }
        });

        return list;
      };

      // Show local data immediately
      setAllBedrockVersions(processList(installed, savedProfiles));

    } catch (err) {
      console.error("Failed to load Bedrock data:", err);
    }
  };

  React.useEffect(() => {
    if (activeNav === "windows") {
      loadBedrockData();
    } else {
      loadProfiles();
    }
  }, [activeNav, isCreating, editingProfile]);


  const handleBedrockPlay = async (item: any) => {
    try {

      if (item.isInstalled) {
        await invoke("play_bedrock_version", {
          path: item.path,
          packageFamily: item.package_family
        });
      } else {
        // Download and install first
        await invoke("install_bedrock_version", {
          id: item.isProfile ? (item.Uuid || item.Version) : (item.Id || item.Version),
          folderName: item.Version || item.version,
          url: item.url,
          packageType: item.package_type || item.PackageType,
          revision: item.revision || item.Revision
        });

        // Reload to get installed path/family
        const installed: any[] = await invoke("get_installed_bedrock_versions");
        const found = installed.find(i => i.version === item.version);

        if (found) {
          await invoke("play_bedrock_version", {
            path: found.path,
            packageFamily: found.package_family
          });
        }

        loadBedrockData();
      }
    } catch (err) {
      console.error("Failed to handle Bedrock play:", err);
      alert("Error: " + err);
    }
  };

  if (isCreating || editingProfile) {
    return <CreateInstallation
      onCancel={() => { setIsCreating(false); setEditingProfile(null); }}
      editProfile={editingProfile}
      activeNav={activeNav}
    />;
  }

  if (activeNav === "windows") {
    return (
      <div className="p-10 text-white font-sans bg-sidebar h-full flex-1">
        {/* Filter Bar (Simplified for Bedrock) */}
        <div className="flex items-start gap-10 mb-8">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-extrabold text-[#999] uppercase tracking-tighter">Search</label>
            <div className="relative group">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Installation name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-black/30 border-2 border-minecraft-green rounded-[1px] py-1 pl-10 pr-4 w-[380px] text-[13px] text-white focus:outline-none transition-colors placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-extrabold text-[#999] uppercase tracking-tighter">Sort by</label>
            <div className="relative" ref={sortRef}>
              <div
                onClick={() => setIsSortOpen(!isSortOpen)}
                className={`flex items-center justify-between bg-black/60 border-2 rounded-[1px] py-1 px-3 w-[160px] text-[13px] cursor-pointer transition-colors ${isSortOpen ? 'border-minecraft-green' : 'border-white/10 hover:border-white/20'}`}
              >
                <span className="text-[#dedede]">{sortBy === "Name" ? "Name" : "Latest played"}</span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
              </div>

              <AnimatePresence>
                {isSortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute left-0 top-full mt-1 w-full bg-[#121212] border border-[#333] shadow-2xl z-50 py-1"
                  >
                    <div
                      onClick={() => { setSortBy("LastPlayed"); setIsSortOpen(false); }}
                      className={`px-4 py-2 text-[13px] font-bold cursor-pointer transition-colors ${sortBy === "LastPlayed" ? 'bg-minecraft-green text-white' : 'hover:bg-[#1a1a1a] text-[#dedede] hover:text-white'}`}
                    >
                      Latest played
                    </div>
                    <div
                      onClick={() => { setSortBy("Name"); setIsSortOpen(false); }}
                      className={`px-4 py-2 text-[13px] font-bold cursor-pointer transition-colors ${sortBy === "Name" ? 'bg-minecraft-green text-white' : 'hover:bg-[#1a1a1a] text-[#dedede] hover:text-white'}`}
                    >
                      Name
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="h-px bg-[#2a2a2a] mb-6" />

        <div className="mb-6">
          <button
            onClick={() => setIsCreating(true)}
            className="bg-transparent border border-[#555] rounded-[1px] px-5 py-1.5 text-[12px] font-bold text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            New installation
          </button>
        </div>

        <div className="h-px bg-[#2a2a2a] mb-0" />

        <div className="flex flex-col">
          {allBedrockVersions
            .filter(item => !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
              if (sortBy === "Name") {
                return (a.name || a.Name || "").localeCompare(b.name || b.Name || "");
              } else {
                return new Date(b.last_played || b.LastPlayed || 0).getTime() - new Date(a.last_played || a.LastPlayed || 0).getTime();
              }
            })
            .map((item, index) => (
              <JavaItem
                key={item.Id || item.id || item.version}
                item={item}
                index={index}
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
                menuRef={menuRef}
                handlePlayClick={handleBedrockPlay}
                setEditingProfile={setEditingProfile}
                handleDuplicate={async (p) => {
                  try {
                    const newProfile = {
                      ...p,
                      Id: crypto.randomUUID(),
                      Name: `${p.Name} (Copy)`,
                      LastPlayed: new Date().toISOString()
                    };
                    await invoke("save_bedrock_profile", { profile: newProfile });
                    loadBedrockData();
                  } catch (err) {
                    console.error("Failed to duplicate bedrock profile:", err);
                  }
                }}
                handleDelete={handleDelete}
              />
            ))}
          {allBedrockVersions.length === 0 && (
            <div className="py-20 text-center text-gray-500 italic text-[14px]">
              No Bedrock installations found. Click "New installation" to add one.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeNav === "dungeons") {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-sidebar text-center p-10 flex-1">
        <h2 className="text-[20px] font-bold mb-3 text-white">
          Buy Minecraft Dungeons to get your adventure started
        </h2>
        <div className="text-[13px] text-gray-400 flex items-center gap-1.5">
          Go to{" "}
          <button
            onClick={() => openUrl("https://www.minecraft.net/en-us/about-dungeons?OCID=Launcher&utm_source=launcher")}
            className="text-white underline font-bold hover:text-minecraft-green transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
          >
            minecraft.net <ExternalLink size={14} />
          </button>{" "}
          to buy Minecraft Dungeons.
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 text-white font-sans bg-sidebar h-full flex-1">
      {/* Filter Bar */}
      <div className="flex items-start gap-10 mb-8">
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-extrabold text-[#999] uppercase tracking-tighter">Search</label>
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Installation name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-black/30 border-2 border-minecraft-green rounded-[1px] py-1 pl-10 pr-4 w-[380px] text-[13px] text-white focus:outline-none transition-colors placeholder:text-gray-500"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-extrabold text-[#999] uppercase tracking-tighter">Sort by</label>
          <div className="relative" ref={sortRef}>
            <div
              onClick={() => setIsSortOpen(!isSortOpen)}
              className={`flex items-center justify-between bg-black/60 border-2 rounded-[1px] py-1 px-3 w-[160px] text-[13px] cursor-pointer transition-colors ${isSortOpen ? 'border-minecraft-green' : 'border-white/10 hover:border-white/20'}`}
            >
              <span className="text-[#dedede]">{sortBy === "Name" ? "Name" : "Latest played"}</span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
            </div>

            <AnimatePresence>
              {isSortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute left-0 top-full mt-1 w-full bg-[#121212] border border-[#333] shadow-2xl z-50 py-1 animate-in fade-in zoom-in duration-150"
                >
                  <div
                    onClick={() => { setSortBy("LastPlayed"); setIsSortOpen(false); }}
                    className={`px-4 py-2 text-[13px] font-bold cursor-pointer transition-colors ${sortBy === "LastPlayed" ? 'bg-minecraft-green text-white' : 'hover:bg-[#1a1a1a] text-[#dedede] hover:text-white'}`}
                  >
                    Latest played
                  </div>
                  <div
                    onClick={() => { setSortBy("Name"); setIsSortOpen(false); }}
                    className={`px-4 py-2 text-[13px] font-bold cursor-pointer transition-colors ${sortBy === "Name" ? 'bg-minecraft-green text-white' : 'hover:bg-[#1a1a1a] text-[#dedede] hover:text-white'}`}
                  >
                    Name
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-extrabold text-[#999] uppercase tracking-tighter">Versions</label>
          <div className="flex items-center gap-5 pt-1">
            <VersionCheckbox
              label="Releases"
              checked={filters.releases}
              onChange={() => setFilters(prev => ({ ...prev, releases: !prev.releases }))}
            />
            <VersionCheckbox
              label="Snapshots"
              checked={filters.snapshots}
              onChange={() => setFilters(prev => ({ ...prev, snapshots: !prev.snapshots }))}
            />
            <VersionCheckbox
              label="Modded"
              checked={filters.modded}
              onChange={() => setFilters(prev => ({ ...prev, modded: !prev.modded }))}
            />
          </div>
        </div>
      </div>

      <div className="h-px bg-[#2a2a2a] mb-6" />

      {/* New Installation Button */}
      <div className="mb-6">
        <button
          onClick={() => setIsCreating(true)}
          className="bg-transparent border border-[#555] rounded-[1px] px-5 py-1.5 text-[12px] font-bold text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          New installation
        </button>
      </div>

      <div className="h-px bg-[#2a2a2a] mb-0" />

      {/* List */}
      <div className="flex flex-col">
        {filteredAndSortedProfiles.map((item, index) => (
          <JavaItem
            key={item.Id || index}
            item={item}
            index={index}
            openMenuId={openMenuId}
            setOpenMenuId={setOpenMenuId}
            menuRef={menuRef}
            handlePlayClick={handlePlayClick}
            setEditingProfile={setEditingProfile}
            handleDuplicate={handleDuplicate}
            handleDelete={handleDelete}
          />
        ))}
        {filteredAndSortedProfiles.length === 0 && (
          <div className="py-20 text-center text-gray-500 italic text-[14px]">
            No installations found. Try adjusting your search or filters.
          </div>
        )}
      </div>

      <PlayWarningModal
        isOpen={isWarningOpen}
        onClose={() => setIsWarningOpen(false)}
        onConfirm={handleConfirmPlay}
      />
      <MemoryWarningModal
        isOpen={isMemoryWarningOpen}
        onClose={() => setIsMemoryWarningOpen(false)}
        onConfirm={handleConfirmLaunch}
        requiredRam={memCheckData.required}
        availableRam={memCheckData.available}
      />
    </div>
  );
};

const VersionCheckbox: React.FC<{ label: string; checked: boolean; onChange: () => void }> = ({ label, checked, onChange }) => {
  return (
    <label className="flex items-center gap-2 cursor-pointer group" onClick={(e) => { e.preventDefault(); onChange(); }}>
      <div className={`w-[18px] h-[18px] rounded-[2px] flex items-center justify-center border transition-colors ${checked ? 'bg-minecraft-green border-minecraft-green' : 'bg-[#1a1a1a] border-[#555]'}`}>
        {checked && <Check size={14} className="text-white" strokeWidth={4} />}
      </div>
      <span className="text-[12px] font-bold text-gray-300 group-hover:text-white transition-colors">{label}</span>
    </label>
  );
};

export default Installations;


