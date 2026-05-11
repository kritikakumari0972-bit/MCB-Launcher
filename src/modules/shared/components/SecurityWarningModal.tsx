import React from "react";

interface SecurityWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SecurityWarningModal: React.FC<SecurityWarningModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center animate-in fade-in duration-300 p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" 
        onClick={onClose}
      />
      
      {/* Modal Container: Styled as the snippet provided */}
      <div className="bg-[#1a1a1a] w-full max-w-[810px] p-8 flex flex-col gap-6 shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/5 rounded-[2px] animate-in zoom-in-95 duration-300 relative">
        
        <div className="flex flex-col gap-2">
          <h2 className="text-[17px] font-bold text-white leading-tight uppercase tracking-wide">
            Security Alert: Authentication Data Compromised
          </h2>
          <p className="text-[13px] text-gray-400 leading-relaxed">
            The authentication data has been tampered with or modified outside of the application. 
            To ensure your account security, this session has been terminated and your local auth files have been cleared.
          </p>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button 
            onClick={() => {
                // In a real scenario, we might want to close the app
                onClose();
            }}
            className="bg-[#d2431d] hover:bg-[#e64a1f] text-white px-10 py-1.5 text-[13px] font-bold rounded-[1px] border border-white/40 transition-colors uppercase"
          >
            Acknowledge
          </button>
          <button 
            onClick={onClose}
            className="bg-[#3c8527] hover:bg-[#4ea333] text-white px-10 py-1.5 text-[13px] font-bold rounded-[1px] transition-colors uppercase"
          >
            Log In Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecurityWarningModal;
