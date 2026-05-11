import React, { useEffect, useRef, useState } from "react";
import * as skinview3d from "skinview3d";
import { invoke } from "@tauri-apps/api/core";
import CubeLoader from "./CubeLoader";

// Module-level cache: URL -> base64 data URL
// Persists across tab switches, cleared only on full app reload
const skinCache = new Map<string, string>();

interface SkinViewerProps {
  skinUrl: string;
  width?: number;
  height?: number;
  className?: string;
  refreshKey?: number; // Used to force bypass cache
}

const SkinViewer: React.FC<SkinViewerProps> = ({
  skinUrl,
  width = 300,
  height = 400,
  className = "",
  refreshKey = 0
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<skinview3d.SkinViewer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    let objectUrl: string | null = null;
    let viewer: skinview3d.SkinViewer | null = null;

    const initViewer = async () => {
      if (!canvasRef.current) return;
      setLoading(true);

      // Create viewer first without skin
      viewer = new skinview3d.SkinViewer({
        canvas: canvasRef.current,
        width: width,
        height: height,
      });

      viewer.autoRotate = false;
      viewer.autoRotateSpeed = 0.5;
      viewer.animation = new skinview3d.WalkingAnimation();
      viewer.animation.speed = 0.5;
      viewer.controls.enableZoom = false;
      viewerRef.current = viewer;

      // Load skin: use Rust backend for external URLs to bypass browser CORS
      if (skinUrl.startsWith("http")) {
        try {
          // If refreshKey is provided, we bypass and clear the cache for this URL
          if (refreshKey > 0) {
            skinCache.delete(skinUrl);
            console.log("[SkinViewer] Cache cleared for:", skinUrl);
          }

          let base64DataUrl = skinCache.get(skinUrl);
          if (base64DataUrl) {
            console.log("[SkinViewer] Skin loaded from cache");
          } else {
            base64DataUrl = await invoke<string>("fetch_image_as_base64", { url: skinUrl });
            skinCache.set(skinUrl, base64DataUrl);
            console.log("[SkinViewer] Skin downloaded and cached");
          }
          await viewer.loadSkin(base64DataUrl);
        } catch (error) {
          console.error("[SkinViewer] Failed to load skin:", error);
        }
      } else {
        await viewer.loadSkin(skinUrl);
      }
      
      setLoading(false);
    };

    initViewer();

    return () => {
      if (viewer) {
        viewer.dispose();
      }
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [skinUrl, width, height, refreshKey]);

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#2e2e2e]/50 backdrop-blur-sm z-10 rounded-lg">
          <CubeLoader scale={0.6} />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-full outline-none"
      />
    </div>
  );
};

export default SkinViewer;
