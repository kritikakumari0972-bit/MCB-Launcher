import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export const languages = [
  "English - United States"
];

interface LanguageSelectorProps {
  selectedLang: string;
  onSelect: (lang: string) => void;
  className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ selectedLang, onSelect, className = "w-[280px]" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div
        className={`flex items-center justify-between bg-black/60 border-2 rounded-[1px] py-1.5 px-4 text-[13px] cursor-pointer transition-colors ${isOpen ? 'border-minecraft-green' : 'border-white/10 hover:border-white/20'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-[#dedede]">{selectedLang}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute bottom-full mb-1 left-0 right-0 lg:bottom-auto lg:top-full lg:mt-1 bg-[#121212] border border-[#333] shadow-2xl max-h-[300px] overflow-y-auto custom-scrollbar z-100 animate-in fade-in zoom-in duration-150">
          {languages.map((lang) => (
            <div
              key={lang}
              className={`px-4 py-2 text-[14px] cursor-pointer transition-colors ${selectedLang === lang ? 'bg-minecraft-green text-white' : 'hover:bg-[#1a1a1a] text-[#dedede] hover:text-white'}`}
              onClick={() => {
                onSelect(lang);
                setIsOpen(false);
              }}
            >
              {lang}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
