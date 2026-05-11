import React from "react";
import "./LoadingOverlay.css";

interface LoadingOverlayProps {
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = "Loading" }) => {
  return (
    <div className="fixed inset-0 z-11000 flex items-center justify-center bg-black/90 animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-12">
        <div className="loader-canvas">
          <div className="cube cube-static"></div>
          <div className="cube drop-1"></div>
          <div className="cube drop-2"></div>
          <div className="cube drop-3"></div>
          <div className="cube shrinking-cube"></div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[28px] text-white tracking-[3px] font-mcten uppercase">
            {message}
          </span>
          <div className="flex gap-1 items-end pb-1.5">
            <span className="loading-dot w-1.5 h-1.5 bg-white"></span>
            <span className="loading-dot w-1.5 h-1.5 bg-white [animation-delay:0.2s]"></span>
            <span className="loading-dot w-1.5 h-1.5 bg-white [animation-delay:0.4s]"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
