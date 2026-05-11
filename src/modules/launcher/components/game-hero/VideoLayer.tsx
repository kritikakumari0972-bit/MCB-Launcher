import React from "react";
import { ExternalLink, Volume2, VolumeX, X } from "lucide-react";

interface VideoLayerProps {
  isPlayingVideo: boolean;
  shouldRenderVideo: boolean;
  isMuted: boolean;
  videoId: string;
  onStopVideo: () => void;
  onToggleMute: () => void;
  onOpenInYoutube: () => void;
  onStartVideo: () => void;
  isDropdownOpen: boolean;
}

const VideoLayer: React.FC<VideoLayerProps> = ({
  isPlayingVideo, shouldRenderVideo, isMuted, videoId,
  onStopVideo, onToggleMute, onOpenInYoutube, onStartVideo, isDropdownOpen
}) => {
  return (
    <>
      {/* Video iframe layer */}
      <div className={`absolute inset-0 z-10 transition-opacity duration-[1200ms] ${isPlayingVideo ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {shouldRenderVideo && (
          <>
            <iframe
              className="absolute inset-0 w-[140%] h-[140%] left-[-20%] top-[-20%] object-cover pointer-events-none select-none"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&modestbranding=1&rel=0&loop=1&playlist=${videoId}&iv_load_policy=3&showinfo=0&disablekb=1&fs=0&origin=${window.location.origin}`}
              title="Minecraft Game Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            <div className="absolute inset-0 z-20 pointer-events-auto" />
          </>
        )}
      </div>

      {/* Video Controls */}
      <div className={`absolute left-6 bottom-[100px] flex items-center gap-1.5 z-50 transition-opacity duration-200 ${isDropdownOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {!isPlayingVideo ? (
          <button
            onClick={onStartVideo}
            className="w-10 h-10 bg-[#3c3b3b] border-2 border-[#5a5959] shadow-[2px_2px_0px_#000] flex items-center justify-center hover:bg-[#4c4b4b] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
            title="Play Preview Video"
          >
            <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1" />
          </button>
        ) : (
          <>
            <button
              onClick={onOpenInYoutube}
              className="w-10 h-10 bg-[#3c3b3b] border-2 border-[#5a5959] shadow-[2px_2px_0px_#000] flex items-center justify-center hover:bg-[#4c4b4b] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
              title="Open in YouTube"
            >
              <ExternalLink size={18} />
            </button>
            <button
              onClick={onToggleMute}
              className="w-10 h-10 bg-[#3c3b3b] border-2 border-[#5a5959] shadow-[2px_2px_0px_#000] flex items-center justify-center hover:bg-[#4c4b4b] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button
              onClick={onStopVideo}
              className="w-10 h-10 bg-[#3c3b3b] border-2 border-[#5a5959] shadow-[2px_2px_0px_#000] flex items-center justify-center hover:bg-[#4c4b4b] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
              title="Close Video"
            >
              <X size={20} />
            </button>
          </>
        )}
      </div>
    </>
  );
};

export default VideoLayer;
