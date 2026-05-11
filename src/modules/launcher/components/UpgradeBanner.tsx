import React, { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";

interface UpgradeBannerProps {
  onUpgrade?: () => void;
  onCancel?: () => void;
}

interface UpdateInfo {
  updateAvailable: boolean;
  latestVersion?: {
    versionName: string;
    versionCode: number;
    isForce: boolean;
    downloadUrl: string;
    portableUrl?: string;
    changelog: string;
  };
}

const UpgradeBanner: React.FC<UpgradeBannerProps> = ({ onUpgrade, onCancel }) => {
  const [updateData, setUpdateData] = useState<UpdateInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL;
        const currentCode = import.meta.env.VITE_VERSION_CODE || "0";

        const response = await fetch(`${baseUrl}/api/updates/check?platform=pc&currentVersionCode=${currentCode}`);
        const data: UpdateInfo = await response.json();

        setUpdateData(data);

        if (!data.updateAvailable && onCancel) {
          onCancel();
        }
      } catch (error) {
        console.error("Failed to check for updates:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUpdate();
  }, []);

  const handleUpgrade = async () => {
    if (updateData?.latestVersion?.downloadUrl) {
      await openUrl(updateData.latestVersion.downloadUrl);
    }
    if (onUpgrade) onUpgrade();
  };

  if (loading || !updateData?.updateAvailable) {
    return null;
  }

  const { isForce } = updateData.latestVersion!;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1a1a1a] w-[810px] p-8 flex flex-col gap-6 shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/5 rounded-[2px] animate-in zoom-in-95 duration-300">
        <div className="flex flex-col gap-2">
          <h2 className="text-[17px] font-bold text-white leading-tight">
            There is a new, improved Launcher! Update to play the latest games.
          </h2>
          <p className="text-[13px] text-text-dim leading-relaxed">
            Upgrade your Minecraft Launcher to have access to all the latest, greatest things in
            the world of Minecraft - including the ability to play Minecraft games via Game Pass for PC!
          </p>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          {!isForce && (
            <button
              onClick={onCancel}
              className="bg-[#d2431d] hover:bg-[#e64a1f] text-white px-10 py-1.5 text-[13px] font-bold rounded-[1px] border border-white/40 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleUpgrade}
            className="bg-minecraft-green hover:bg-minecraft-green-hover text-white px-10 py-1.5 text-[13px] font-bold rounded-[1px] transition-colors"
          >
            Upgrade
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeBanner;
