import React from "react";

interface DownloadProgressBarProps {
  progress: number; // 0 to 100
  totalSize?: string;
  downloadedSize?: string;
  message?: string;
  status?: string;
  isVisible: boolean;
  onClose?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  isPaused?: boolean;
}

const DownloadProgressBar: React.FC<DownloadProgressBarProps> = ({ 
  progress, 
  totalSize, 
  downloadedSize,
  message,
  status,
  isVisible,
  onClose,
  onPause,
  onResume,
  onCancel,
  isPaused
}) => {
  if (!isVisible) return null;

  // Use message if provided, otherwise format from downloadedSize/totalSize
  const displayText = message || (downloadedSize && totalSize ? `Downloading ${downloadedSize} / ${totalSize}` : (downloadedSize || "Please wait..."));

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 bg-[#1a1a1a] border-t border-white/5 p-1 px-4 h-[40px] flex items-center">
      <div className="relative w-full h-[28px] bg-[#111111] overflow-hidden">
        {/* Progress Fill */}
        <div 
          className={`absolute inset-0 transition-all duration-300 ease-out ${status === "error" ? "bg-red-600" : "bg-minecraft-green"}`}
          style={{ width: `${progress}%` }}
        />
        
        {/* Text Overlay */}
        <div className="absolute inset-0 flex items-center px-3 z-10">
          <span className="text-white text-[12px] font-bold drop-shadow-md">
            {displayText}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {(status === "downloading" || status === "verifying") && (
              <>
                {isPaused ? (
                  <button 
                    onClick={onResume}
                    className="text-white/70 hover:text-white flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-0.5 transition-colors"
                    title="Resume"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                ) : (
                  <button 
                    onClick={onPause}
                    className="text-white/70 hover:text-white flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-0.5  transition-colors"
                    title="Pause"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  </button>
                )}
                <button 
                  onClick={onCancel}
                  className="text-white/70 hover:text-red-500 flex items-center gap-1 bg-white/10 hover:bg-red-500/20 px-2 py-0.5 transition-colors"
                  title="Cancel"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </>
            )}
            {status === "error" && onClose && (
              <button 
                onClick={onClose}
                className="text-white/50 hover:text-white text-[10px] font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 px-2 py-0.5"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadProgressBar;
