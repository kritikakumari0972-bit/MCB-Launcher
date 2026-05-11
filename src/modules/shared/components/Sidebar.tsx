import React from "react";
import {
  ChevronDown,
  Check
} from "lucide-react";
import PlayerAvatar from "./PlayerAvatar";

interface NavItemProps {
  id: string;
  label?: string;
  icon: React.ReactNode;
  sublabel?: string;
  isEdition?: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

// IMPORTANT: NavItem must be defined OUTSIDE Sidebar.
// If defined inside, React creates a new component type on each render,
// causing full unmount/remount → CSS transitions never fire.
const NavItem: React.FC<NavItemProps> = ({ id, label, icon, sublabel, isEdition = false, activeTab, setActiveTab }) => {
  const isActive = activeTab === id;
  return (
    <div
      className={`relative flex items-center px-4 py-2.5 gap-3 cursor-pointer transition-colors duration-200 text-[#dedede] hover:bg-[#3e3e3e] hover:text-white ${isActive ? "bg-[#444444] text-white" : ""}`}
      onClick={() => setActiveTab(id)}
    >
      {/* Active Indicator Bar — mirrors HTML/CSS demo exactly */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          width: '4px',
          height: '60%',
          background: 'white',
          transformOrigin: 'center',
          transform: `translateY(-50%) scaleY(${isActive ? 1 : 0})`,
          transition: 'transform 150ms ease',
          borderRadius: '0 2px 2px 0',
        }}
      />
      <div className="flex items-center gap-3">
        {icon}
        {isEdition ? (
          <span className={`text-[12px] leading-tight ${isActive ? "font-bold text-white" : ""}`}>
            {label}<br /><strong className="text-[14px]">{sublabel}</strong>
          </span>
        ) : (
          <span className={`text-[13px] ${isActive ? "font-bold text-white" : ""}`}>{label}</span>
        )}
      </div>
    </div>
  );
};

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onToggleLogs: () => void;
  onOpenAccounts: () => void;
  onOpenHelp: () => void;
  userData: { name: string, type: string, avatar: string };
  refreshKey?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onToggleLogs, onOpenAccounts, onOpenHelp, userData, refreshKey = 0 }) => {
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfileMenu]);

  return (
    <aside className="w-[200px] bg-[#222222] flex flex-col h-screen border-r border-[#1a1a1a] text-white py-3 select-none relative z-50">
      {/* Profile Header */}
      <div
        onClick={() => setShowProfileMenu(!showProfileMenu)}
        className="flex items-center px-4 py-2 gap-3 cursor-pointer mb-5 hover:bg-[#3e3e3e] relative"
      >
        <PlayerAvatar skinUrl={userData.avatar || "/skin_ex.png"} size={32} className="rounded-sm" refreshKey={refreshKey} />
        <div className="flex flex-col flex-1">
          <span className="text-sm font-semibold">{userData.name}</span>
          <span className="text-[11px] text-text-dim">{userData.type}</span>
        </div>
        <ChevronDown size={14} className={`text-text-dim transition-transform duration-200 ${showProfileMenu ? "rotate-180" : ""}`} />
      </div>

      {/* Profile Dropdown Menu */}
      {showProfileMenu && (
        <div
          ref={menuRef}
          className="absolute top-[55px] left-0 w-full bg-[#323232] shadow-2xl py-2 z-50 border border-white/50 animate-menu-slide"
        >
          <div className="flex flex-col">
            <button
              onClick={() => { onOpenHelp(); setShowProfileMenu(false); }}
              className="px-5 py-3 text-left hover:bg-white/5 transition-colors"
            >
              <span className="text-[11px] font-extrabold uppercase tracking-tighter">Help</span>
            </button>
            <button
              className="px-5 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5"
              onClick={async () => {
                const { invoke } = await import("@tauri-apps/api/core");
                await invoke("logout_secure_user");
                window.location.reload();
              }}
            >
              <span className="text-[11px] font-extrabold uppercase tracking-tighter">Log Out</span>
            </button>

            <div className="px-3 py-3 mt-2">
              <div className="px-2 py-2 bg-white/5 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all">
                <div className="flex items-center gap-3">
                  <PlayerAvatar skinUrl={userData.avatar || "/skin_ex.png"} size={24} className="rounded-sm" refreshKey={refreshKey} />
                  <span className="text-[12px] font-bold">{userData.name}</span>
                </div>
                <Check size={14} className="text-minecraft-green" />
              </div>
            </div>

            <button
              onClick={() => { onOpenAccounts(); setShowProfileMenu(false); }}
              className="px-5 py-3 text-left hover:bg-white/5 transition-colors mb-1"
            >
              <span className="text-[11px] font-extrabold uppercase tracking-tighter">View All Accounts</span>
            </button>
          </div>
        </div>
      )}

      <nav className="flex-1 flex flex-col">
        <NavItem id="news" label="Home" icon={<img src="/home.png" alt="News" className="w-7 h-7 object-contain" />} activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="h-px bg-[#444444] my-3" />

        <NavItem
          id="java"
          label="MINECRAFT:"
          sublabel="Java Edition"
          isEdition={true}
          icon={<img src="/ic_java.png" alt="Java Edition" className="w-6 h-6 object-contain" />}
          activeTab={activeTab} setActiveTab={setActiveTab}
        />

        <NavItem
          id="windows"
          label="MINECRAFT"
          sublabel="for Windows"
          isEdition={true}
          icon={<img src="/grass_icon.png" alt="Bedrock Edition" className="w-6 h-6 object-contain" />}
          activeTab={activeTab} setActiveTab={setActiveTab}
        />

        <NavItem
          id="dungeons"
          label="MINECRAFT"
          sublabel="Dungeons"
          isEdition={true}
          icon={<img src="/dungeons_icon.png" alt="Bedrock Edition" className="w-6 h-6 object-contain" />}
          activeTab={activeTab} setActiveTab={setActiveTab}
        />
      </nav>

      <div className="mt-auto">
        <div
          onClick={onToggleLogs}
          className="flex items-center px-4 py-2.5 gap-3 cursor-pointer transition-colors duration-200 text-[#dedede] hover:bg-[#3e3e3e] hover:text-white"
        >
          <img src="/ic_news.png" alt="What's new" className="w-7 h-7 object-contain opacity-70" />
          <span className="text-[13px]">What's new</span>
        </div>
        <NavItem id="settings" label="Settings" icon={<img src="ic_settings.png" alt="Settings" className="w-7 h-7 object-contain" />} activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="px-4 opacity-50">
          <span className="text-[14px] text-text-dim">v1.0.0-Beta</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
