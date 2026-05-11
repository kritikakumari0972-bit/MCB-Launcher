import React from "react";
import { ChevronDown } from "lucide-react";

interface Profile {
  Id: string;
  Name: string;
  Version: string;
  IconPath?: string;
}

interface ProfileDropdownProps {
  profiles: Profile[];
  selectedProfile: Profile | null;
  onSelect: (p: Profile) => void;
  isVisible: boolean; // false when activeNav === "dungeons"
}

const getIcon = (path?: string) => {
  if (!path || path === "ms-appx:///Assets/Icons/vanilla.png") return "/installation_icons/Grass_Block.png";
  if (path === "ms-appx:///Assets/Icons/fabric.png") return "/installation_icons/Crafting_Table.png";
  return path;
};

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  profiles, selectedProfile, onSelect, isVisible
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {isOpen && (
        <div className="absolute bottom-full left-0 w-full min-w-[250px] max-h-[300px] overflow-y-auto bg-[#161616] shadow-[0_10px_40px_rgba(0,0,0,0.6)] z-50 flex flex-col border border-white/5 custom-scrollbar">
          {profiles.map((inst) => {
            const isSelected = selectedProfile?.Id === inst.Id;
            return (
              <div
                key={inst.Id}
                onClick={() => { onSelect(inst); setIsOpen(false); }}
                className={`flex items-center gap-4 py-3 px-4 cursor-pointer transition-colors hover:bg-minecraft-green group ${isSelected ? "bg-white/5" : ""}`}
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
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-12 text-white cursor-pointer px-4 py-3 transition-all rounded-[2px] border border-transparent hover:bg-white/5"
        style={{ visibility: isVisible ? "visible" : "hidden" }}
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
        <ChevronDown size={22} className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </div>
    </div>
  );
};

export { getIcon };
export default ProfileDropdown;
