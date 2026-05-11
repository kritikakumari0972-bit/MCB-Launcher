import React from "react";
import { X, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

interface ModSettingsProps {
  show: boolean;
  onClose: () => void;
  modSettingsRef: React.RefObject<HTMLDivElement | null>;
  selectedModLoader: string;
  setSelectedModLoader: (v: string) => void;
  selectedLoaderVersion: string;
  setSelectedLoaderVersion: (v: string) => void;
  showModLoaderDropdown: boolean;
  setShowModLoaderDropdown: (v: boolean) => void;
  showLoaderVersionDropdown: boolean;
  setShowLoaderVersionDropdown: (v: boolean) => void;
  loaderVersionsList: string[];
  isLoaderLoading: boolean;
  modLoaders: string[];
}

const ModSettings: React.FC<ModSettingsProps> = ({
  show,
  onClose,
  modSettingsRef,
  selectedModLoader,
  setSelectedModLoader,
  selectedLoaderVersion,
  setSelectedLoaderVersion,
  showModLoaderDropdown,
  setShowModLoaderDropdown,
  showLoaderVersionDropdown,
  setShowLoaderVersionDropdown,
  loaderVersionsList,
  isLoaderLoading,
  modLoaders
}) => {
  if (!show) return null;

  return (
    <motion.div
      ref={modSettingsRef}
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -320, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute left-0 top-0 bottom-0 w-[320px] bg-[#1a1a1a] border-r border-[#333] z-120 p-6 shadow-2xl flex flex-col gap-8"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#999]">Mod Settings</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Mod Loader Dropdown */}
      <div className="flex flex-col gap-2 relative">
        <label className="text-[11px] font-extrabold text-[#999] uppercase tracking-tighter">Mod Loader</label>
        <div
          onClick={() => setShowModLoaderDropdown(!showModLoaderDropdown)}
          className={`flex items-center justify-between bg-black/60 border-2 rounded-[1px] py-1.5 px-4 text-[13px] cursor-pointer transition-colors ${showModLoaderDropdown ? 'border-minecraft-green' : 'border-white/10 hover:border-white/20'}`}
        >
          <span className="text-[#dedede] font-medium">{selectedModLoader}</span>
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${showModLoaderDropdown ? 'rotate-180' : ''}`} />
        </div>

        {showModLoaderDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#121212] border border-[#333] shadow-2xl z-10 animate-in fade-in zoom-in duration-150">
            {modLoaders.map((loader) => (
              <div
                key={loader}
                onClick={() => {
                  setSelectedModLoader(loader);
                  setShowModLoaderDropdown(false);
                }}
                className={`px-4 py-2 text-[14px] cursor-pointer transition-colors relative flex items-center ${selectedModLoader === loader ? 'bg-white/5 text-white' : 'hover:bg-minecraft-green text-[#dedede] hover:text-white'}`}
              >
                {selectedModLoader === loader && <div className="absolute left-0 top-1 bottom-1 w-1 bg-minecraft-green" />}
                <span className={selectedModLoader === loader ? "pl-2" : ""}>{loader}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loader Version Dropdown - Only if not Vanilla */}
      {selectedModLoader !== "Vanilla" && (
        <div className="flex flex-col gap-2 relative transition-all animate-in slide-in-from-top-2 duration-300">
          <label className="text-[11px] font-extrabold text-[#999] uppercase tracking-tighter">Loader Version</label>
          <div
            onClick={() => !isLoaderLoading && setShowLoaderVersionDropdown(!showLoaderVersionDropdown)}
            className={`flex items-center justify-between bg-black/60 border-2 rounded-[1px] py-1.5 px-4 text-[13px] cursor-pointer transition-colors ${showLoaderVersionDropdown ? 'border-minecraft-green' : 'border-white/10 hover:border-white/20'} ${isLoaderLoading ? 'opacity-50 cursor-wait' : ''}`}
          >
            <span className="text-[#dedede] font-medium">
              {isLoaderLoading ? "Searching..." : selectedLoaderVersion}
            </span>
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${showLoaderVersionDropdown ? 'rotate-180' : ''}`} />
          </div>

          {showLoaderVersionDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#121212] border border-[#333] shadow-2xl z-10 animate-in fade-in zoom-in duration-150 max-h-[200px] overflow-y-auto custom-scrollbar">
              {loaderVersionsList.length > 0 ? (
                loaderVersionsList.map((v) => (
                  <div
                    key={v}
                    onClick={() => {
                      setSelectedLoaderVersion(v);
                      setShowLoaderVersionDropdown(false);
                    }}
                    className={`px-4 py-2 text-[14px] cursor-pointer transition-colors relative flex items-center ${selectedLoaderVersion === v ? 'bg-white/5 text-white' : 'hover:bg-minecraft-green text-[#dedede] hover:text-white'}`}
                  >
                    {selectedLoaderVersion === v && <div className="absolute left-0 top-1 bottom-1 w-1 bg-minecraft-green" />}
                    <span className={selectedLoaderVersion === v ? "pl-2" : ""}>{v}</span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-center text-gray-500 text-[12px] italic">
                  No loader versions found
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ModSettings;
