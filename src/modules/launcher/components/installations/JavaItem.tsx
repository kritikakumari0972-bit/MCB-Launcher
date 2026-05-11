import React from "react";
import { Play, Folder, MoreHorizontal } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface JavaItemProps {
  item: any;
  index: number;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  handlePlayClick: (profile: any) => void;
  setEditingProfile: (profile: any) => void;
  handleDuplicate: (profile: any) => void;
  handleDelete: (profile: any) => void;
}

const JavaItem: React.FC<JavaItemProps> = ({
  item,
  index,
  openMenuId,
  setOpenMenuId,
  menuRef,
  handlePlayClick,
  setEditingProfile,
  handleDuplicate,
  handleDelete
}) => {
  const isBedrock = item.isBedrock || item.PackageType || item.package_type || item.PackageFamily || item.package_family;
  const installPath = isBedrock ? (item.path || item.InstallPath) : item.InstallPath;
  const itemName = item.Name || item.name;
  const itemVersion = item.Version || item.version;
  const itemId = item.Id || item.id || item.uuid || index;

  return (
    <div key={itemId} className="flex items-center justify-between py-5 border-b border-[#2a2a2a] group transition-colors relative">
      <div className="flex items-center gap-5">
        <div className="w-[48px] h-[48px] rounded-[1px] overflow-hidden bg-black/20 flex items-center justify-center">
          <img
            src={item.IconPath?.startsWith('ms-appx') ? "https://static.wikia.nocookie.net/minecraft_gamepedia/images/4/44/Grass_Block_JE4.png" : (item.IconPath || item.icon_path)}
            alt={itemName}
            className="w-10 h-10 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/grass_icon.png";
            }}
          />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-[15px] leading-tight tracking-wide">{itemName}</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-[13px]">{itemVersion}</span>
            {item.Loader && item.Loader !== 'vanilla' && (
              <span className="text-minecraft-green text-[11px] font-bold uppercase py-0.5 px-1.5 bg-minecraft-green/10 rounded-[1px]">
                {item.Loader} {item.LoaderVersion}
              </span>
            )}
            {isBedrock && (
              <span className="text-minecraft-green text-[11px] font-bold uppercase py-0.5 px-1.5 bg-minecraft-green/10 rounded-[1px]">
                {item.PackageType || item.package_type}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => handlePlayClick(item)}
          className="bg-minecraft-green hover:bg-minecraft-green-hover text-white px-8 py-1.5 rounded-[1px] text-[13px] font-extrabold transition-colors flex items-center gap-2"
        >
          <Play size={14} fill="currentColor" />
          Play
        </button>
        {installPath && item.isInstalled && (
          <button
            onClick={() => invoke("open_folder", { path: installPath, profileName: itemName || itemId })}
            className="p-2 border border-[#555] rounded-[1px] bg-transparent hover:bg-white/5 text-gray-200 transition-colors"
            title="Open folder"
          >
            <Folder size={18} />
          </button>
        )}
        <div className="relative" ref={openMenuId === itemId ? menuRef : null}>
          <button
            onClick={() => setOpenMenuId(openMenuId === itemId ? null : itemId)}
            className={`p-2 border border-[#555] rounded-[1px] transition-colors ${openMenuId === itemId ? 'bg-white/10 text-white border-white/20' : 'bg-transparent hover:bg-white/5 text-gray-200'}`}
          >
            <MoreHorizontal size={18} />
          </button>
          {openMenuId === itemId && (
            <div className="absolute right-0 top-full mt-1 w-[140px] bg-[#121212] border border-[#333] shadow-2xl z-50 py-1 animate-in fade-in zoom-in duration-150">
              <div
                onClick={() => { setEditingProfile(item); setOpenMenuId(null); }}
                className="px-4 py-2 hover:bg-minecraft-green hover:text-white cursor-pointer transition-colors text-[13px] font-bold text-[#dedede]"
              >
                Edit
              </div>
              <div
                onClick={() => { handleDuplicate(item); setOpenMenuId(null); }}
                className="px-4 py-2 hover:bg-minecraft-green hover:text-white cursor-pointer transition-colors text-[13px] font-bold text-[#dedede]"
              >
                Duplicate
              </div>
              <div className="h-px bg-[#333] my-1" />
              <div
                onClick={() => { handleDelete(item); setOpenMenuId(null); }}
                className="px-4 py-2 hover:bg-red-600 hover:text-white cursor-pointer transition-colors text-[13px] font-bold text-[#dedede]"
              >
                Delete
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JavaItem;
