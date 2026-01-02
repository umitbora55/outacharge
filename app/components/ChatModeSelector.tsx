"use client";

import { useState } from "react";
import { 
  PanelRightOpen, 
  Columns2, 
  MessageSquare, 
  Maximize2,
  Check,
  X
} from "lucide-react";

export type ChatMode = "panel" | "split" | "floating" | "modal";

interface ChatModeSelectorProps {
  onSelect: (mode: ChatMode) => void;
  onClose: () => void;
  currentMode?: ChatMode;
}

const chatModes = [
  {
    id: "panel" as ChatMode,
    name: "Slide Panel",
    description: "Sağdan açılan panel. Harita görünür kalır.",
    icon: PanelRightOpen,
    preview: (
      <div className="w-full h-24 bg-slate-700 rounded-lg overflow-hidden flex">
        <div className="flex-1 bg-slate-600 m-1 rounded flex items-center justify-center">
          <span className="text-[10px] text-slate-400">Harita</span>
        </div>
        <div className="w-1/3 bg-emerald-500/30 m-1 rounded flex items-center justify-center animate-slide-in-right">
          <span className="text-[10px] text-emerald-400">Sohbet</span>
        </div>
      </div>
    ),
  },
  {
    id: "split" as ChatMode,
    name: "Split Screen",
    description: "Ekran ikiye bölünür. Geniş sohbet alanı.",
    icon: Columns2,
    preview: (
      <div className="w-full h-24 bg-slate-700 rounded-lg overflow-hidden flex">
        <div className="flex-1 bg-slate-600 m-1 rounded flex items-center justify-center">
          <span className="text-[10px] text-slate-400">Harita</span>
        </div>
        <div className="flex-1 bg-emerald-500/30 m-1 rounded flex items-center justify-center">
          <span className="text-[10px] text-emerald-400">Sohbet</span>
        </div>
      </div>
    ),
  },
  {
    id: "floating" as ChatMode,
    name: "Floating Window",
    description: "Sürüklenebilir pencere. İstediğin yere taşı.",
    icon: MessageSquare,
    preview: (
      <div className="w-full h-24 bg-slate-700 rounded-lg overflow-hidden relative">
        <div className="absolute inset-1 bg-slate-600 rounded flex items-center justify-center">
          <span className="text-[10px] text-slate-400">Harita</span>
        </div>
        <div className="absolute bottom-2 right-2 w-1/3 h-16 bg-emerald-500/30 rounded-lg shadow-lg flex items-center justify-center border border-emerald-500/50">
          <span className="text-[10px] text-emerald-400">Sohbet</span>
        </div>
      </div>
    ),
  },
  {
    id: "modal" as ChatMode,
    name: "Tam Ekran",
    description: "Modal pencere. Odaklanmış sohbet deneyimi.",
    icon: Maximize2,
    preview: (
      <div className="w-full h-24 bg-slate-700 rounded-lg overflow-hidden relative">
        <div className="absolute inset-1 bg-slate-600 rounded opacity-30 flex items-center justify-center">
          <span className="text-[10px] text-slate-500">Harita</span>
        </div>
        <div className="absolute inset-3 bg-emerald-500/30 rounded-lg shadow-lg flex items-center justify-center border border-emerald-500/50">
          <span className="text-[10px] text-emerald-400">Sohbet</span>
        </div>
      </div>
    ),
  },
];

export default function ChatModeSelector({ onSelect, onClose, currentMode }: ChatModeSelectorProps) {
  const [hoveredMode, setHoveredMode] = useState<ChatMode | null>(null);
  const [selectedMode, setSelectedMode] = useState<ChatMode | null>(currentMode || null);

  const handleConfirm = () => {
    if (selectedMode) {
      localStorage.setItem("chatMode", selectedMode);
      onSelect(selectedMode);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Sohbet Görünümü Seç</h2>
              <p className="text-slate-400 text-sm mt-1">
                Sohbet penceresinin nasıl görüneceğini seçin
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Grid */}
        <div className="p-6 grid grid-cols-2 gap-4">
          {chatModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              onMouseEnter={() => setHoveredMode(mode.id)}
              onMouseLeave={() => setHoveredMode(null)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                selectedMode === mode.id
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-slate-700 hover:border-slate-600 bg-slate-700/50"
              }`}
            >
              {/* Preview */}
              <div className="mb-3">
                {mode.preview}
              </div>

              {/* Info */}
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedMode === mode.id ? "bg-emerald-500" : "bg-slate-600"
                }`}>
                  <mode.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-medium">{mode.name}</h3>
                    {selectedMode === mode.id && (
                      <Check className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">{mode.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex items-center justify-between">
          <p className="text-slate-500 text-sm">
            Bu tercihi daha sonra ayarlardan değiştirebilirsiniz
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-full text-slate-300 hover:bg-slate-700 transition"
            >
              İptal
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedMode}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-full font-medium transition"
            >
              Seç ve Başla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}