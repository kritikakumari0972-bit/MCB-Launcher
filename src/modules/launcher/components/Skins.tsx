import React, { useState } from "react";
import SkinViewer from "@shared/components/SkinViewer";
import AddSkin from "@shared/components/AddSkin";
import { Plus, Info } from "lucide-react";

interface SkinsProps {
  userData: { name: string, type: string, avatar: string };
  refreshKey?: number;
  onReload?: () => void;
}

const Skins: React.FC<SkinsProps> = ({ userData, refreshKey = 0, onReload }) => {
  const [view, setView] = useState<"library" | "add">("library");
  const skinUrl = userData.avatar || "/skin_ex.png";
  const librarySkins = [
    { name: "Krismas Shikuuz", image: "/body.png" },
    { name: "Shikuuz", image: "/body.png" },
    { name: "Spooky Shikuuz", image: "/body.png" },
    { name: "Alex", image: "/alex.png" },
    { name: "Steve", image: "/steve.png" },
  ];

  if (view === "add") {
    return <AddSkin onBack={() => setView("library")} />;
  }

  const handleReload = () => {
    if (onReload) onReload();
  };

  return (
    <div className="p-10 text-white font-sans bg-[#2e2e2e] min-h-screen select-none animate-in fade-in duration-300">
      {/* Coming Soon Banner - Minimal badge version */}
      <div className="mb-6 bg-[#eab308] text-black py-0.5 px-3 flex items-center justify-center gap-1.5 rounded-[1px] shadow-[inset_0_-1px_0_rgba(0,0,0,0.2)] border border-[#a16207]/40 w-fit mx-auto">
        <Info size={12} strokeWidth={3} className="opacity-90" />
        <span className="font-bold text-[10px] uppercase tracking-wider">
          Skins feature coming soon
        </span>
      </div>

      <div className="flex gap-16">
        {/* Current Skin Section */}
        <div className="flex flex-col items-center min-w-[300px]">
          <h2 className="text-[17px] font-bold mb-10 text-[#f0f0f0]">Current</h2>
          <div className="w-[220px] h-[380px] flex items-center justify-center drop-shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
            <SkinViewer
              skinUrl={skinUrl}
              width={220}
              height={380}
              refreshKey={refreshKey}
              className="h-full object-contain"
            />
          </div>
          <button 
            onClick={handleReload}
            className="mt-8 px-6 py-2 bg-[#38873c] hover:bg-[#4caf50] text-white text-[13px] font-bold rounded-[1px] shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-px transition-all"
          >
            Reload
          </button>
        </div>

        {/* Divider */}
        <div className="w-px bg-[#2a2a2a] h-[450px] mt-8 opacity-50" />

        {/* Library Section */}
        <div className="flex-1 px-10 flex flex-col items-center">
          <h2 className="text-[17px] font-bold mb-10 text-[#f0f0f0]">Library</h2>

          <div className="flex flex-wrap justify-center gap-x-12 gap-y-16">
            {/* New Skin Button */}
            <div
              className="flex flex-col items-center gap-4 group cursor-pointer w-[100px]"
              onClick={() => setView("add")}
            >
              <div className="mt-[28px]"> {/* Align with images instead of text */}
                <div className="w-14 h-14 rounded-full border-2 border-gray-400 flex items-center justify-center group-hover:border-white transition-colors text-center">
                  <Plus size={32} className="text-gray-400 group-hover:text-white transition-colors" />
                </div>
              </div>
              <span className="text-[12px] font-bold text-gray-400 group-hover:text-white transition-colors text-center">New skin</span>
            </div>

            {librarySkins.map((skin, index) => (
              <div key={index} className="flex flex-col items-center gap-4 group cursor-pointer w-[120px]">
                <span className="text-[12px] font-bold text-gray-400 group-hover:text-white transition-colors text-center leading-tight">
                  {skin.name}
                </span>
                <div className="h-[140px] w-full flex items-center justify-center relative">
                  <img
                    src={skin.image}
                    alt={skin.name}
                    className={`h-full object-contain transition-all duration-300 group-hover:brightness-50 ${skin.name === "Steve" || skin.name === "Alex" ? "opacity-60 group-hover:opacity-100" : ""}`}
                  />

                  {/* Hover Overlay Buttons */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 px-2 pt-2">
                    <button className="w-full bg-[#38873c] hover:bg-[#4caf50] text-white text-[11px] font-bold py-1.5 rounded-[1px] shadow-lg transition-colors">
                      Use
                    </button>
                    <button className="w-full bg-[#121212]/80 border border-[#555] hover:bg-[#333] text-white text-[11px] font-bold py-1 px-1 rounded-[1px] transition-colors">
                      Duplicate
                    </button>
                    <button className="w-full bg-[#121212]/80 border border-[#555] hover:bg-[#333] text-white text-[11px] font-bold py-1 px-1 rounded-[1px] transition-colors">
                      Slim Skin
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Skins;
