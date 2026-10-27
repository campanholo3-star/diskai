import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { emojiCategories, allFlatEmojis } from '../../utils/emojis';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

export const EmojiPickerModal: React.FC<EmojiPickerProps> = ({ onSelectEmoji, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<string>('smileys');
  const [search, setSearch] = useState('');

  const currentCategory = emojiCategories.find(c => c.id === activeCategory) || emojiCategories[0];

  const displayedEmojis = search.trim()
    ? allFlatEmojis
    : currentCategory.emojis;

  return (
    <div
      onClick={e => e.stopPropagation()}
      className="w-80 h-96 bg-[#2b2d31] border border-[#3e4047] rounded-xl shadow-2xl flex flex-col overflow-hidden text-[#dbdee1] select-none z-50 animate-in fade-in duration-150"
    >
      {/* Search Input */}
      <div className="p-2.5 border-b border-[#1f2023] flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar emojis..."
            className="w-full bg-[#1e1f22] text-xs text-white px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#5865F2] pr-7 placeholder-[#80848e]"
          />
          <Search className="w-3.5 h-3.5 text-[#80848e] absolute right-2.5 top-2" />
        </div>
        <button
          onClick={onClose}
          className="p-1 text-[#949ba4] hover:text-white rounded hover:bg-[#35373c] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Category Icons Tabs (if not searching) */}
      {!search.trim() && (
        <div className="px-2 py-1.5 bg-[#232428] border-b border-[#1f2023] flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
          {emojiCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              title={cat.name}
              className={`p-1.5 rounded text-sm transition-all hover:bg-[#35373c] ${
                activeCategory === cat.id ? 'bg-[#404249] scale-110 shadow' : 'opacity-70 hover:opacity-100'
              }`}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emojis Grid */}
      <div className="flex-1 p-2.5 overflow-y-auto no-scrollbar space-y-2">
        <div className="text-[11px] font-bold text-[#949ba4] uppercase tracking-wider px-1">
          {search.trim() ? `Resultados (${displayedEmojis.length})` : currentCategory.name}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {displayedEmojis.map((emoji, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSelectEmoji(emoji);
                onClose();
              }}
              className="w-9 h-9 rounded-lg hover:bg-[#35373c] flex items-center justify-center text-xl transition-transform hover:scale-125 active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
