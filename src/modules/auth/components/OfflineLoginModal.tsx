import React, { useState, useEffect, useRef } from "react";

interface OfflineLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (username: string) => void;
}

const OfflineLoginModal: React.FC<OfflineLoginModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [username, setUsername] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUsername("");
      setError(false);
      // Small timeout to ensure the modal is rendered before focusing
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!username.trim()) {
      setError(true);
      return;
    }
    onConfirm(username);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirm();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className="relative bg-[#2b2b2b] w-full max-w-[680px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col border border-white/5 rounded-[2px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header/Body Section */}
        <div className="p-8 pb-10">
          <h2 className="text-white text-[24px] font-bold mb-8">
            Enter a username for Minecraft Java edition
          </h2>

          <div className="flex flex-col gap-1.5 pt-2">
            <label className="text-[#a1a1a1] text-[11px] font-black tracking-wider uppercase mb-1">
              USERNAME:
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (e.target.value.trim()) setError(false);
                }}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                spellCheck="false"
                className={`
                  w-full bg-[#111111] border-2 p-3 text-white text-[16px] outline-none transition-all
                  ${error ? 'border-[#ff4d4d]' : 'border-[#444444] focus:border-white'}
                `}
              />
              {/* Caret/Focus indicator hack if needed, but standard focus works well */}
            </div>

            {error && (
              <p className="text-[#ff4d4d] text-[14px] mt-1 font-medium">
                Username is required.
              </p>
            )}

            <p className="text-[#d0d0d0] text-[15px] mt-3 opacity-90">
              You have to pick a username before you can play Minecraft Java.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#212121]  p-5 flex justify-end gap-3.5 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-8 py-2.5 bg-[#444444] cursor-pointer hover:bg-[#555555] text-white font-bold text-[15px] transition-colors min-w-[130px] border border-transparent active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-8 py-2.5 bg-[#187e3f] cursor-pointer hover:bg-[#1a8b46] text-white font-bold text-[15px] transition-colors min-w-[130px] border border-transparent active:scale-[0.98]"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfflineLoginModal;
