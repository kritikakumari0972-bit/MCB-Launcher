import React from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { X, Trash2, Terminal, ChevronDown, ChevronUp, FolderOpen, Save, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LogWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

const LogWindow: React.FC<LogWindowProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = React.useState<string[]>([]);
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      // Load recent crash logs on open
      invoke<string[]>("get_recent_logs")
        .then((recentLogs) => {
          if (recentLogs.length > 0) {
            setLogs((prev) => [
              "=== Previously saved crash logs ===",
              ...recentLogs.flatMap((log) => log.split("\n")),
              "=== Live logs below ===",
              ...prev,
            ]);
          }
        })
        .catch(() => { });
    }
  }, [isOpen]);

  React.useEffect(() => {
    const unlisten = listen<string>("game-log", (event) => {
      const newLines = event.payload.split("\n");
      setLogs((prev) => {
        const combined = [...prev, ...newLines];
        if (combined.length > 2000) {
          return combined.slice(-2000);
        }
        return combined;
      });
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  React.useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isMinimized]);

  const handleSaveLogs = async () => {
    try {
      const text = logs.join("\n");
      await invoke("export_logs", { logs: text });
    } catch (e) {
      console.error("Failed to save logs", e);
    }
  };

  const handleCopyLogs = async () => {
    try {
      const text = logs.join("\n");
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy logs", e);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className={`fixed bottom-4 right-4 z-50 flex flex-col bg-[#0f0f0f] border border-white/10 rounded-[4px] shadow-2xl transition-all duration-300 ${isMinimized ? "w-64 h-12" : "w-[600px] h-[400px]"
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5 select-none">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-minecraft-green" />
            <span className="text-xs font-extrabold uppercase tracking-tight text-white/80">
              Developer Logs
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLogs}
              className={`transition-colors ${copied ? 'text-minecraft-green' : 'text-gray-500 hover:text-white'}`}
              title={copied ? "Copied!" : "Copy logs to clipboard"}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <button
              onClick={handleSaveLogs}
              className="text-gray-500 hover:text-white transition-colors"
              title="Save current log to file"
            >
              <Save size={16} />
            </button>
            <button
              onClick={() => invoke("open_log_folder")}
              className="text-gray-500 hover:text-minecraft-green transition-colors"
              title="Open Crash Logs Folder"
            >
              <FolderOpen size={16} />
            </button>
            <button
              onClick={() => setLogs([])}
              className="text-gray-500 hover:text-white transition-colors"
              title="Clear Logs"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-gray-500 hover:text-white transition-colors"
            >
              {isMinimized ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-red-500 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Log Content */}
        {!isMinimized && (
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed custom-scrollbar bg-black/40 select-text cursor-text"
          >
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-600 italic">
                No logs recorded...
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">
                  <span className="text-gray-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                  <span
                    className={
                      log.includes("[STDERR]")
                        ? "text-red-400"
                        : log.includes("[Progress]")
                          ? "text-minecraft-green"
                          : "text-gray-300"
                    }
                  >
                    {log}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default LogWindow;
