import React from "react";

interface MinecraftHeaderProps {
  title: string;
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

interface TabItemProps {
  tab: string;
  isActive: boolean;
  onClick: (tab: string) => void;
}

const TabItem: React.FC<TabItemProps> = ({ tab, isActive, onClick }) => {
  return (
    <div
      className={`text-[14px] font-bold pb-2.5 cursor-pointer transition-colors relative ${isActive ? "text-white" : "text-text-dim hover:text-white"
        }`}
      onClick={() => onClick(tab)}
    >
      {tab}
      {/* Active Indicator Bar - Grows from middle and spreads left/right */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '20%',
          width: '60%',
          height: '3px',
          backgroundColor: '#38873c',
          transformOrigin: 'center',
          transform: `scaleX(${isActive ? 1 : 0})`,
          transition: 'transform 150ms ease',
        }}
      />
    </div>
  );
};

const MinecraftHeader: React.FC<MinecraftHeaderProps> = ({
  title,
  tabs,
  activeTab,
  onTabChange,
  className
}) => {
  return (
    <header className={`px-10 pt-6 ${className || "bg-main-bg"}`}>
      <div className="title-section">
        <h1 className="text-[11px] font-extrabold text-white uppercase tracking-tighter mb-4">{title}</h1>
      </div>
      <nav className="flex gap-6">
        {tabs.map((tab) => (
          <TabItem
            key={tab}
            tab={tab}
            isActive={activeTab === tab}
            onClick={onTabChange}
          />
        ))}
      </nav>
    </header>
  );
};

export default MinecraftHeader;
