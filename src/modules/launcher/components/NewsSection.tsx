import React, { useState, useEffect } from "react";
import NewsCard from "./NewsCard";
import CubeLoader from "@shared/components/CubeLoader";



interface NewsItem {
  id: string;
  title: string;
  category: string;
  date: string;
  playPageImage: {
    url: string;
  };
  readMoreLink: string;
}

interface NewsSectionProps {
  category?: string;
}

const NewsSection: React.FC<NewsSectionProps> = ({ category = "java" }) => {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const response = await fetch("https://launchercontent.mojang.com/v2/news.json");
        const data = await response.json();

        const newsArray = Array.isArray(data) ? data : (data.entries || []);

        // Filter based on category
        const filtered = newsArray.filter((entry: any) => {
          if (category === "java") return entry.newsType?.includes("Java") || entry.category === "Minecraft: Java Edition";
          if (category === "windows") return entry.newsType?.includes("Bedrock") || entry.category === "Minecraft for Windows";
          if (category === "dungeons") return entry.newsType?.includes("Dungeons") || entry.category === "Minecraft Dungeons";
          return true;
        });

        const fixedEntries = filtered.map((entry: any) => {
          if (entry.playPageImage?.url?.startsWith("/")) {
            entry.playPageImage.url = `https://launchercontent.mojang.com${entry.playPageImage.url}`;
          }
          return entry;
        });

        setNewsList(fixedEntries);
      } catch (err) {
        console.error("Failed to fetch news:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [category]);

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
      <div className="flex items-center justify-center py-20 bg-[#121212] w-full min-h-[400px]">
        <CubeLoader message="Loading news" scale={0.8} />
      </div>
    );
  }

  if (newsList.length === 0) {
    return (
      <div className="px-32 py-20 text-center text-gray-500 bg-[#121212] w-full font-bold uppercase tracking-widest">
        No news available for this section
      </div>
    );
  }

  return (
    <div className="px-32 pb-20 mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 bg-[#121212]">
      {newsList.map((item) => (
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
  );
};

export default NewsSection;
