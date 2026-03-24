import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { MoreVertical, Edit2, Trash2, ArrowUp, ArrowDown, Check, X } from 'lucide-react';

export const SidebarEditableItem = ({ icon, label, active, onClick, onRename, onDelete, onMoveUp, onMoveDown, onDropItem, onDropItems, onDropFiles, theme, isDark, canModify }: any) => {
   const [isMenuOpen, setIsMenuOpen] = useState(false);
   const [isEditing, setIsEditing] = useState(false);
   const [editValue, setEditValue] = useState(label);
   const [mounted, setMounted] = useState(false);
   const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0 });
   const [isDragOver, setIsDragOver] = useState(false); 
   const menuRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
      setMounted(true);
   }, []);

   useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
         if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsMenuOpen(false);
         }
      }
      
      const handleScroll = () => {
          setIsMenuOpen(false);
      };

      if (isMenuOpen) {
          document.addEventListener("mousedown", handleClickOutside);
          window.addEventListener("scroll", handleScroll, true);
      }

      return () => {
          document.removeEventListener("mousedown", handleClickOutside);
          window.removeEventListener("scroll", handleScroll, true);
      };
   }, [isMenuOpen]);

   const handleRenameSubmit = () => {
       if (editValue.trim() && editValue.trim() !== label) {
           onRename(label, editValue.trim());
       }
       setIsEditing(false);
   };

   const openMenu = (e: React.MouseEvent) => {
       e.preventDefault();
       e.stopPropagation();
       const rect = e.currentTarget.getBoundingClientRect();
       setMenuCoords({ top: rect.top, left: rect.right + 12 });
       setIsMenuOpen(true);
   };

   // --- WINDOWS-LIKE DRAG AND DROP HANDLERS ---
   const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
   };

   const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
         setIsDragOver(false);
      }
   };

   const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
   };

   const handleDrop = (e: React.DragEvent) => {
      e.preventDefault(); 
      e.stopPropagation();
      setIsDragOver(false);
      
      let parsed = null;
      
      // 1. Check highly reliable global fallback
      if (typeof window !== 'undefined' && (window as any).__bb_drag) {
          parsed = (window as any).__bb_drag;
      } else {
          // 2. Check standard event data
          const internalData = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
          if (internalData) {
             try { parsed = JSON.parse(internalData); } catch (err) {}
          }
      }

      if (parsed) {
         if (parsed.type === 'multi' && onDropItems) {
            onDropItems(parsed.payload);
         } else if (parsed.type === 'single' && onDropItem) {
            onDropItem(parsed.payload);
         }
         
         if (typeof window !== 'undefined') (window as any).__bb_drag = null;
         return; // Early exit so we don't accidentally treat the drag as a file drop
      }

      // Handle External Files dropped directly onto this folder from Desktop
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onDropFiles) {
          onDropFiles(Array.from(e.dataTransfer.files));
      }
   };

   return (
      <div 
         className="relative group w-full"
         onDragEnter={handleDragEnter}
         onDragLeave={handleDragLeave}
         onDragOver={handleDragOver}
         onDrop={handleDrop}
      >
         {isEditing ? (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl border shadow-sm ${theme.card}`}>
               <input 
                  autoFocus 
                  type="text" 
                  value={editValue} 
                  onChange={e => setEditValue(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') { setIsEditing(false); setEditValue(label); } }}
                  className={`bg-transparent border-none outline-none text-sm font-bold w-full ${theme.text}`} 
               />
               <button onClick={handleRenameSubmit} className="text-teal-500 hover:text-teal-400"><Check size={14} strokeWidth={3} /></button>
               <button onClick={() => { setIsEditing(false); setEditValue(label); }} className={theme.textMuted}><X size={14} strokeWidth={2.5} /></button>
            </div>
         ) : (
            <div className="flex items-center relative">
               <button 
                   onClick={onClick} 
                   className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-bold transition-all border border-transparent ${
                      isDragOver 
                         ? 'bg-teal-500/20 text-teal-500 border-teal-500/50 shadow-inner scale-[1.02]' 
                         : active 
                            ? (isDark ? 'bg-white/10 text-white shadow-inner' : 'bg-black/5 text-black shadow-inner') 
                            : `${theme.textMuted} ${theme.btnGhost}`
                   }`}
               >
                   <span className={`pointer-events-none ${active || isDragOver ? 'text-teal-500' : ''}`}>{icon}</span>
                   <span className="truncate pointer-events-none">{label}</span>
               </button>
               
               {canModify && (
                   <button 
                       onClick={openMenu} 
                       className={`absolute right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${isMenuOpen ? 'opacity-100 bg-white/10' : 'hover:bg-white/10'} ${theme.textMuted}`}
                   >
                       <MoreVertical size={14} strokeWidth={2.5} />
                   </button>
               )}

               {isMenuOpen && mounted && typeof document !== 'undefined' && createPortal(
                  <div style={{ position: 'fixed', top: menuCoords.top, left: menuCoords.left, zIndex: 999999 }}>
                     <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, scale: 0.95, x: -10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className={`w-44 rounded-2xl border shadow-2xl flex flex-col p-1.5 backdrop-blur-3xl ${isDark ? 'bg-zinc-900/95 border-white/10' : 'bg-white/95 border-zinc-200'}`}
                     >
                        <button onClick={() => { setIsEditing(true); setIsMenuOpen(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}>
                           <Edit2 size={14} /> Rename
                        </button>
                        <button onClick={() => { onMoveUp(); setIsMenuOpen(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}>
                           <ArrowUp size={14} /> Move Up
                        </button>
                        <button onClick={() => { onMoveDown(); setIsMenuOpen(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}>
                           <ArrowDown size={14} /> Move Down
                        </button>
                        <div className={`w-full h-px my-1 mx-auto ${isDark ? 'bg-white/10' : 'bg-black/5'}`} />
                        <button onClick={() => { onDelete(); setIsMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold rounded-xl text-red-500 hover:bg-red-500/10 transition-colors">
                           <Trash2 size={14} /> Delete
                        </button>
                     </motion.div>
                  </div>,
                  document.body
               )}
            </div>
         )}
      </div>
   );
};