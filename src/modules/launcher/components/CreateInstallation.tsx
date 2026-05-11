import React from "react";
import { X, ChevronDown, Monitor, Check } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { AnimatePresence } from "framer-motion";
import ModSettings from "./create-installation/ModSettings";
import IconPicker from "./create-installation/IconPicker";
import VersionSelector from "./create-installation/VersionSelector";
import AdvancedOptions from "./create-installation/AdvancedOptions";

interface CreateInstallationProps {
  onCancel: () => void;
  editProfile?: any | null;
  activeNav?: string;
}

const CreateInstallation: React.FC<CreateInstallationProps> = ({ onCancel, editProfile, activeNav }) => {
  const isBedrock = activeNav === "windows";
  const [showMore, setShowMore] = React.useState(false);
  const [showWarning, setShowWarning] = React.useState(false);
  const [showIconPicker, setShowIconPicker] = React.useState(false);
  const [selectedIcon, setSelectedIcon] = React.useState(isBedrock ? "/grass_icon.png" : "/installation_icons/Furnace.png");
  const [showVersionDropdown, setShowVersionDropdown] = React.useState(false);
  const [versions, setVersions] = React.useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = React.useState<any>({ id: "Latest release", type: "release", url: "", package_type: "" });
  const [searchTerm, setSearchTerm] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const modSettingsRef = React.useRef<HTMLDivElement>(null);

  // Mod Settings States
  const [showModSettings, setShowModSettings] = React.useState(false);
  const [selectedModLoader, setSelectedModLoader] = React.useState("Vanilla");
  const [selectedLoaderVersion, setSelectedLoaderVersion] = React.useState("0.17.2 Beta");
  const [showModLoaderDropdown, setShowModLoaderDropdown] = React.useState(false);
  const [showLoaderVersionDropdown, setShowLoaderVersionDropdown] = React.useState(false);

  const modLoaders = ["Vanilla", "Fabric", "Quilt", "Forge", "NeoForge"];
  const [loaderVersionsList, setLoaderVersionsList] = React.useState<string[]>([]);
  const [isLoaderLoading, setIsLoaderLoading] = React.useState(false);

  // Version Filter States
  const [filters, setFilters] = React.useState({
    releases: true,
    snapshots: false,
    old_beta: false,
    old_alpha: false
  });
  const [disableGpu, setDisableGpu] = React.useState(true);

  // Form States
  const [name, setName] = React.useState("");
  const [gameDir, setGameDir] = React.useState("");
  const [resW, setResW] = React.useState("");
  const [resH, setResH] = React.useState("");
  const [javaExec, setJavaExec] = React.useState("");
  const [jvmArgs, setJvmArgs] = React.useState("-Xmx2G -XX:+UnlockExperimentalVMOptions -XX:+UseG1GC -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32M");
  const [ramMb, setRamMb] = React.useState(2048);
  const [launchAfterInstall, setLaunchAfterInstall] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showResolutionDropdown, setShowResolutionDropdown] = React.useState(false);

  // Initialize with editing data if safe
  React.useEffect(() => {
    if (editProfile) {
      setName(editProfile.Name || editProfile.name || "");
      setSelectedVersion({ 
        id: editProfile.Version || editProfile.version || editProfile.id, 
        type: editProfile.PackageType || editProfile.package_type || (isBedrock ? "uwp" : "release"), 
        uuid: editProfile.Uuid || editProfile.uuid || null,
        revision: editProfile.Revision || editProfile.revision || null,
        url: editProfile.url || "" 
      });
      setSelectedModLoader(editProfile.Loader === "vanilla" ? "Vanilla" : (editProfile.Loader ? editProfile.Loader.charAt(0).toUpperCase() + editProfile.Loader.slice(1) : "Vanilla"));
      setSelectedLoaderVersion(editProfile.LoaderVersion || "");
      setGameDir(editProfile.InstallPath === "auto" ? "" : editProfile.InstallPath);
      setResW(editProfile.ResolutionWidth?.toString() || "");
      setResH(editProfile.ResolutionHeight?.toString() || "");
      setJavaExec(editProfile.JavaExecutable || "");
      setJvmArgs(editProfile.JvmArgs || "");
      setRamMb(editProfile.RamMb || 2048);
      setSelectedIcon(editProfile.IconPath || (isBedrock ? "/grass_icon.png" : "/installation_icons/Furnace.png"));
    }
  }, [editProfile, isBedrock]);

  const resolutions = [
    "auto",
    "800x600",
    "1024x768",
    "1280x1024",
    "1366x768",
    "1600x900",
    "1920x1080",
    "2560x1440"
  ];

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Version dropdown click outside
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowVersionDropdown(false);
      }
      // Mod settings panel click outside
      if (showModSettings && modSettingsRef.current && !modSettingsRef.current.contains(event.target as Node)) {
        // setShowModSettings(false); 
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showModSettings]);

  const saveSettings = async (newFilters: any) => {
    if (isBedrock) return;
    try {
      await invoke("save_launcher_settings", {
        disableGpu,
        showReleases: newFilters.releases,
        showSnapshots: newFilters.snapshots,
        showOldBeta: newFilters.old_beta,
        showOldAlpha: newFilters.old_alpha
      });
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  };

  const handleFilterChange = (key: string) => {
    const newFilters = { ...filters, [key]: !filters[key as keyof typeof filters] };
    setFilters(newFilters);
    saveSettings(newFilters);
  };

  React.useEffect(() => {
    const fetchLoaders = async () => {
      if (isBedrock || selectedModLoader === "Vanilla") {
        setLoaderVersionsList([]);
        return;
      }

      setIsLoaderLoading(true);
      let mcVersion = selectedVersion.id;

      try {
        const manifest: any = await invoke("get_cached_manifest");
        if (mcVersion === "Latest release") {
          mcVersion = manifest.latest.release;
        } else if (mcVersion === "Latest snapshot") {
          mcVersion = manifest.latest.snapshot;
        }

        const result: string[] = await invoke("get_loader_versions", {
          loader: selectedModLoader,
          gameVersion: mcVersion
        });

        setLoaderVersionsList(result);
        if (result.length > 0) {
          setSelectedLoaderVersion(result[0]);
        } else {
          setSelectedLoaderVersion("Not available");
        }
      } catch (err) {
        console.error("Failed to fetch loader versions:", err);
        setLoaderVersionsList([]);
        setSelectedLoaderVersion("Error loading");
      } finally {
        setIsLoaderLoading(false);
      }
    };

    fetchLoaders();
  }, [selectedModLoader, selectedVersion, isBedrock]);

  React.useEffect(() => {
    const loadManifest = async () => {
      setVersions([]);
      try {
        if (isBedrock) {
          const data: any = await invoke("get_bedrock_versions");
          // setBedrockData(data);
          const uwp = data.uwp || [];
          const list: any[] = [];

          if (Array.isArray(uwp)) {
            // UWP is array of arrays: [ [version, uuid, type], ... ]
            uwp.forEach((v: any) => {
              if (Array.isArray(v) && v.length >= 2) {
                list.push({
                  id: v[0],
                  type: 'uwp',
                  uuid: v[1], // We use uuid for UWP download URL resolution
                  revision: v[2], // From [version, uuid, revision]
                  package_family: "Microsoft.MinecraftUWP_8wekyb3d8bbwe"
                });
              }
            });
          }

          // GDK
          if (data.gdk) {
            ['release', 'preview'].forEach(type => {
              if (data.gdk[type]) {
                Object.keys(data.gdk[type]).forEach(ver => {
                  const urls = data.gdk[type][ver];
                  if (Array.isArray(urls) && urls.length > 0) {
                    list.push({
                      id: ver,
                      type: 'gdk',
                      url: urls[0], // Use first URL
                      package_family: "Microsoft.MinecraftUWP_8wekyb3d8bbwe" // Placeholder for GDK
                    });
                  }
                });
              }
            });
          }

          // Reverse list to show latest first
          list.reverse();

          setVersions(list);
          if (list.length > 0) {
            if (editProfile) {
              const currentVerId = editProfile.Version || editProfile.version || editProfile.id;
              const found = list.find(v => v.id === currentVerId);
              if (found) {
                setSelectedVersion(found);
              }
            } else {
              setSelectedVersion(list[0]);
            }
          }
        } else {
          const manifest: any = await invoke("get_cached_manifest");
          if (manifest && manifest.versions) {
            setVersions(manifest.versions);
          }
        }
      } catch (err) {
        console.error("Failed to load versions:", err);
      }
    };

    const loadSettings = async () => {
      if (isBedrock) return;
      try {
        const settings: any = await invoke("load_launcher_settings");
        if (settings) {
          setFilters({
            releases: settings.show_releases ?? true,
            snapshots: settings.show_snapshots ?? false,
            old_beta: settings.show_old_beta ?? false,
            old_alpha: settings.show_old_alpha ?? false
          });
          setDisableGpu(settings.disable_gpu ?? true);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };

    loadManifest();
    loadSettings();
  }, [isBedrock]);


  const handleInstall = async () => {
    setIsSaving(true);
    try {
      if (isBedrock) {
        const profile = {
          Id: editProfile ? editProfile.Id : crypto.randomUUID(),
          Name: name.trim() || selectedVersion.id,
          Version: selectedVersion.id,
          Uuid: selectedVersion.uuid || null,
          PackageType: selectedVersion.type,
          LastPlayed: editProfile ? editProfile.LastPlayed : null,
          IconPath: selectedIcon,
          Revision: selectedVersion.revision || null,
        };

        await invoke("save_bedrock_profile", { profile });
        onCancel();
      } else {
        const profileName = name.trim() || selectedVersion.id;

        const profile = {
          Id: editProfile ? editProfile.Id : crypto.randomUUID(),
          Name: profileName,
          Version: selectedVersion.id,
          Loader: selectedModLoader.toLowerCase(),
          LoaderVersion: selectedModLoader === "Vanilla" ? "" : selectedLoaderVersion,
          RamMb: ramMb,
          JvmArgs: jvmArgs,
          LastPlayed: editProfile ? editProfile.LastPlayed : new Date().toISOString(),
          IconPath: selectedIcon,
          AllowMultiInstance: false,
          InstallPath: gameDir || `auto`,
          ResolutionWidth: resW ? parseInt(resW) : null,
          ResolutionHeight: resH ? parseInt(resH) : null,
          JavaExecutable: javaExec || null,
        };

        await invoke("save_profile", { profile });
        onCancel();
      }
    } catch (err) {
      console.error("Failed to save profile:", err);
      alert("Error: " + err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredVersions = versions.filter(v => {
    const matchesSearch = v.id.toLowerCase().includes(searchTerm.toLowerCase());
    if (isBedrock) return matchesSearch;

    const type = v.type === 'release' ? 'releases' :
      v.type === 'snapshot' ? 'snapshots' :
        v.type === 'old_beta' ? 'old_beta' :
          v.type === 'old_alpha' ? 'old_alpha' : '';

    const matchesFilter = type === '' || filters[type as keyof typeof filters];
    return matchesSearch && matchesFilter;
  });

  const icons = [
    "/installation_icons/Furnace.png",
    "/installation_icons/Grass_Block.png",
    "/installation_icons/Dirt.png",
    "/installation_icons/Cobblestone.png",
    "/installation_icons/Oak_Planks.png",
    "/installation_icons/Oak_Log.png",
    "/installation_icons/Bedrock.png",
    "/installation_icons/Sand.png",
    "/installation_icons/Gravel.png",
    "/installation_icons/Gold_Ore.png",
    "/installation_icons/Iron_Ore.png",
    "/installation_icons/Coal_Ore.png",
    "/installation_icons/Glass.png",
    "/installation_icons/Lapis_Lazuli_Ore.png",
    "/installation_icons/Diamond_Ore.png",
    "/installation_icons/Redstone_Ore.png",
    "/installation_icons/Emerald_Ore.png",
    "/installation_icons/TNT.png",
    "/installation_icons/Bookshelf.png",
    "/installation_icons/Obsidian.png",
    "/installation_icons/Chest.png",
    "/installation_icons/Crafting_Table.png",
    "/installation_icons/Ice.png",
    "/installation_icons/Snow_Block.png",
    "/installation_icons/Pumpkin.png",
    "/installation_icons/Netherrack.png",
    "/installation_icons/Soul_Sand.png",
    "/installation_icons/Glowstone.png",
    "/installation_icons/Cake.png",
    "/installation_icons/Mycelium.png",
    "/installation_icons/Nether_Bricks.png",
    "/installation_icons/Nether_Wart_Block.png",
    "/installation_icons/Enchanting_Table.png",
    "/installation_icons/End_Stone.png",
    "/installation_icons/Ender_Chest.png",
    "/installation_icons/Emerald_Ore.png",
    "/installation_icons/Command_Block.png",
    "/installation_icons/Slime_Block.png",
    "/installation_icons/Honey_Block.png",
    "/installation_icons/Ancient_Debris.png",
    "/installation_icons/Creeper_Head.png",
    "/installation_icons/Skeleton_Skull.png",
    "/installation_icons/Xmas_Chest.png",
    "/installation_icons/Nether_Reactor_Core.png",
    "/installation_icons/Block_of_Diamond.png",
    "/installation_icons/Block_of_Gold.png",
    "/installation_icons/Block_of_Emerald.png",
    "/installation_icons/Block_of_Iron.png",
    "/installation_icons/Block_of_Netherite.png",
    "/installation_icons/Block_of_Redstone.png"
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#2e2e2e] flex flex-col text-white font-sans select-none overflow-hidden">
      <AnimatePresence>
        <ModSettings
          show={showModSettings}
          onClose={() => setShowModSettings(false)}
          modSettingsRef={modSettingsRef}
          selectedModLoader={selectedModLoader}
          setSelectedModLoader={setSelectedModLoader}
          selectedLoaderVersion={selectedLoaderVersion}
          setSelectedLoaderVersion={setSelectedLoaderVersion}
          showModLoaderDropdown={showModLoaderDropdown}
          setShowModLoaderDropdown={setShowModLoaderDropdown}
          showLoaderVersionDropdown={showLoaderVersionDropdown}
          setShowLoaderVersionDropdown={setShowLoaderVersionDropdown}
          loaderVersionsList={loaderVersionsList}
          isLoaderLoading={isLoaderLoading}
          modLoaders={modLoaders}
        />
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-6 h-12 border-b border-[#5b5b5b] bg-[#2e2e2e]">
        <div className="flex-1" />
        <h1 className="text-sm font-bold uppercase tracking-wider">{editProfile ? "Edit installation" : "Create new installation"}</h1>
        <div className="flex-1 flex justify-end">
          <button
            onClick={onCancel}
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-[#606060] transition-all duration-200"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pt-12 flex flex-col items-center custom-scrollbar pb-32">
        {/* Icon Selector Wrapper */}
        <IconPicker
          showIconPicker={showIconPicker}
          setShowIconPicker={setShowIconPicker}
          selectedIcon={selectedIcon}
          setSelectedIcon={setSelectedIcon}
          icons={icons}
        />

        <div className="w-[600px] flex flex-col gap-8">
          {/* Name Field */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-extrabold text-[#999] uppercase tracking-tighter">Name</label>
            <div className="bg-[#0c0c0c] rounded-[2px] px-4 py-2.5">
              <input
                type="text"
                placeholder={selectedVersion.id}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-transparent w-full text-[14px] text-white focus:outline-none placeholder:text-[#555]"
              />
            </div>
          </div>

          <VersionSelector
            isBedrock={isBedrock}
            selectedVersion={selectedVersion}
            setSelectedVersion={setSelectedVersion}
            showVersionDropdown={showVersionDropdown}
            setShowVersionDropdown={setShowVersionDropdown}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filters={filters}
            handleFilterChange={handleFilterChange}
            filteredVersions={filteredVersions}
            versions={versions}
            setShowModSettings={setShowModSettings}
            containerRef={containerRef}
          />

          {/* Game Directory */}
          {!isBedrock && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-extrabold text-[#999] uppercase tracking-tighter">Game Directory</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="<Use default directory>"
                  value={gameDir}
                  onChange={(e) => setGameDir(e.target.value)}
                  className="flex-1 bg-black/40 border-2 border-minecraft-green rounded-[1px] py-1.5 px-3 text-[13px] text-white focus:outline-none transition-colors placeholder:text-gray-600"
                />
                <button
                  onClick={async () => {
                    const path: string | null = await invoke("pick_directory");
                    if (path) setGameDir(path);
                  }}
                  className="text-[11px] font-extrabold uppercase text-white hover:underline"
                >
                  Browse
                </button>
              </div>
            </div>
          )}

          {!isBedrock && (
            <div className="flex flex-col gap-2 relative">
              <label className="text-[11px] font-extrabold text-[#999] uppercase tracking-tighter">Resolution</label>
              <div className="flex items-center gap-4">
                {/* Preset Dropdown */}
                <div className="relative">
                  <div
                    onClick={() => setShowResolutionDropdown(!showResolutionDropdown)}
                    className={`flex items-center justify-between bg-black/60 border-2 rounded-[1px] py-1.5 px-4 w-[200px] text-[13px] cursor-pointer transition-colors ${showResolutionDropdown ? 'border-minecraft-green' : 'border-white/10 hover:border-white/20'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Monitor size={16} className="text-gray-400" />
                      <span className="text-[#dedede] font-medium">
                        Presets
                      </span>
                    </div>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${showResolutionDropdown ? "rotate-180" : ""}`} />
                  </div>

                  {showResolutionDropdown && (
                    <div className="absolute top-full left-0 w-[200px] mt-1 bg-[#121212] border border-[#333] shadow-2xl z-60 flex flex-col max-h-[250px] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in duration-150">
                      {resolutions.map((res) => (
                        <div
                          key={res}
                          onClick={() => {
                            if (res === "auto") {
                              setResW("");
                              setResH("");
                            } else {
                              const [w, h] = res.split('x');
                              setResW(w);
                              setResH(h);
                            }
                            setShowResolutionDropdown(false);
                          }}
                          className={`px-4 py-2 hover:bg-minecraft-green hover:text-white cursor-pointer transition-colors text-[13px] ${((!resW && !resH && res === "auto") || (resW && resH && res === `${resW}x${resH}`)) ? "bg-white/10 text-white font-bold" : "text-[#dedede]"}`}
                        >
                          {res}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom Inputs */}
                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-200">
                  <input
                    type="text"
                    placeholder="<auto>"
                    value={resW}
                    onChange={(e) => setResW(e.target.value)}
                    className="w-[100px] bg-[#0c0c0c] border-2 border-white/10 rounded-[1px] py-1.5 px-3 text-[13px] text-white focus:outline-none focus:border-minecraft-green text-center placeholder:text-[#555] transition-colors"
                  />
                  <span className="text-gray-500 font-bold">×</span>
                  <input
                    type="text"
                    placeholder="<auto>"
                    value={resH}
                    onChange={(e) => setResH(e.target.value)}
                    className="w-[100px] bg-[#0c0c0c] border-2 border-white/10 rounded-[1px] py-1.5 px-3 text-[13px] text-white focus:outline-none focus:border-minecraft-green text-center placeholder:text-[#555] transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          <AdvancedOptions
            isBedrock={isBedrock}
            showMore={showMore}
            setShowMore={setShowMore}
            showWarning={showWarning}
            setShowWarning={setShowWarning}
            javaExec={javaExec}
            setJavaExec={setJavaExec}
            ramMb={ramMb}
            setRamMb={setRamMb}
            jvmArgs={jvmArgs}
            setJvmArgs={setJvmArgs}
          />
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-4 bg-sidebar border-t border-[#5b5b5b] flex flex-col items-end gap-2 px-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="bg-[#2a2a2a] border border-[#444] rounded-[1px] px-6 py-1.5 text-[13px] font-bold text-white hover:bg-[#333] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInstall}
            disabled={isSaving}
            className="bg-minecraft-green hover:bg-minecraft-green-hover disabled:opacity-50 text-white px-8 py-1.5 rounded-[1px] text-[13px] font-bold transition-colors"
          >
            {isSaving ? "Saving..." : (editProfile ? "Save" : "Create")}
          </button>
        </div>
        <label className="flex items-center gap-2 cursor-pointer group">
          <div
            onClick={() => setLaunchAfterInstall(!launchAfterInstall)}
            className={`w-[18px] h-[18px] rounded-[1px] flex items-center justify-center border transition-all ${launchAfterInstall ? 'bg-minecraft-green border-minecraft-green' : 'border-[#444] group-hover:border-[#666]'}`}
          >
            {launchAfterInstall && <Check size={14} className="text-white" strokeWidth={4} />}
          </div>
          <span className="text-[12px] font-bold text-gray-300 group-hover:text-white transition-colors" onClick={() => setLaunchAfterInstall(!launchAfterInstall)}>Launch after Install</span>
        </label>
      </div>
    </div>
  );
};

export default CreateInstallation;
