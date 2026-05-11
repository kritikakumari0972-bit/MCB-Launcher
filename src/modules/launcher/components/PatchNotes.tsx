import React, { useState, useEffect } from "react";

import PatchDetail from "./PatchDetail";
import { ExternalLink, Check } from "lucide-react";
import CubeLoader from "@shared/components/CubeLoader";
import LoadingOverlay from "@shared/components/LoadingOverlay";

interface PatchItem {
  id: string;
  title: string;
  version: string;
  type: "release" | "snapshot" | "beta";
  date: string;
  image: {
    url: string;
  };
  body?: string;
  contentPath?: string;
}

interface PatchNotesProps {
  category?: "windows" | "java" | "dungeons";
}

const PatchNotes: React.FC<PatchNotesProps> = ({ category = "java" }) => {
  const [allPatches, setAllPatches] = useState<PatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showReleases, setShowReleases] = useState(true);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [selectedPatch, setSelectedPatch] = useState<PatchItem | null>(null);

  useEffect(() => {
    const fetchPatches = async () => {
      setLoading(true);
      try {
        let url = "";
        if (category === "java") {
          url = "https://launchercontent.mojang.com/v2/javaPatchNotes.json";
        } else if (category === "windows") {
          url = "https://launchercontent.mojang.com/v2/bedrockPatchNotes.json";
        } else if (category === "dungeons") {
          url = "https://launchercontent.mojang.com/v2/dungeonsPatchNotes.json";
        } else {
          setAllPatches([]);
          setLoading(false);
          return;
        }

        const response = await fetch(url);
        const data = await response.json();

        // Fix image URLs if they are relative
        const fixedEntries = (data.entries || []).map((entry: any) => {
          const item: PatchItem = {
            id: entry.id,
            title: entry.title,
            version: entry.version,
            type: entry.type || (entry.patchNoteType === "retail" ? "release" : (entry.patchNoteType === "beta" ? "snapshot" : "release")),
            date: entry.date,
            image: {
              url: entry.image?.url || ""
            },
            contentPath: entry.contentPath
          };

          if (item.image.url.startsWith("/")) {
            item.image.url = `https://launchercontent.mojang.com${item.image.url}`;
          }
          return item;
        });

        setAllPatches(fixedEntries);
      } catch (err) {
        console.error("Failed to fetch patch notes:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatches();
  }, [category]);

  const handlePatchClick = async (patch: PatchItem) => {
    if (patch.body) {
      setSelectedPatch(patch);
      return;
    }

    if (patch.contentPath) {
      setDetailLoading(true);
      // Force a small delay to ensure the UI paints the loading state
      await new Promise(resolve => setTimeout(resolve, 50));
      
      try {
        const res = await fetch(`https://launchercontent.mojang.com/v2/${patch.contentPath}`);
        const data = await res.json();
        const text = data.body || "";

        // Smarter conversion of text to HTML
        const lines = text.split(/\r?\n/);
        let html = '';
        let inList = false;

        lines.forEach((line: string) => {
          const trimmed = line.trim();

          if (!trimmed) {
            if (inList) {
              html += '</ul>';
              inList = false;
            }
            // Only add a break if we're not at the very beginning
            if (html.length > 0 && !html.endsWith('<br/>')) {
              html += '<div class="h-4"></div>';
            }
            return;
          }

          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            if (!inList) {
              html += '<ul class="patch-list">';
              inList = true;
            }
            html += `<li>${trimmed.substring(2)}</li>`;
          } else {
            if (inList) {
              html += '</ul>';
              inList = false;
            }

            if (trimmed.startsWith('## ')) {
              html += `<h2>${trimmed.substring(3)}</h2>`;
            } else if (trimmed.startsWith('### ')) {
              html += `<h3>${trimmed.substring(4)}</h3>`;
            } else if (trimmed.endsWith(':') && trimmed.length < 60) {
              html += `<h3 class="section-header">${trimmed}</h3>`;
            } else {
              html += `<p class="patch-para">${trimmed}</p>`;
            }
          }
        });

        if (inList) html += '</ul>';

        const updatedPatch = { ...patch, body: html };
        setAllPatches(prev => prev.map(p => p.id === patch.id ? updatedPatch : p));
        setSelectedPatch(updatedPatch);
      } catch (err) {
        console.error("Failed to fetch patch detail:", err);
        setSelectedPatch(patch);
      } finally {
        setDetailLoading(false);
      }
    } else {
      setSelectedPatch(patch);
    }
  };

  const filteredPatches = allPatches.filter(p => {
    if (showReleases && p.type === "release") return true;
    if (showSnapshots && (p.type === "snapshot" || p.type === "beta")) return true;
    return false;
  });

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

  if (selectedPatch) {
    return (
      <PatchDetail
        version={selectedPatch.version}
        date={formatDate(selectedPatch.date)}
        body={selectedPatch.body || ""}
        onClose={() => setSelectedPatch(null)}
      />
    );
  }

  const getCategoryLabel = () => {
    if (category === "windows") return "Minecraft for Windows";
    if (category === "dungeons") return "Minecraft Dungeons";
    return "Minecraft: Java Edition";
  };

  return (
    <>
      {detailLoading && <LoadingOverlay message="Fetching Details" />}
      <div className="p-10 text-white font-sans bg-[#2e2e2e] min-h-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-extrabold text-[#999] uppercase tracking-tighter">Versions</label>
          <div className="flex items-center gap-5 pt-1">
            <VersionCheckbox
              label="Releases"
              checked={showReleases}
              onChange={() => setShowReleases(!showReleases)}
            />
            <VersionCheckbox
              label="Snapshots / Beta"
              checked={showSnapshots}
              onChange={() => setShowSnapshots(!showSnapshots)}
            />
          </div>
        </div>

        <a href="https://www.minecraft.net/patch-notes" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[13px] font-bold text-white hover:underline transition-all">
          More patch notes
          <ExternalLink size={14} />
        </a>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 w-full min-h-[300px]">
          <CubeLoader message="Loading Patches" scale={0.8} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
          {filteredPatches.map((patch) => (
            <div
              key={patch.id}
              onClick={() => handlePatchClick(patch)}
              className="flex flex-col bg-black rounded-[1px] overflow-hidden cursor-pointer hover:brightness-110 transition-all group"
            >
              <div className="aspect-square overflow-hidden bg-[#222]">
                <img
                  src={patch.image.url}
                  alt={`Patch ${patch.version}`}
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://launchercontent.mojang.com/v2/java/patchnotes/images/tricky-trials-1.21.jpg`;
                  }}
                />
              </div>
              <div className="p-4 flex flex-col gap-1">
                <span className="text-[12px] font-extrabold leading-tight uppercase text-white">{getCategoryLabel()}</span>
                <span className="text-[14px] font-bold text-white opacity-90 line-clamp-2">{patch.title}</span>
                <span className="text-[11px] font-bold text-gray-500">{formatDate(patch.date)}</span>
              </div>
            </div>
          ))}

          {filteredPatches.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-500 font-bold uppercase tracking-widest">
              No versions matching these filters
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
};

const VersionCheckbox: React.FC<{ label: string; checked: boolean; onChange: () => void }> = ({ label, checked, onChange }) => {
  return (
    <label className="flex items-center gap-2 cursor-pointer group" onClick={onChange}>
      <div className={`w-[18px] h-[18px] rounded-[2px] flex items-center justify-center border transition-colors ${checked ? 'bg-minecraft-green border-minecraft-green' : 'bg-[#1a1a1a] border-[#555]'}`}>
        {checked && <Check size={14} className="text-white" strokeWidth={4} />}
      </div>
      <span className="text-[12px] font-bold text-gray-300 group-hover:text-white transition-colors">{label}</span>
    </label>
  );
};

export default PatchNotes;
