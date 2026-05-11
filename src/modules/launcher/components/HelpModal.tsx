import React from "react";
import { X, ExternalLink } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";

interface HelpModalProps {
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const sections = [
    {
      title: "Official Mojang Support",
      links: [
        { label: "Minecraft: Tips for Beginners", url: "https://www.minecraft.net/tips-for-beginners" },
        { label: "How do I play Minecraft?", url: "https://www.minecraft.net/how-to-play" },
        { label: "FAQ/Support Center", url: "https://help.minecraft.net/" },
        { label: "Mojang Support on Twitter / X", url: "https://twitter.com/MojangSupport" },
        { label: "Report a Launcher bug", url: "https://bugs.mojang.com/browse/MCL" },
        { label: "Give feedback: Launcher", url: "https://feedback.minecraft.net/hc/en-us/community/topics/360001095132-Launcher" },
        { label: "Give feedback: Minecraft Dungeons", url: "https://feedback.minecraft.net/hc/en-us/community/topics/360001095112-Minecraft-Dungeons" },
        { label: "Give feedback: Minecraft: Java Edition Snapshots", url: "https://feedback.minecraft.net/hc/en-us/community/topics/360000155011-Java-Edition-Snapshots" },
      ],
    },
    {
      title: "Social Media",
      links: [
        { label: "Twitter / X", url: "https://twitter.com/minecraft" },
        { label: "Facebook", url: "https://facebook.com/minecraft" },
        { label: "Instagram", url: "https://instagram.com/minecraft" },
        { label: "YouTube", url: "https://youtube.com/minecraft" },
        { label: "WhatsApp", url: "https://whatsapp.com/channel/0029Va4m1E97oQhaXitx5t39" },
      ],
    },
    {
      title: "Community Driven Sites",
      links: [
        { label: "Minecraft Wiki", url: "https://minecraft.wiki" },
        { label: "Planet Minecraft", url: "https://www.planetminecraft.com/" },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-[2000] bg-[#121212] flex flex-col text-white font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-white/5 bg-[#1a1a1a] select-none">
        <div className="flex-1" />
        <h1 className="text-sm font-bold uppercase tracking-widest opacity-80">Help</h1>
        <div className="flex-1 flex justify-end">
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#121212]">
        <div className="max-w-[600px] mx-auto py-16 px-6">
          <div className="flex flex-col gap-12 text-center">
            {sections.map((section, sIdx) => (
              <div key={sIdx} className="flex flex-col gap-4">
                <h2 className="text-[11px] font-black uppercase tracking-[2px] text-white/40 mb-2">
                  {section.title}
                </h2>
                <div className="flex flex-col gap-1">
                  {section.links.map((link, lIdx) => (
                    <button
                      key={lIdx}
                      onClick={() => openUrl(link.url)}
                      className="group flex items-center justify-center gap-3 py-2 px-4 text-[14px] font-semibold text-[#dedede] hover:text-white hover:bg-minecraft-green transition-all duration-100 rounded-[1px]"
                    >
                      <span>{link.label}</span>
                      <ExternalLink size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
