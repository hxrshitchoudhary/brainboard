import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, ChevronUp, ChevronDown, Edit2, Trash2 } from 'lucide-react';

export function SidebarEditableItem({ icon, label, active, onClick, theme, isDark, canModify, onRename, onDelete, onMoveUp, onMoveDown, onDropItem }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
    }
    if (isMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  if (isEditing) {
    return (
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border shadow-sm ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-stone-200'}`}>
        <div className="text-teal-500">{icon}</div>
        <input
          autoFocus
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={() => { onRename(label, editValue); setIsEditing(false); }}
          onKeyDown={e => { if(e.key === 'Enter') e.currentTarget.blur(); if(e.key === 'Escape') setIsEditing(false); }}
          className={`bg-transparent outline-none w-full text-sm font-bold ${theme.text}`}
        />
      </div>
    )
  }

  return (
    <div 
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
         e.preventDefault();
         setIsDragOver(false);
         try {
             const rawData = e.dataTransfer.getData('application/x-brainboard-item');
             if (!rawData) return; 
             const data = JSON.parse(rawData);
             if(data && data.id && onDropItem) onDropItem(data.id);
         } catch(err) {}
      }}
      className={`group relative w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${isDragOver ? 'ring-2 ring-teal-500 bg-teal-500/10' : active ? (isDark ? 'bg-white/5 border border-white/5 shadow-sm text-teal-400' : 'bg-white border border-stone-200 shadow-sm text-teal-600') : `border border-transparent ${theme.btnGhost}`}`}
    >
      <button onClick={onClick} className="flex-1 flex items-center gap-3.5 text-left overflow-hidden">
        <div className={`transition-colors ${active ? 'text-inherit' : 'text-stone-500 group-hover:text-stone-900 dark:group-hover:text-zinc-100'}`}>{icon}</div>
        <span className="truncate">{label}</span>
      </button>
      
      {canModify && (
        <div className="relative" ref={menuRef}>
          <button aria-label="Item Options" onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-full transition-all active:scale-95 ${isDark ? 'hover:bg-white/10' : 'hover:bg-stone-100'}`}>
            <MoreHorizontal size={14} />
          </button>
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -5 }} 
                className={`absolute right-0 top-full mt-1 z-50 w-40 rounded-2xl shadow-xl border p-1.5 backdrop-blur-2xl ${isDark ? 'bg-zinc-800/95 border-zinc-700' : 'bg-white/95 border-stone-200'}`}
              >
                 <button onClick={(e) => { e.stopPropagation(); onMoveUp(); setIsMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300 hover:text-white' : 'hover:bg-stone-100 text-stone-600 hover:text-stone-900'}`}><ChevronUp size={14} strokeWidth={2}/> Move Up</button>
                 <button onClick={(e) => { e.stopPropagation(); onMoveDown(); setIsMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300 hover:text-white' : 'hover:bg-stone-100 text-stone-600 hover:text-stone-900'}`}><ChevronDown size={14} strokeWidth={2}/> Move Down</button>
                 <div className={`w-full h-px my-1.5 ${isDark ? 'bg-white/10' : 'bg-black/5'}`} />
                 <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); setIsMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300 hover:text-white' : 'hover:bg-stone-100 text-stone-600 hover:text-stone-900'}`}><Edit2 size={12} strokeWidth={2}/> Rename</button>
                 <button onClick={(e) => { e.stopPropagation(); onDelete(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-3 hover:bg-red-500/10 text-red-500 transition-colors"><Trash2 size={12} strokeWidth={2}/> Delete</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}