import React from "react";
import { X, ExternalLink } from "lucide-react";
import whatnewData from "./updates_data.json";

interface WhatNewProps {
  onClose: () => void;
}

const WhatNewModal: React.FC<WhatNewProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-11000 bg-[#2e2e2e] flex flex-col text-white font-sans select-text animate-in fade-in duration-300 antialiased">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-12 border-b border-[#2a2a2a] select-none">
        <div className="flex-1" />
        <h1 className="text-sm font-bold uppercase tracking-wider text-white">What's New in the Launcher?</h1>
        <div className="flex-1 flex justify-end">
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-[#606060] transition-all duration-200 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-[800px] mx-auto py-12 px-6">
          <div className="space-y-16 pb-20">
            {whatnewData.map((entry, idx) => (
              <div key={idx} className="flex flex-col gap-6">
                {/* Date Header - Pixel Style */}
                <h2 className="text-[24px] font-mcten uppercase tracking-tighter text-white">
                  {entry.date}
                </h2>

                {/* Versions Chips */}
                <div className="flex flex-wrap gap-2">
                  {entry.versions.map((v, vIdx) => (
                    <span key={vIdx} className="bg-[#1a1a1a] px-3 py-1 text-[11px] font-bold text-white/60 rounded-[1px]">
                      {v}
                    </span>
                  ))}
                </div>

                {/* Sections */}
                <div className="flex flex-col gap-8 mt-2">
                  {entry.sections.map((section, sIdx) => (
                    <div key={sIdx} className="flex flex-col gap-4">
                      <h3 className="text-[22px] font-bold text-white">
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
        .font-mcten {
          font-family: 'mcten';
          -webkit-font-smoothing: none;
          -moz-osx-font-smoothing: unset;
          font-smooth: never;
          text-rendering: pixelated;
        }
      `}</style>
    </div>
  );
};

// Helper to handle formatting in text (Links and Bold)
const formatText = (text: string) => {
  // First, handle bold text (**bold**)
  const boldParts = text.split(/(\*\*.*?\*\*)/g);

  return boldParts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`b-${i}`} className="text-white font-bold">{part.slice(2, -2)}</strong>;
    }

    // Then handle links in the remaining parts
    const subParts = part.split(/(MCL-\d+|Account Sign-In Support|Launcher Troubleshooting Guide|Mojang Support|Wishlist today)/g);

    return subParts.map((subPart, si) => {
      if (subPart.match(/MCL-\d+/)) {
        return (
          <a key={`l-${i}-${si}`} href="#" className="text-white font-bold underline hover:no-underline inline-flex items-center gap-1 group">
            {subPart} <ExternalLink size={12} className="opacity-50 group-hover:opacity-100" />
          </a>
        );
      }
      if (["Account Sign-In Support", "Launcher Troubleshooting Guide", "Mojang Support", "Wishlist today"].includes(subPart)) {
        return (
          <a key={`e-${i}-${si}`} href="#" className="text-white font-bold underline hover:no-underline inline-flex items-center gap-1 group">
            {subPart} <ExternalLink size={12} className="opacity-50 group-hover:opacity-100" />
          </a>
        );
      }
      return subPart;
    });
  });
};

export default WhatNewModal;
