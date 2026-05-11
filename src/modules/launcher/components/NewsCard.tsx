import React from "react";
import { ExternalLink, Newspaper } from "lucide-react";

import { openUrl } from "@tauri-apps/plugin-opener";

interface NewsCardProps {
  title: string;
  tag: string;
  date: string;
  image: string;
  link?: string;
}

const NewsCard: React.FC<NewsCardProps> = ({ title, tag, date, image, link }) => {
  return (
    <div 
      onClick={() => link && openUrl(link)}
      className="flex flex-col bg-[#0c0c0c] border border-white/5 hover:border-white group cursor-pointer transition-all duration-300 hover:bg-[#303030]"
    >
      <div className="aspect-video overflow-hidden bg-black relative">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500"
        />
      </div>
      <div className="p-5 flex flex-col gap-3 min-h-[140px]">
        {/* Tags Row */}
        <div className="flex items-center gap-2">
          <div className="bg-minecraft-green px-2 py-0.5 text-[10px] font-black text-white uppercase tracking-wider">
            {tag}
          </div>
          <div className="border border-white/40 px-2 py-0.5 flex items-center gap-1.5 text-[10px] font-black text-white/80 uppercase tracking-wider">
            <Newspaper size={12} />
            News
          </div>
        </div>

        {/* Title and Icon */}
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-[14px] font-extrabold text-white leading-snug transition-colors line-clamp-2">
            {title}
          </h3>
          <ExternalLink size={16} className="shrink-0 text-white/20 group-hover:text-white transition-all" />
        </div>

        {/* Date */}
        <div className="mt-auto pt-2">
          <span className="text-[11px] text-white/30 font-bold">{date}</span>
        </div>
      </div>
    </div>
  );
};

export default NewsCard;
