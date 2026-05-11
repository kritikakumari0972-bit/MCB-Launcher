import React, { useState } from "react";
import { X, HelpCircle } from "lucide-react";
import SkinViewer from "./SkinViewer";

interface AddSkinProps {
  onBack: () => void;
}

const AddSkin: React.FC<AddSkinProps> = ({ onBack }) => {
  const [name, setName] = useState("unnamed skin");
  const [playerModel, setPlayerModel] = useState<"classic" | "slim">("classic");

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#2e2e2e] animate-in slide-in-from-right-10 duration-300">
      {/* Header */}
      <div className="flex items-center justify-center py-5 border-b border-white/5 relative bg-[#2e2e2e]">
        <h2 className="text-white text-[15px] font-bold uppercase tracking-wider">Add new skin</h2>
        <button
          onClick={onBack}
          className="absolute right-10 hover:bg-white/10 p-1 transition-colors text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-[1000px] mx-auto flex p-10 gap-16">
          {/* Left Side: Skin Preview */}
          <div className="flex-1 flex items-center justify-center pt-10">
            <div className="w-[300px] h-[450px] drop-shadow-[0_15px_45px_rgba(0,0,0,0.7)]">
              <SkinViewer
                skinUrl="/steve_skin.png"
                width={300}
                height={450}
              />
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="flex-1 flex flex-col gap-8 text-white font-sans pt-5">
            {/* Name Input */}
            <div className="flex flex-col gap-2.5">
              <label className="text-[11px] font-extrabold uppercase tracking-tight text-gray-400">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#1a1a1a] border border-[#555] px-3.5 py-2 text-[14px] focus:border-white/40 focus:outline-none transition-colors w-full"
              />
            </div>

            {/* Player Model Selection */}
            <div className="flex flex-col gap-3.5">
              <label className="text-[11px] font-extrabold uppercase tracking-tight text-gray-400">Player Model</label>
              <div className="flex gap-8">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${playerModel === 'classic' ? 'border-minecraft-green bg-minecraft-green' : 'border-gray-500 group-hover:border-white'}`}>
                    {playerModel === 'classic' && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                  </div>
                  <input
                    type="radio"
                    className="hidden"
                    checked={playerModel === 'classic'}
                    onChange={() => setPlayerModel('classic')}
                  />
                  <span className={`text-[14px] transition-colors ${playerModel === 'classic' ? 'text-white font-bold' : 'text-gray-400 group-hover:text-white'}`}>Classic</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${playerModel === 'slim' ? 'border-minecraft-green bg-minecraft-green' : 'border-gray-500 group-hover:border-white'}`}>
                    {playerModel === 'slim' && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                  </div>
                  <input
                    type="radio"
                    className="hidden"
                    checked={playerModel === 'slim'}
                    onChange={() => setPlayerModel('slim')}
                  />
                  <span className={`text-[14px] transition-colors ${playerModel === 'slim' ? 'text-white font-bold' : 'text-gray-400 group-hover:text-white'}`}>Slim</span>
                </label>
              </div>
            </div>

            {/* Skin File */}
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-extrabold uppercase tracking-tight text-gray-400">Skin File</label>
                <HelpCircle size={13} className="text-gray-500" />
              </div>
              <button className=" border border-[#555] hover:bg-[#333] transition-colors text-[13px] font-bold py-1.5 px-8 w-fit rounded-[1px]">
                Browse
              </button>
            </div>

            {/* Cape Info */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-gray-400">
                <label className="text-[11px] font-extrabold uppercase tracking-tight">Cape</label>
                <HelpCircle size={13} />
              </div>
              <p className="text-[12.5px] text-gray-500 leading-relaxed max-w-[360px]">
                No capes available. Capes are special rewards players can unlock through different events, campaigns and other happy happenings.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="flex justify-end gap-3 px-10 py-5 bg-[#252525] border-t border-white/5">
        <button
          onClick={onBack}
          className=" border border-[#555] hover:bg-[#333] transition-colors text-white text-[13px] font-bold py-1.5 px-10 rounded-[1px]"
        >
          Cancel
        </button>
        <button className=" border border-[#555] hover:bg-[#333] transition-colors text-white text-[13px] font-bold py-1.5 px-12 rounded-[1px]">
          Save
        </button>
        <button className="bg-[#43a047] hover:bg-[#4caf50] transition-colors text-white text-[13px] font-bold py-1.5 px-12 rounded-[1px] shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)]">
          Save & Use
        </button>
      </div>
    </div>
  );
};

export default AddSkin;
