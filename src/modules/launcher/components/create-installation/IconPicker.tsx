import React from "react";
import { ChevronDown } from "lucide-react";

interface IconPickerProps {
  showIconPicker: boolean;
  setShowIconPicker: (v: boolean) => void;
  selectedIcon: string;
  setSelectedIcon: (v: string) => void;
  icons: string[];
}

const IconPicker: React.FC<IconPickerProps> = ({
  showIconPicker,
  setShowIconPicker,
  selectedIcon,
  setSelectedIcon,
  icons
}) => {
  return (
    <div className="flex flex-col items-center w-full mb-8">
      <div
        onClick={() => setShowIconPicker(!showIconPicker)}
        className="flex flex-col items-center gap-2 group cursor-pointer mb-6"
      >
        <div className={`w-16 h-16 bg-[#2a2a2a] rounded-[2px] flex items-center justify-center border-2 transition-all ${showIconPicker ? "border-white" : "border-transparent group-hover:border-[#555]"}`}>
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={selectedIcon}
              alt="Selected Icon"
              className="w-10 h-10 object-contain shadow-2xl"
            />
            <div className="absolute right-1 bottom-1">
              <ChevronDown size={12} className={`text-gray-400 transition-transform duration-300 ${showIconPicker ? "rotate-180" : ""}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Icon Picker Grid - Expanded Section */}
      <div
        className={`w-full max-w-[550px] overflow-hidden transition-all duration-500 ease-in-out ${showIconPicker ? "max-h-[600px] opacity-100 mb-10" : "max-h-0 opacity-0 mb-0"
          }`}
      >
        <div className="grid grid-cols-10 gap-3 p-2 bg-[#191919]">
          {/* Plus Button */}
          <div className="aspect-square flex items-center justify-center bg-[#2a2a2a] rounded-[2px] cursor-pointer hover:bg-[#3a3a3a] transition-colors border border-transparent hover:border-white/20">
            <div className="w-6 h-6 rounded-full border border-gray-400 flex items-center justify-center">
              <span className="text-gray-400 text-lg">+</span>
            </div>
          </div>

          {icons.map((icon, idx) => (
            <div
              key={idx}
              onClick={() => {
                setSelectedIcon(icon);
                setShowIconPicker(false);
              }}
              className={`aspect-square flex items-center justify-center bg-[#2a2a2a] rounded-[2px] cursor-pointer hover:bg-[#3a3a3a] transition-all border ${selectedIcon === icon ? "border-white" : "border-transparent hover:border-white/20"}`}
            >
              <img src={icon} alt={`Icon ${idx}`} className="w-8 h-8 object-contain" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IconPicker;
