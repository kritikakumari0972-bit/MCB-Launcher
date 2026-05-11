import React from "react";
import "./LoadingOverlay.css";

interface CubeLoaderProps {
  message?: string;
  scale?: number;
}

const CubeLoader: React.FC<CubeLoaderProps> = ({ message, scale = 1 }) => {
  return (
    <div 
      className="flex flex-col items-center gap-6 animate-in fade-in duration-500"
      style={{ transform: `scale(${scale})` }}
    >
      <div className="loader-canvas">
        <div className="cube cube-static"></div>
        <div className="cube drop-1"></div>
        <div className="cube drop-2"></div>
        <div className="cube drop-3"></div>
        <div className="cube shrinking-cube"></div>
      </div>
      {message && (
        <div className="flex items-center gap-1">
          <span className="text-[18px] text-white/60 tracking-[2px] font-bold uppercase">
            {message}
          </span>
          <div className="flex gap-1 items-end pb-1">
            <span className="loading-dot w-1.5 h-1.5 bg-white/60"></span>
            <span className="loading-dot w-1.5 h-1.5 bg-white/60 [animation-delay:0.2s]"></span>
            <span className="loading-dot w-1.5 h-1.5 bg-white/60 [animation-delay:0.4s]"></span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CubeLoader;
