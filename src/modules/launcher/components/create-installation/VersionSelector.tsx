import React from "react";
import { ChevronDown, Search, Check } from "lucide-react";

interface VersionSelectorProps {
  isBedrock: boolean;
  selectedVersion: any;
  setSelectedVersion: (v: any) => void;
  showVersionDropdown: boolean;
  setShowVersionDropdown: (v: boolean) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  filters: any;
  handleFilterChange: (key: string) => void;
  filteredVersions: any[];
  versions: any[];
  setShowModSettings: (v: boolean) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const VersionSelector: React.FC<VersionSelectorProps> = ({
  isBedrock,
  selectedVersion,
  setSelectedVersion,
  showVersionDropdown,
  setShowVersionDropdown,
  searchTerm,
  setSearchTerm,
  filters,
  handleFilterChange,
  filteredVersions,
  versions,
  setShowModSettings,
  containerRef
}) => {
  return (
    <div className="flex flex-col gap-2 relative" ref={containerRef}>
      <label className="text-[11px] font-extrabold text-[#999] uppercase tracking-tighter">Version</label>
      <div
        onClick={() => setShowVersionDropdown(!showVersionDropdown)}
        className={`flex items-center justify-between bg-black/60 border-2 rounded-[1px] py-1.5 px-4 text-[13px] cursor-pointer transition-colors ${showVersionDropdown ? 'border-minecraft-green' : 'border-white/10 hover:border-white/20'}`}
      >
        <div className="flex items-center justify-between flex-1 pr-4">
          <div className="flex items-center gap-3">
            <span className="text-[#dedede] font-medium">{selectedVersion.id}</span>
          </div>
          <ChevronDown size={14} className={`text-gray-400 transition-transform duration-300 ${showVersionDropdown ? "rotate-180" : ""}`} />
        </div>
        {!isBedrock && (
          <div
            onClick={(e) => { e.stopPropagation(); setShowModSettings(true); }}
            className="flex items-center justify-center px-5 -mr-4 py-3 -my-3 border-l border-white/5 text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer group/dots"
          >
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-current rounded-full shadow-sm" />
              <div className="w-1.5 h-1.5 bg-current rounded-full shadow-sm" />
              <div className="w-1.5 h-1.5 bg-current rounded-full shadow-sm" />
            </div>
          </div>
        )}
      </div>

      {/* Version Dropdown Menu */}
      {showVersionDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#121212] border border-[#333] shadow-2xl z-60 flex flex-col max-h-[450px] animate-in fade-in zoom-in duration-150">
          {/* Filters Section */}
          {!isBedrock && (
            <div className="p-3 border-b border-[#333] flex flex-wrap gap-4 bg-[#0a0a0a]/50">
              {['releases', 'snapshots', 'old_beta', 'old_alpha'].map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 cursor-pointer group"
                  onClick={(e) => { e.preventDefault(); handleFilterChange(type); }}
                >
                  <div className={`w-4 h-4 rounded-[2px] border transition-all flex items-center justify-center ${filters[type] ? 'bg-minecraft-green border-minecraft-green' : 'border-[#555] group-hover:border-white'}`}>
                    {filters[type] && <Check size={12} strokeWidth={4} />}
                  </div>
                  <span className="text-[11px] font-bold uppercase text-gray-400 group-hover:text-white transition-colors">
                    {type.replace('_', ' ')}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* Search Bar */}
          <div className="p-3 border-b border-[#333]">
            <div className="flex items-center gap-2 bg-[#0c0c0c] px-3 py-1.5 rounded-[2px]">
              <Search size={14} className="text-gray-500" />
              <input
                type="text"
                placeholder="Search versions..."
                autoFocus
                className="bg-transparent w-full text-[13px] text-white focus:outline-none placeholder:text-[#555]"
                onClick={(e) => e.stopPropagation()}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Versions List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Default Options */}
            {!searchTerm && !isBedrock && (
              <div className="p-1">
                <div
                  onClick={() => {
                    setSelectedVersion({ id: "Latest release", type: "release", url: "", package_type: "" });
                    setShowVersionDropdown(false);
                  }}
                  className={`px-4 py-2 hover:bg-minecraft-green hover:text-white cursor-pointer flex items-center justify-between group transition-colors ${selectedVersion.id === "Latest release" ? "bg-white/10 text-white" : "text-[#dedede]"}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[14px] ${selectedVersion.id === "Latest release" ? "text-white font-bold" : "text-gray-300 group-hover:text-white"}`}>Latest release</span>
                  </div>
                  <span className={`text-[10px] uppercase font-bold ${selectedVersion.id === "Latest release" ? "text-white/60" : "text-gray-500 group-hover:text-white/60"}`}>Recommended</span>
                </div>
              </div>
            )}

            {!searchTerm && !isBedrock && <div className="h-px bg-[#333] mx-2 my-1" />}

            {/* Fetched Versions */}
            <div className="p-1 pb-4">
              {filteredVersions.length > 0 ? (
                filteredVersions.map((v, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedVersion(v);
                      setShowVersionDropdown(false);
                    }}
                    className={`px-4 py-2 hover:bg-minecraft-green hover:text-white cursor-pointer flex items-center justify-between group transition-colors ${selectedVersion.id === v.id ? "bg-white/10 text-white" : "text-[#dedede] hover:text-white"}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-[14px] ${selectedVersion.id === v.id ? "text-white font-bold" : "text-gray-300 group-hover:text-white"}`}>{v.id}</span>
                    </div>
                    <span className={`text-[10px] uppercase font-bold ${selectedVersion.id === v.id ? "text-white/60" : "text-gray-600 group-hover:text-white/60"}`}>{v.type}</span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-gray-500 text-[12px] italic">
                  {versions.length === 0 ? "Loading versions..." : "No versions found"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionSelector;
