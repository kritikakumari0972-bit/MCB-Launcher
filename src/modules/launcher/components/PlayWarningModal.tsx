import React, { useState } from "react";
import { ExternalLink, Check } from "lucide-react";

interface PlayWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const PlayWarningModal: React.FC<PlayWarningModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [dontWarnAgain, setDontWarnAgain] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center animate-fade-in p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        className="relative bg-[#2b2b2b] w-full max-w-[680px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col border border-white/5 rounded-[2px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 pb-10 flex flex-col gap-6">
          <p className="text-white text-[18px] leading-relaxed font-medium">
            You are about to play a Minecraft: Java Edition installation that has been modified. We can't guarantee the game will support the latest player safety features.
          </p>

          <div className="flex flex-col gap-1">
            <p className="text-white text-[18px] leading-relaxed font-medium">
              To access these features, play a more recent version of Minecraft: Java Edition without mods.
              <a 
                href="#" 
                className="inline-flex items-center gap-1.5 ml-2 p-1 px-2 bg-white/10 hover:bg-white/20 transition-colors rounded-[1px] text-white border-b border-white/40"
              >
                Read more about player safety features <ExternalLink size={16} />
              </a>
            </p>
          </div>

          <label className="flex items-center gap-3 mt-4 cursor-pointer group">
            <div 
              onClick={() => setDontWarnAgain(!dontWarnAgain)}
              className={`
                w-[22px] h-[22px] rounded-[2px] flex items-center justify-center border-2 transition-colors
                ${dontWarnAgain ? 'bg-transparent border-[#888]' : 'bg-transparent border-[#888]'}
              `}
            >
              {dontWarnAgain && <Check size={16} className="text-white" strokeWidth={4} />}
            </div>
            <span className="text-white text-[16px] font-medium">
              I understand the risks. Don't warn me again about this installation.
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#212121] p-5 flex justify-end gap-3.5 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-8 py-2.5 bg-transparent hover:bg-white/5 text-white font-bold text-[15px] transition-colors min-w-[130px] border border-[#555] active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-8 py-2.5 bg-[#187e3f] hover:bg-[#1a8b46] text-white font-bold text-[15px] transition-colors min-w-[130px] border border-transparent active:scale-[0.98]"
          >
            Play
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayWarningModal;
