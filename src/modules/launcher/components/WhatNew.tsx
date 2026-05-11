import React from "react";
import { X, ExternalLink } from "lucide-react";
import whatnewData from "./updates_data.json";

interface WhatNewProps {
  onClose: () => void;
}

const WhatNew: React.FC<WhatNewProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-11000 bg-[#1e1e1e] flex flex-col text-white font-sans select-text animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 bg-[#262626] border-b border-[#1a1a1a] select-none">
        <div className="flex-1" />
        <h1 className="text-[14px] font-bold uppercase tracking-widest text-white/80">What's New in the Launcher?</h1>
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
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#181818]">
        <div className="max-w-[850px] mx-auto py-12 px-8">
          <h1 className="text-[28px] font-bold text-center mb-16 text-white tracking-tight">What’s new in the Launcher?</h1>

          <div className="space-y-16 pb-20">
            {whatnewData.map((entry, idx) => (
              <div key={idx} className="flex flex-col gap-6">
                {/* Date Header - Pixel Style */}
                <h2 className="text-[24px] font-bold uppercase tracking-tighter text-white">
                  {entry.date}
                </h2>

                {/* Versions Chips */}
                <div className="flex flex-wrap gap-2">
                  {entry.versions.map((v, vIdx) => (
                    <span key={vIdx} className="bg-[#2a2a2a] px-3 py-1 text-[11px] font-bold text-white/60 rounded-[1px]">
                      {v}
                    </span>
                  ))}
                </div>

                {/* Sections */}
                <div className="flex flex-col gap-8 mt-2">
                  {entry.sections.map((section, sIdx) => (
                    <div key={sIdx} className="flex flex-col gap-4">
                      <h3 className="text-[18px] font-bold text-white">
                        {section.title}
                      </h3>
                      <ul className="list-disc list-outside ml-5 space-y-3">
                        {section.items.map((item, iIdx) => (
                          <li key={iIdx} className="text-[15px] leading-relaxed text-gray-300">
                            {formatText(item)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .font-minecraft {
          font-family: 'MinecraftTen', 'Inter', sans-serif;
        }
      `}</style>
    </div>
  );
};

// Helper to handle links in text (MCL-XXXX and External links)
const formatText = (text: string) => {
  const parts = text.split(/(MCL-\d+|Account Sign-In Support|Launcher Troubleshooting Guide|Mojang Support|Wishlist today)/g);

  return parts.map((part, i) => {
    if (part.match(/MCL-\d+/)) {
      return (
        <a key={i} href="#" className="text-white font-bold underline hover:no-underline inline-flex items-center gap-1 group">
          {part} <ExternalLink size={12} className="opacity-50 group-hover:opacity-100" />
        </a>
      );
    }
    if (["Account Sign-In Support", "Launcher Troubleshooting Guide", "Mojang Support", "Wishlist today"].includes(part)) {
      return (
        <a key={i} href="#" className="text-white font-bold underline hover:no-underline inline-flex items-center gap-1 group">
          {part} <ExternalLink size={12} className="opacity-50 group-hover:opacity-100" />
        </a>
      );
    }
    return part;
  });
};

export default WhatNew;
