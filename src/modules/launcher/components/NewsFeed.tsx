import React, { useState, useEffect } from "react";
import { Search, Filter, ExternalLink, Play, Pause, ChevronUp, ChevronDown } from "lucide-react";
import CubeLoader from "@shared/components/CubeLoader";
import { openUrl } from "@tauri-apps/plugin-opener";
import NewsCard from "./NewsCard";



interface NewsItem {
  id: string;
  title: string;
  text: string;
  category: string;
  date: string;
  playPageImage: {
    url: string;
  };
  newsPageImage: {
    url: string;
  };
  readMoreLink: string;
}

// Simple module-level cache to avoid redundant fetches
let cachedNews: NewsItem[] | null = null;
let isFetching = false;
let fetchPromise: Promise<NewsItem[]> | null = null;

const NewsFeed: React.FC = () => {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      // If we already have cached data, use it
      if (cachedNews) {
        setNewsList(cachedNews);
        setLoading(false);
        return;
      }

      // If a fetch is already in progress, wait for it
      if (isFetching && fetchPromise) {
        try {
          const data = await fetchPromise;
          setNewsList(data);
          setLoading(false);
          return;
        } catch (err) {
          console.error("Failed to wait for existing fetch:", err);
        }
      }

      setLoading(true);
      isFetching = true;

      // Create a promise that we can share if other instances mount during fetch
      fetchPromise = (async () => {
        const response = await fetch("https://launchercontent.mojang.com/v2/news.json");
        const data = await response.json();

        const newsArray = Array.isArray(data) ? data : (data.entries || []);

        let customMappings: any[] = [];
        try {
          const mapResponse = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:25461"}/api/news`);
          if (mapResponse.ok) {
            customMappings = await mapResponse.json();
          }
        } catch (mapErr) {
          console.error("Failed to fetch news mappings:", mapErr);
        }

        const fixedEntries = newsArray.map((entry: any) => {
          // Fix image URLs
          if (entry.playPageImage?.url?.startsWith("/")) {
            entry.playPageImage.url = `https://launchercontent.mojang.com${entry.playPageImage.url}`;
          }
          if (entry.newsPageImage?.url?.startsWith("/")) {
            entry.newsPageImage.url = `https://launchercontent.mojang.com${entry.newsPageImage.url}`;
          }

          const mapping = customMappings.find((m: any) => m.id === entry.id);
          if (mapping && mapping.urlImg) {
            if (!entry.playPageImage) entry.playPageImage = {};
            if (!entry.newsPageImage) entry.newsPageImage = {};
            entry.playPageImage.url = mapping.urlImg;
            entry.newsPageImage.url = mapping.urlImg;
          }

          return entry;
        });

        // Sort mappings to the top
        fixedEntries.sort((a: any, b: any) => {
          const indexA = customMappings.findIndex((m: any) => m.id === a.id);
          const indexB = customMappings.findIndex((m: any) => m.id === b.id);

          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return 0;
        });

        cachedNews = fixedEntries;
        return fixedEntries;
      })();

      try {
        const result = await fetchPromise;
        setNewsList(result);
      } catch (err) {
        console.error("Failed to fetch news:", err);
      } finally {
        setLoading(false);
        isFetching = false;
        fetchPromise = null;
      }
    };

    fetchNews();
  }, []);

  useEffect(() => {
    let interval: any;
    const loopLimit = Math.min(newsList.length, 4);
    if (isAutoPlay && loopLimit > 0) {
      interval = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % loopLimit);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isAutoPlay, newsList.length, activeIndex]);

  const featuredNews = newsList[activeIndex];

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#121212] w-full">
        <CubeLoader message="Fetching News" scale={0.8} />
      </div>
    );
  }

  if (newsList.length === 0) {
    return <div className="p-10 text-gray-500 bg-[#121212] h-full">No news available.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white font-sans select-none overflow-hidden">
      {/* Official Style Navbar */}
      <div className="h-[87px] bg-[#262626] border-b border-black flex items-center justify-center shrink-0 z-50">
        <div className="flex items-center gap-8">
          {/* Central Buy Button Group */}
          <div className="flex items-center h-[42px]">
            <button
              onClick={() => openUrl("https://www.minecraft.net/en-us/download")}
              className="flex items-center gap-3 px-12 py-1 transition-all active:scale-95 hover:scale-102 hover:brightness-110 h-full antialiased"
              title="If you enjoy the game, please buy the official version to support Mojang."
              style={{
                backgroundImage: "url('/playbutton.png')",
                backgroundSize: "100% 100%",
                backgroundRepeat: "no-repeat",
                backgroundColor: "transparent",
                border: "none",
                imageRendering: "pixelated"
              }}
            >
              <span
                className="text-white uppercase tracking-wider cursor-pointer"
                style={{
                  fontFamily: "'mcten', sans-serif",
                  fontSize: "24px",
                  textShadow: "2px 2px 0px rgba(0, 0, 0, 0.5)",
                  WebkitFontSmoothing: "antialiased",
                  MozOsxFontSmoothing: "grayscale"
                }}
              >
                Buy Now
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Featured Section Container - Full Width */}
        <div className="w-full h-[480px] shrink-0 flex gap-2 overflow-hidden group">
          {/* Left Area: Background + Left Info Box */}
          <div className="relative flex-1 h-full overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0">
              <img
                src={featuredNews.playPageImage.url}
                alt={featuredNews.title}
                className="w-full h-full object-cover transition-all duration-700"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
            </div>

            {/* Content Overlay */}
            <div className="absolute inset-0 flex">
              {/* Left Info Box */}
              <div className={`mt-auto w-[360px] ${isExpanded ? "p-6 h-auto" : "p-3 h-[60px]"} bg-[#121212] flex flex-col gap-4  shadow-2xl relative overflow-hidden`}>
                {/* Toggle Button */}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </button>

                {isExpanded ? (
                  <>
                    <h1 className="text-[24px] font-minecraft leading-tight tracking-tight text-white drop-shadow-md pr-8">
                      {featuredNews.title}
                    </h1>
                    <p className="text-[13px] text-gray-200 leading-relaxed line-clamp-3 font-medium opacity-90">
                      {featuredNews.text}
                    </p>

                    <div className="flex flex-col gap-3 mt-2">
                      <button
                        onClick={() => openUrl(featuredNews.readMoreLink)}
                        className="bg-minecraft-green hover:bg-minecraft-green-hover text-white px-5 py-2.5 rounded-[1px] text-[13px] font-black tracking-wide flex items-center justify-between transition-all group/btn"
                      >
                        <span>Read More</span>
                        <ExternalLink size={16} />
                      </button>
                      <button
                        onClick={() => openUrl("https://www.minecraft.net/news")}
                        className="text-[12px] font-bold text-white flex items-center gap-2 hover:underline w-fit"
                      >
                        More news <ExternalLink size={14} className="opacity-60" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between w-full h-full pr-10">
                    <h1 className="text-[16px] font-minecraft leading-tight tracking-tight text-white drop-shadow-md truncate max-w-[200px]">
                      {featuredNews.title}
                    </h1>
                    <button
                      onClick={() => openUrl(featuredNews.readMoreLink)}
                      className="bg-minecraft-green hover:bg-minecraft-green-hover text-white px-3 py-1.5 rounded-[1px] text-[11px] font-black tracking-wide transition-all"
                    >
                      Read More
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Control Icons Overlay */}
            <div
              onClick={() => setIsAutoPlay(!isAutoPlay)}
              className="absolute right-0 bottom-0 flex items-center m-3 justify-center p-2 bg-black/60 hover:bg-black/80 border border-white/20 cursor-pointer z-30 transition-colors group/play"
            >
              {isAutoPlay ? (
                <Pause
                  size={16}
                  fill="#22c55e"
                  className="text-green-500 transition-colors"
                />
              ) : (
                <Play
                  size={16}
                  fill="none"
                  className="text-white transition-colors"
                />
              )}

              {isAutoPlay && (
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                  {/* Dashed background */}
                  <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="3"
                    strokeDasharray="4 2"
                    className="opacity-40"
                  />
                  {/* Progress fill */}
                  <rect
                    key={activeIndex}
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="3"
                    className="animate-[newsProgress_5s_linear_forwards]"
                    style={{
                      strokeDasharray: "140",
                      strokeDashoffset: "140",
                    }}
                  />
                </svg>
              )}

              <style>{`
                @keyframes newsProgress {
                  from { stroke-dashoffset: 140; }
                  to { stroke-dashoffset: 0; }
                }
              `}</style>
            </div>
          </div>

          {/* Right Sidebar Thumbnails */}
          <div className="w-[180px] shrink-0 h-full bg-[#121212] flex flex-col gap-1 overflow-y-auto custom-scrollbar no-scrollbar">
            {newsList.slice(0, 4).map((item, idx) => (
              <div
                key={item.id}
                onClick={() => setActiveIndex(idx)}
                className="relative flex-1 min-h-[80px] cursor-pointer transition-all overflow-hidden group/item"
              >
                <img src={item.playPageImage.url} alt="thumb" className="w-full h-full object-cover" />
                <div className={`absolute inset-0 bg-black/60 z-10 p-3 transition-opacity duration-200 ${activeIndex === idx ? "opacity-100" : "opacity-0 group-hover/item:opacity-100"
                  }`}>
                  <span className="text-[25px] font-minecraft text-white/75 leading-tight drop-shadow-lg block">
                    {item.title}
                  </span>
                </div>
                {activeIndex === idx && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-1/2 bg-white z-20" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Search & Filter - Exact Style */}
        <div className="px-32 py-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-black text-white/40 uppercase tracking-[1.5px]">Search</label>
            <div className="flex items-center gap-2 text-white/40 hover:text-white cursor-pointer group">
              <span className="text-[11px] font-black uppercase tracking-[1.5px]">Filters</span>
              <Filter size={16} />
            </div>
          </div>
          <div className="relative group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-minecraft-green" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="What do you seek?"
              className="w-full bg-[#0c0c0c] border border-white/10 focus:border-minecraft-green rounded-[2px] py-2.5 pl-12 pr-4 text-[14px] text-white focus:outline-none transition-all placeholder:text-white/20 focus:bg-black"
            />
          </div>
        </div>

        {/* News Grid - 3 Columns */}
        <div className="px-32 pb-20 mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {newsList
            .filter(item =>
              item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.text.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((item) => (
              <NewsCard
                key={item.id}
                title={item.title}
                tag={item.category}
                date={formatDate(item.date)}
                image={item.playPageImage.url}
                link={item.readMoreLink}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

export default NewsFeed;
