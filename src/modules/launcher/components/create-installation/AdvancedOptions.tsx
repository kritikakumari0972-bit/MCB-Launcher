import React from "react";
import { ChevronDown } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface AdvancedOptionsProps {
  isBedrock: boolean;
  showMore: boolean;
  setShowMore: (v: boolean) => void;
  showWarning: boolean;
  setShowWarning: (v: boolean) => void;
  javaExec: string;
  setJavaExec: (v: string) => void;
  ramMb: number;
  setRamMb: (v: number) => void;
  jvmArgs: string;
  setJvmArgs: (v: string) => void;
}

const AdvancedOptions: React.FC<AdvancedOptionsProps> = ({
  isBedrock,
  showMore,
  setShowMore,
  showWarning,
  setShowWarning,
  javaExec,
  setJavaExec,
  ramMb,
  setRamMb,
  jvmArgs,
  setJvmArgs
}) => {
  if (isBedrock) return null;

  return (
    <>
      <div className="mt-4 flex flex-col items-center relative">
        {showWarning && (
          <div className="absolute top-[-60px] bg-white text-black p-3 rounded-[2px] text-[12px] w-[280px] text-center shadow-xl animate-in fade-in zoom-in duration-200 pointer-events-none">
            Be careful, changing these options may cause the installation to malfunction.
            <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45" />
          </div>
        )}

        <button
          onClick={() => setShowMore(!showMore)}
          onMouseEnter={() => setShowWarning(true)}
          onMouseLeave={() => setShowWarning(false)}
          className="flex items-center gap-2 text-[11px] font-extrabold text-[#999] uppercase tracking-tighter cursor-pointer hover:text-white transition-colors"
        >
          {showMore ? "Less Options" : "More Options"}
          {showMore ? <ChevronDown size={14} className="rotate-180" /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expanded Options */}
      {showMore && (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-top-4 duration-300 mt-8">
          <div className="grid grid-cols-2 gap-6">
            {/* Java Executable */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-extrabold text-[#999] uppercase tracking-tighter">Java Executable</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="<Use bundled Java runtime>"
                  value={javaExec}
                  onChange={(e) => setJavaExec(e.target.value)}
                  className="flex-1 bg-black/40 border-2 border-minecraft-green rounded-[1px] py-1.5 px-3 text-[13px] text-white focus:outline-none transition-colors placeholder:text-gray-600"
                />
                <button
                  onClick={async () => {
                    const path: string | null = await invoke("pick_file");
                    if (path) setJavaExec(path);
                  }}
                  className="text-[11px] font-extrabold uppercase text-white hover:underline"
                >
                  Browse
                </button>
              </div>
            </div>

            {/* RAM Allocation */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-extrabold text-[#999] uppercase tracking-tighter">RAM Allocation (MB)</label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={ramMb}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setRamMb(val);
                    // Sync JVM args prefix if it starts with -Xmx
                    if (jvmArgs.startsWith("-Xmx")) {
                      setJvmArgs(jvmArgs.replace(/-Xmx\d+[G|M]/, `-Xmx${val >= 1024 ? Math.floor(val / 1024) + 'G' : val + 'M'}`));
                    }
                  }}
                  className="w-[100px] bg-black/40 border-2 border-minecraft-green rounded-[1px] py-1.5 px-3 text-[13px] text-white focus:outline-none transition-colors"
                />
                <span className="text-[11px] text-gray-500 italic">Approx. {Math.round(ramMb / 1024 * 10) / 10} GB</span>
              </div>
            </div>
          </div>

          {/* JVM Arguments */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-extrabold text-[#999] uppercase tracking-tighter">JVM Arguments</label>
            <input
              type="text"
              value={jvmArgs}
              onChange={(e) => setJvmArgs(e.target.value)}
              className="bg-black/40 border-2 border-minecraft-green rounded-[1px] py-1.5 px-3 text-[13px] text-white focus:outline-none transition-colors"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default AdvancedOptions;
