import React from "react";
import { X, ExternalLink } from "lucide-react";

interface MemoryWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  requiredRam: number;
  availableRam: number;
}

const MemoryWarningModal: React.FC<MemoryWarningModalProps> = ({ isOpen, onClose, onConfirm, requiredRam, availableRam }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        className="relative bg-[#2b2b2b] w-full max-w-[680px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col border border-white/5 rounded-[2px] animate-in fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 pb-10 flex flex-col gap-6">
          <p className="text-white text-[18px] leading-relaxed font-medium">
            Your system has <span className="text-red-400 font-bold">{availableRam} MB</span> of available RAM, which is less than the <span className="text-white font-bold">{requiredRam} MB</span> allocated for this installation.
          </p>

          <div className="flex flex-col gap-1">
            <p className="text-white text-[18px] leading-relaxed font-medium">
              Running the game with insufficient memory may cause crashes or significant performance issues.
              <a 
                href="#" 
                onClick={(e) => e.preventDefault()}
                className="inline-flex items-center gap-1.5 ml-2 p-1 px-2 bg-white/10 hover:bg-white/20 transition-colors rounded-[1px] text-white border-b border-white/40 text-[14px]"
              >
                Learn more about memory allocation <ExternalLink size={16} />
              </a>
            </p>
          </div>

          <p className="text-[#999] text-[15px]">
            Please close other applications to free up memory, or reduce the allocated RAM in the installation settings.
          </p>
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
            Launch Anyway
          </button>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[#999] hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default MemoryWarningModal;

