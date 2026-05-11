import React from "react";
import { X } from "lucide-react";

interface PatchDetailProps {
  version: string;
  date: string;
  body: string;
  onClose: () => void;
}

const PatchDetail: React.FC<PatchDetailProps> = ({ version, date, body, onClose }) => {
  return (
    <div className="fixed inset-0 z-60 bg-[#2e2e2e] flex flex-col text-white font-sans select-text">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-12 border-b border-[#2a2a2a] select-none">
        <div className="flex-1" />
        <h1 className="text-sm font-bold uppercase tracking-wider">Patch notes {version}</h1>
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
          <div className="mb-8">
            <p className="text-[13px] text-gray-400 font-bold mb-6">{date}</p>
          </div>

          {/* Render the API body content */}
          <div
            className="patch-notes-content text-[15px] leading-relaxed text-gray-300 space-y-4"
            dangerouslySetInnerHTML={{ __html: body }}
          />

          <div className="mt-12 pt-10 border-t border-white/5 bg-[#1a1a1a] p-5 rounded-[2px] mb-10 border-l-4 border-minecraft-green italic">
            <p className="text-[14px] leading-relaxed text-gray-300">
              <strong className="text-white not-italic">Developer's Note:</strong> This patch note was automatically fetched from the official Minecraft servers. For more details, visit the official website.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .patch-notes-content h2 {
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 20px;
          color: white;
          margin-top: 36px;
          letter-spacing: -0.01em;
        }
        .patch-notes-content h3, .patch-notes-content .section-header {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 12px;
          color: white;
          margin-top: 28px;
          display: block;
        }
        .patch-notes-content ul, .patch-notes-content .patch-list {
          list-style-type: disc;
          list-style-position: outside;
          margin-bottom: 24px;
          margin-left: 20px;
        }
        .patch-notes-content li {
          margin-bottom: 8px;
          padding-left: 8px;
          line-height: 1.6;
        }
        .patch-notes-content p, .patch-notes-content .patch-para {
          margin-bottom: 16px;
          line-height: 1.6;
          color: #cccccc;
        }
        .patch-notes-content a {
          color: #47d147;
          text-decoration: underline;
          font-weight: 600;
        }
        .patch-notes-content code {
          background: #1a1a1a;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: monospace;
          color: #e0e0e0;
        }
      `}</style>
    </div>
  );
};

export default PatchDetail;
