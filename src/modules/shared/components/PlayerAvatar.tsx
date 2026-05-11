import React from "react";

interface PlayerAvatarProps {
  skinUrl: string;
  size?: number;
  className?: string;
  refreshKey?: number;
}

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ skinUrl, size = 32, className = "", refreshKey = 0 }) => {
  // Stabilize URL to prevent flickering on re-renders, but allow refresh via key
  const finalUrl = React.useMemo(() => {
    if (skinUrl.startsWith("http")) {
      // Use refreshKey as a stable cache buster. 
      // It only changes when the user explicitly clicks Reload.
      return `${skinUrl}?t=${refreshKey}`;
    }
    return skinUrl;
  }, [skinUrl, refreshKey]);

  const scale = size / 8; // mỗi pixel skin = scale px thật

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "transparent",
    borderRadius: "2px",
    imageRendering: "pixelated",
  };

  const imgStyle = (srcX: number, srcY: number): React.CSSProperties => ({
    position: "absolute",
    top: 0,
    left: 0,
    width: size,
    height: size,
    backgroundImage: `url(${finalUrl})`,
    backgroundSize: `${64 * scale}px ${64 * scale}px`,  // scale toàn bộ ảnh
    backgroundPosition: `-${srcX * scale}px -${srcY * scale}px`, // offset chính xác
    imageRendering: "pixelated",
  });

  return (
    <div style={containerStyle} className={className}>
      <div style={imgStyle(8, 8)} />   {/* Base face */}
      <div style={imgStyle(40, 8)} />  {/* Hat layer */}
    </div>
  );
};

export default PlayerAvatar;
