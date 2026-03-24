import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Folder, List as ListIcon, FileText, X, RotateCcw, Trash2, Clock, CheckSquare, Square, Music, File as FileIcon, ImageIcon, Globe, Play, Circle, Hash, Check, ChevronRight, ChevronLeft, MinusCircle } from 'lucide-react';
import { cleanName } from '@/lib/utils';
import { APPLE_EMOJIS } from './ReactionBar';

export const MemoizedMasonryCard = memo(function MemoizedMasonryCard({ customFolders, customLists, onMoveToFolder, onMoveToList, onUpdateTags, onTagClick, item, theme, isDark, activeWorkspace, currentUserId, teamRole, viewMode, onClick, inTrash, onRestore, onHardDelete, onDelete, onUpdateSticky, toggleItemReaction, toggleChecklistItem, isSelected, onToggleSelect, isSelectMode, onPlayYouTube, teamMembers, isActiveKeyboard, selectedItems, currentCategoryType, currentCategory, onRemoveFromContext }: any) {
  const ytMatch = item.url?.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  const youtubeId = ytMatch ? ytMatch[1] : null;
  const isYouTube = !!youtubeId;
  const isInstagram = item.url?.includes('instagram.com');
  const isSocialVideo = item.url && (isInstagram || isYouTube);
  
  const isSupabaseUpload = item.url && item.url.includes('supabase.co');
  
  let itemType = 'note';
  if (isSocialVideo) {
      itemType = 'social_video';
  } else if (item.type === 'image' || item.type === 'video' || item.type === 'audio' || item.type === 'document') {
      if (item.url && !isSupabaseUpload && item.type === 'image') { itemType = 'link'; } 
      else { itemType = item.type; }
  } else if (item.url) { itemType = 'link'; } 
  else { itemType = item.type || 'note'; }

  const displayImg = item.img || item.thumbnail_url; 
  
  const [isEditingSticky, setIsEditingSticky] = useState(false);
  const [stickyText, setStickyText] = useState(item.ai_summary || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [isCardMenuOpen, setIsCardMenuOpen] = useState(false);
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<'main' | 'folder' | 'list'>('main');
  
  const [menuCoords, setMenuCoords] = useState({ top: 0, right: 0, align: 'top-down' });
  const [mounted, setMounted] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      setMounted(true);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (viewMode === 'list') return; 
    if (cardRef.current && spotlightRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      spotlightRef.current.style.background = `radial-gradient(350px circle at ${x}px ${y}px, ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}, transparent 40%)`;
    }
  };

  const [tagInput, setTagInput] = useState((item.tags || []).join(', '));
  const hasSticky = !inTrash && (stickyText || isEditingSticky);
  
  useEffect(() => { if (isTagMenuOpen) setTagInput((item.tags || []).join(', ')); }, [isTagMenuOpen, item.tags]);
  useEffect(() => { if (!isCardMenuOpen) setTimeout(() => setMenuView('main'), 150); }, [isCardMenuOpen]);

  const canModify = activeWorkspace === 'personal' || teamRole !== 'viewer' || item.user_id === currentUserId;

  useEffect(() => {
     const down = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsCardMenuOpen(false);
            setIsTagMenuOpen(false);
        }
     };
     if (isCardMenuOpen || isTagMenuOpen) { document.addEventListener('keydown', down); }
     return () => document.removeEventListener('keydown', down);
  }, [isCardMenuOpen, isTagMenuOpen]);

  const handleStickyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => { setStickyText(e.target.value); };
  const handleStickyBlur = () => { setIsEditingSticky(false); if (stickyText !== item.ai_summary && onUpdateSticky) { onUpdateSticky(item.id, stickyText); } };
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => { 
      e.dataTransfer.effectAllowed = 'all'; 
      
      let dragPayload;
      const isMulti = isSelected && selectedItems && selectedItems.length > 1;

      if (isMulti) {
          dragPayload = { type: 'multi', payload: selectedItems };
      } else {
          dragPayload = { type: 'single', payload: item.id };
      }

      if (typeof window !== 'undefined') {
          (window as any).__bb_drag = dragPayload;
      }

      const badge = document.createElement('div');
      badge.id = 'ios-drag-badge';
      badge.style.position = 'absolute';
      badge.style.top = '-1000px';
      badge.style.left = '-1000px';
      badge.style.pointerEvents = 'none';
      badge.style.zIndex = '999999';

      const titleText = item.title || "Untitled Item";
      const displayText = isMulti ? `Moving ${selectedItems.length} items` : titleText;
      
      badge.innerHTML = `
          <div style="position: relative;">
              <div style="
                  background: ${isDark ? 'rgba(30, 30, 35, 0.85)' : 'rgba(255, 255, 255, 0.9)'};
                  backdrop-filter: blur(12px);
                  -webkit-backdrop-filter: blur(12px);
                  border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
                  color: ${isDark ? '#fff' : '#000'};
                  padding: 10px 16px;
                  border-radius: 14px;
                  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
                  font-size: 13px;
                  font-weight: 600;
                  box-shadow: 0 12px 30px rgba(0,0,0,0.2), 0 4px 10px rgba(0,0,0,0.1);
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  transform: rotate(-3deg) scale(0.95);
                  white-space: nowrap;
                  max-width: 220px;
                  z-index: 2;
                  position: relative;
              ">
                  ${isMulti ? `
                  <div style="
                      background: #14b8a6; color: white;
                      width: 22px; height: 22px; border-radius: 8px;
                      display: flex; align-items: center; justify-content: center;
                      font-size: 11px; font-weight: bold; flex-shrink: 0;
                  ">${selectedItems.length}</div>
                  ` : `
                  <div style="
                      background: rgba(20, 184, 166, 0.15); color: #14b8a6;
                      width: 22px; height: 22px; border-radius: 8px;
                      display: flex; align-items: center; justify-content: center;
                      flex-shrink: 0;
                  ">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                  </div>
                  `}
                  <span style="overflow: hidden; text-overflow: ellipsis;">${displayText}</span>
              </div>
              ${isMulti ? `
              <div style="
                  position: absolute; top: 4px; left: 4px; right: -4px; bottom: -4px;
                  background: ${isDark ? 'rgba(40, 40, 45, 0.6)' : 'rgba(240, 240, 240, 0.8)'};
                  border: 1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
                  border-radius: 14px; z-index: 1; transform: rotate(1deg);
              "></div>
              ` : ''}
          </div>
      `;

      document.body.appendChild(badge);
      
      e.dataTransfer.setDragImage(badge, 25, 25);
      e.dataTransfer.setData('application/json', JSON.stringify(dragPayload));
      e.dataTransfer.setData('text/plain', JSON.stringify(dragPayload));

      setTimeout(() => {
          const el = document.getElementById('ios-drag-badge');
          if (el) el.remove();
      }, 100);
  };

  const reactionsObj = useMemo(() => { try { return JSON.parse(item?.likes || '{}'); } catch { return {}; } }, [item?.likes]);
  const activeReactions = Object.entries(reactionsObj);

  const formatNotePreview = (text: string) => {
     if (!text) return null;
     const parts = text.split(/(\*\*.*?\*\*)/g);
     return parts.map((part, i) => {
         if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className={isDark ? 'text-white' : 'text-zinc-900'}>{part.slice(2, -2)}</strong>;
         if (part.startsWith('# ')) return <span key={i} className={`flex font-black text-xl mb-1 tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{part.slice(2)}</span>;
         if (part.startsWith('- [ ] ')) return <span key={i} className="flex items-center gap-1.5 opacity-80"><Circle size={10} strokeWidth={2}/> {part.slice(6)}</span>;
         return part;
     });
  };

  const calculateMenuPosition = (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setMenuCoords({ 
          top: spaceBelow < 250 ? rect.top - 8 : rect.bottom + 8, 
          right: window.innerWidth - rect.right, 
          align: spaceBelow < 250 ? 'bottom-up' : 'top-down' 
      });
  };

  const openCardMenu = (e: React.MouseEvent) => {
      e.preventDefault(); e.stopPropagation();
      calculateMenuPosition(e);
      setIsCardMenuOpen(true);
      setIsTagMenuOpen(false);
      setMenuView('main');
  };

  const openTagMenu = (e: React.MouseEvent) => {
      e.preventDefault(); e.stopPropagation();
      calculateMenuPosition(e);
      setIsTagMenuOpen(true);
      setIsCardMenuOpen(false);
  };

  // ---------------------------------------------------------------------------------
  // COMPACT LIST VIEW
  // ---------------------------------------------------------------------------------
  if (viewMode === 'list') {
    return (
       <motion.div 
          id={`card-${item.id}`} ref={cardRef}
          onClick={(e) => {
             if (isSelectMode) { e.preventDefault(); onToggleSelect(item.id, e.shiftKey); } 
             else {
                 if (inTrash) return; 
                 if (isYouTube) { onPlayYouTube(youtubeId); } 
                 else if (itemType === 'link' || (isInstagram) || (itemType === 'document' && item.url)) { window.open(item.url, '_blank', 'noopener,noreferrer'); } 
                 else { onClick(e); }
             }
          }}
          draggable={!inTrash} 
          onDragStart={handleDragStart as any} 
          onDragEnd={() => { if (typeof window !== 'undefined') (window as any).__bb_drag = null; }}
          className={`group/list relative rounded-2xl transition-all duration-200 flex flex-row items-center w-full border ${theme.card} ${theme.cardHover} p-3 gap-4 h-18 ${isSelected ? 'ring-2 ring-teal-500 bg-teal-500/5' : ''} ${isActiveKeyboard ? 'ring-2 ring-teal-500/80 shadow-[0_0_20px_rgba(20,184,166,0.2)]' : ''} lasso-selectable cursor-pointer font-sans`}
          data-id={item.id}
       >
          {canModify && (
             <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect(item.id, e.shiftKey); }} className={`p-1.5 shrink-0 rounded-lg transition-all border shadow-sm ${isSelected ? 'bg-teal-500 border-teal-500 text-white' : `opacity-0 group-hover/list:opacity-100 ${isDark ? 'bg-black/50 border-white/10 text-white hover:bg-black' : 'bg-white border-black/10 text-zinc-800 hover:bg-zinc-50'}` }`}>
                <Check size={14} strokeWidth={isSelected ? 3 : 2} />
             </button>
          )}

          <div className={`w-12 h-12 shrink-0 rounded-xl overflow-hidden flex items-center justify-center border shadow-sm ${isDark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-black/5'}`}>
             {displayImg ? (
                 <img src={displayImg} className="w-full h-full object-cover" alt="thumb" draggable={false} />
             ) : (
                 itemType === 'audio' ? <Music size={18} className="text-fuchsia-500 opacity-80" /> :
                 itemType === 'document' ? <FileIcon size={18} className="text-blue-500 opacity-80" /> :
                 itemType === 'link' ? <Globe size={18} className="text-teal-500" /> :
                 <FileText size={18} className={theme.textMuted} />
             )}
          </div>

          <div className="flex-1 flex flex-col min-w-0 pr-4">
             <h3 className={`text-sm font-bold truncate leading-tight ${theme.text}`}>{item.title || "Untitled Note"}</h3>
             <p className={`text-xs truncate font-medium mt-0.5 ${theme.textMuted}`}>{item.content || item.url || (item.tags || []).join(', ')}</p>
          </div>

          {inTrash ? (
             <div className="flex items-center gap-2 opacity-0 group-hover/list:opacity-100 transition-opacity pr-2 shrink-0">
                <button onClick={(e) => { e.stopPropagation(); onRestore(item.id); }} className="p-2.5 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors shadow-sm"><RotateCcw size={14}/></button>
                <button onClick={(e) => { e.stopPropagation(); onHardDelete(item.id); }} className="p-2.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-50 hover:text-white transition-colors shadow-sm"><Trash2 size={14}/></button>
             </div>
          ) : (
             <div className="flex items-center gap-2 opacity-0 group-hover/list:opacity-100 transition-opacity shrink-0">
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsTagMenuOpen(true); setIsCardMenuOpen(false); }} className={`p-2 rounded-lg border shadow-sm ${isDark ? 'bg-[#18181B] border-white/10 hover:bg-white/10 text-zinc-300' : 'bg-white border-black/10 hover:bg-zinc-100 text-zinc-600'} transition-colors`}><Hash size={14} strokeWidth={2.5}/></button>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsCardMenuOpen(true); setIsTagMenuOpen(false); setMenuView('main'); }} className={`p-2 rounded-lg border shadow-sm ${isDark ? 'bg-[#18181B] border-white/10 hover:bg-white/10 text-zinc-300' : 'bg-white border-black/10 hover:bg-zinc-100 text-zinc-600'} transition-colors`}><MoreHorizontal size={14} strokeWidth={2.5}/></button>
             </div>
          )}

          {hasSticky && (
             <div
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); if(canModify) setIsEditingSticky(true); }}
                className={`w-12 h-12 ml-2 bg-[#FDE047] text-yellow-900 p-1.5 shadow-sm font-sans text-[8px] font-bold leading-tight flex flex-col items-center justify-center rounded-md pointer-events-auto border border-yellow-300 shrink-0 transition-transform ${canModify && !isSelectMode ? 'cursor-text hover:scale-105' : 'cursor-default'}`}
                style={{ transform: 'rotate(2deg)' }}
             >
                 {isEditingSticky ? (
                     <textarea ref={textareaRef} autoFocus value={stickyText} onChange={handleStickyChange} onBlur={handleStickyBlur} className="w-full h-full bg-transparent text-yellow-900 outline-none resize-none placeholder:text-yellow-900/50 text-center font-bold custom-scrollbar" placeholder="Note" />
                 ) : (
                     <div className="w-full h-full flex items-center justify-center overflow-hidden"><div className="w-full text-center overflow-hidden line-clamp-3">{stickyText}</div></div>
                 )}
             </div>
          )}

          {/* Centered Portals for List View */}
          {isTagMenuOpen && mounted && typeof document !== 'undefined' && createPortal(
             <div className="fixed inset-0 z-999999 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setIsTagMenuOpen(false); }}>
                <motion.div 
                   initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.15, ease: "easeOut" }} 
                   className={`w-full max-w-sm mx-4 rounded-3xl shadow-2xl border p-5 backdrop-blur-xl pointer-events-auto ${isDark ? 'bg-[#18181B]/95 border-white/10' : 'bg-white/95 border-zinc-200'}`} onClick={e => e.stopPropagation()}
                >
                   <p className={`text-xs font-bold uppercase tracking-widest mb-4 px-1 ${theme.textMuted}`}>Edit Tags</p>
                   <div className="relative">
                      <Hash size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                      <input autoFocus type="text" placeholder="react, ideas..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onBlur={() => { const newTags = tagInput.split(',').map((t: string) => t.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')).filter(Boolean); onUpdateTags(item.id, Array.from(new Set(newTags))); setIsTagMenuOpen(false); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} className={`w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-teal-500/50 rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold outline-none transition-all ${theme.text}`} />
                   </div>
                </motion.div>
             </div>, document.body
          )}

          {isCardMenuOpen && mounted && typeof document !== 'undefined' && createPortal(
             <div className="fixed inset-0 z-999999 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setIsCardMenuOpen(false); }}>
                <motion.div 
                   initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.15, ease: "easeOut" }} 
                   className={`w-full max-w-70 mx-4 rounded-3xl shadow-2xl border p-2 backdrop-blur-xl pointer-events-auto flex flex-col ${isDark ? 'bg-[#18181B]/95 border-white/10' : 'bg-white/95 border-zinc-200'}`} onClick={e => e.stopPropagation()}
                >
                   {menuView === 'main' ? (
                      <>
                         <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuView('folder'); }} className={`w-full flex items-center justify-between px-4 py-3.5 text-sm font-bold rounded-2xl transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-zinc-100'}`}>
                            <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300"><Folder size={16} strokeWidth={2.5} className="text-zinc-400 dark:text-zinc-500" /> Folder</div>
                            <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500"><span className="truncate max-w-20 font-medium text-xs">{item.section || item.sections?.[0] || 'None'}</span><ChevronRight size={14} /></div>
                         </button>
                         <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuView('list'); }} className={`w-full flex items-center justify-between px-4 py-3.5 text-sm font-bold rounded-2xl transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-zinc-100'}`}>
                            <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300"><ListIcon size={16} strokeWidth={2.5} className="text-zinc-400 dark:text-zinc-500" /> List</div>
                            <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500"><span className="truncate max-w-20 font-medium text-xs">{item.list_name || 'None'}</span><ChevronRight size={14} /></div>
                         </button>
                         <div className={`w-full h-px my-1.5 mx-auto ${isDark ? 'bg-white/5' : 'bg-black/5'}`} />
                         
                         {/* Remove from Folder/List Context Action (List View) */}
                         {(currentCategoryType === 'folder' || currentCategoryType === 'list' || currentCategoryType === 'pinned' || currentCategoryType === 'type') && onRemoveFromContext && (
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveFromContext(item.id); setIsCardMenuOpen(false); }} className={`w-full text-left px-4 py-3.5 text-sm font-bold rounded-2xl flex items-center gap-3 transition-colors text-orange-500 hover:bg-orange-500/10 mt-0.5`}>
                               <MinusCircle size={16} strokeWidth={2.5} className="text-orange-500" /> 
                               {currentCategoryType === 'pinned' ? 'Unpin Item' : 
                                currentCategoryType === 'list' ? 'Remove from list' : 
                                `Remove from ${currentCategory}`}
                            </button>
                         )}

                         <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(item.id); setIsCardMenuOpen(false); }} className="w-full text-left px-4 py-3.5 text-sm font-bold rounded-2xl flex items-center gap-3 hover:bg-red-500/10 text-red-500 transition-colors mt-0.5"><Trash2 size={16} strokeWidth={2.5} /> Delete Item</button>
                      </>
                   ) : menuView === 'folder' ? (
                      <div className="flex flex-col max-h-64 overflow-y-auto custom-scrollbar p-1">
                         <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuView('main'); }} className="flex items-center gap-2 px-2 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors mb-1"><ChevronLeft size={16} strokeWidth={2.5} /> Back</button>
                         <div className={`w-full h-px mb-1.5 ${isDark ? 'bg-white/5' : 'bg-black/5'}`} />
                         <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveToFolder(item.id, ""); setIsCardMenuOpen(false); }} className={`flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/5 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}>None {!item.section && !item.sections?.[0] && <Check size={16} strokeWidth={3} className="text-teal-500" />}</button>
                         {customFolders?.map((f: string) => (
                            <button key={f} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveToFolder(item.id, f); setIsCardMenuOpen(false); }} className={`flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/5 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}><span className="truncate">{f}</span> {(item.section === f || item.sections?.[0] === f) && <Check size={16} strokeWidth={3} className="text-teal-500 shrink-0" />}</button>
                         ))}
                      </div>
                   ) : (
                      <div className="flex flex-col max-h-64 overflow-y-auto custom-scrollbar p-1">
                         <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuView('main'); }} className="flex items-center gap-2 px-2 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors mb-1"><ChevronLeft size={16} strokeWidth={2.5} /> Back</button>
                         <div className={`w-full h-px mb-1.5 ${isDark ? 'bg-white/5' : 'bg-black/5'}`} />
                         <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveToList(item.id, ""); setIsCardMenuOpen(false); }} className={`flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/5 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}>None {!item.list_name && <Check size={16} strokeWidth={3} className="text-teal-500" />}</button>
                         {customLists?.map((l: string) => (
                            <button key={l} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveToList(item.id, l); setIsCardMenuOpen(false); }} className={`flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/5 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}><span className="truncate">{l}</span> {item.list_name === l && <Check size={16} strokeWidth={3} className="text-teal-500 shrink-0" />}</button>
                         ))}
                      </div>
                   )}
                </motion.div>
             </div>, document.body
          )}
       </motion.div>
    );
  }

  // ---------------------------------------------------------------------------------
  // GRID / UNIFORM CARD VIEW
  // ---------------------------------------------------------------------------------
  return (
    <motion.div 
      id={`card-${item.id}`} ref={cardRef} onMouseMove={handleMouseMove} whileHover={{ y: -4 }} transition={{ duration: 0.15, ease: "easeOut" }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setIsCardMenuOpen(true); setIsTagMenuOpen(false); setMenuView('main'); }}
      onClick={(e) => {
         if (isSelectMode) { e.preventDefault(); onToggleSelect(item.id, e.shiftKey); } 
         else {
             if (inTrash) return; 
             if (isYouTube) { onPlayYouTube(youtubeId); } 
             else if (itemType === 'link' || (isInstagram) || (itemType === 'document' && item.url)) { window.open(item.url, '_blank', 'noopener,noreferrer'); } 
             else { onClick(e); }
         }
      }} 
      draggable={!inTrash} 
      onDragStart={handleDragStart as any}
      onDragEnd={() => { if (typeof window !== 'undefined') (window as any).__bb_drag = null; }}
      className={`group/card relative rounded-3xl transition-all duration-200 flex flex-col w-full border ${theme.card} ${theme.cardHover} ${itemType === 'note' && !inTrash ? 'cursor-text' : inTrash ? 'cursor-default' : 'cursor-pointer'} font-sans ${viewMode === 'card' ? 'h-85' : 'h-full'} ${isSelected ? 'ring-2 ring-teal-500 scale-[0.98]' : ''} ${isActiveKeyboard ? 'ring-4 ring-teal-500/80 shadow-[0_0_40px_rgba(20,184,166,0.4)] scale-[1.02]' : ''} ${!inTrash ? 'active:cursor-grabbing hover:cursor-grab' : ''} lasso-selectable`}
      style={{ zIndex: isCardMenuOpen || isTagMenuOpen ? 50 : 10 }}
      data-id={item.id}
    >
      <div className="absolute inset-0 rounded-3xl pointer-events-none border border-white/5 mix-blend-overlay" style={{ zIndex: 10 }}></div>
      <div ref={spotlightRef} className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-200 group-hover/card:opacity-100" style={{ zIndex: 5 }} />

      {/* ACTION BUTTONS (Select, Tag, Menu) */}
      {canModify && (
         <div className={`absolute top-4 flex items-center gap-2 pointer-events-auto transition-all duration-300 ease-out ${hasSticky ? 'right-25' : 'right-4'}`} ref={controlsRef} style={{ zIndex: 30 }}>
            
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect(item.id, e.shiftKey); }} className={`p-2 rounded-full transition-all border shadow-md backdrop-blur-xl active:scale-95 ${isSelected ? 'opacity-100 bg-teal-500 border-teal-500 text-white' : `opacity-0 group-hover/card:opacity-100 ${isDark ? 'bg-black/50 border-white/10 text-white hover:bg-black' : 'bg-white/90 border-black/5 text-zinc-800 hover:bg-white'}` }`}>
               <Check size={14} strokeWidth={isSelected ? 3 : 2.5} />
            </button>

            {!inTrash && !isSelectMode && (
               <>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsTagMenuOpen(true); setIsCardMenuOpen(false); }} className={`p-2 rounded-full opacity-0 group-hover/card:opacity-100 transition-all border shadow-lg backdrop-blur-xl active:scale-95 ${isTagMenuOpen ? 'opacity-100 bg-teal-500 text-white border-teal-500' : isDark ? 'bg-black/50 border-white/10 text-white hover:bg-black' : 'bg-white/90 border-black/5 text-zinc-800 hover:bg-white'}`}><Hash size={14} strokeWidth={2.5} /></button>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsCardMenuOpen(true); setIsTagMenuOpen(false); setMenuView('main'); }} className={`p-2 rounded-full opacity-0 group-hover/card:opacity-100 transition-all border shadow-lg backdrop-blur-xl active:scale-95 ${isCardMenuOpen ? 'opacity-100 bg-teal-500 text-white border-teal-500' : isDark ? 'bg-black/50 border-white/10 text-white hover:bg-black' : 'bg-white/90 border-black/5 text-zinc-800 hover:bg-white'}`}><MoreHorizontal size={14} strokeWidth={2.5} /></button>
               </>
            )}
         </div>
      )}

      {/* STICKY NOTE: Positioned Top-Right, slightly overlapping the edge */}
      {hasSticky && (
        <div
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); if(canModify) setIsEditingSticky(true); }}
          className={`absolute -top-4 -right-4 z-40 w-28 h-28 bg-[#FDE047] text-yellow-900 p-3 shadow-[0_15px_35px_rgba(0,0,0,0.3)] font-sans text-[11px] font-bold leading-relaxed flex flex-col items-center justify-center rounded-br-2xl rounded-tr-md rounded-bl-md rounded-tl-sm pointer-events-auto border border-yellow-300 transition-transform duration-200 origin-bottom-left ${canModify && !isSelectMode ? 'cursor-text hover:scale-105' : 'cursor-default'}`}
          style={{ transform: 'rotate(4deg)' }}
        >
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-4 bg-white/40 backdrop-blur-md shadow-sm rounded-sm" style={{ transform: 'rotate(-3deg)' }} />
            {isEditingSticky ? (
                <textarea ref={textareaRef} autoFocus value={stickyText} onChange={handleStickyChange} onBlur={handleStickyBlur} className="w-full h-full bg-transparent text-yellow-900 outline-none resize-none placeholder:text-yellow-900/50 text-center font-bold custom-scrollbar" placeholder="Note..." />
            ) : (
                <div className="w-full h-full flex items-center justify-center overflow-hidden"><div className="w-full text-center overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' }}>{stickyText}</div></div>
            )}
        </div>
      )}
           
      {/* CENTERED MODAL PORTALS FOR MENUS */}
      {isTagMenuOpen && mounted && typeof document !== 'undefined' && createPortal(
         <div className="fixed inset-0 z-999999 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setIsTagMenuOpen(false); }}>
             <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.15, ease: "easeOut" }} 
                className={`w-full max-w-sm mx-4 rounded-3xl shadow-2xl border p-5 backdrop-blur-xl pointer-events-auto ${isDark ? 'bg-[#18181B]/95 border-white/10' : 'bg-white/95 border-zinc-200'}`} onClick={e => e.stopPropagation()}
             >
                <p className={`text-xs font-bold uppercase tracking-widest mb-4 px-1 ${theme.textMuted}`}>Edit Tags</p>
                <div className="relative">
                   <Hash size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                   <input autoFocus type="text" placeholder="react, ideas..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onBlur={() => { const newTags = tagInput.split(',').map((t: string) => t.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')).filter(Boolean); onUpdateTags(item.id, Array.from(new Set(newTags))); setIsTagMenuOpen(false); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} className={`w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-teal-500/50 rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold outline-none transition-all ${theme.text}`} />
                </div>
             </motion.div>
         </div>,
         document.body
      )}

      {isCardMenuOpen && mounted && typeof document !== 'undefined' && createPortal(
         <div className="fixed inset-0 z-999999 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setIsCardMenuOpen(false); }}>
             <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.15, ease: "easeOut" }} 
                className={`w-full max-w-70 mx-4 rounded-3xl shadow-2xl border p-2 backdrop-blur-xl pointer-events-auto flex flex-col ${isDark ? 'bg-[#18181B]/95 border-white/10' : 'bg-white/95 border-zinc-200'}`} onClick={e => e.stopPropagation()}
             >
                {menuView === 'main' ? (
                   <>
                      <div className="flex items-center justify-around px-2 mb-2 pt-2 pb-1">
                         {['👍', '❤️', '🔥', '👀'].map(emoji => (
                            <button key={emoji} onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleItemReaction(item, emoji, currentUserId); setIsCardMenuOpen(false); }} className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-colors text-2xl">
                               {APPLE_EMOJIS[emoji] ? <img src={APPLE_EMOJIS[emoji]} alt={emoji} className="w-7 h-7 drop-shadow-md hover:scale-110 transition-transform duration-150" /> : <span>{emoji}</span>}
                            </button>
                         ))}
                      </div>
                      <div className={`w-full h-px my-1.5 mx-auto ${isDark ? 'bg-white/5' : 'bg-black/5'}`} />
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuView('folder'); }} className={`w-full flex items-center justify-between px-4 py-3.5 text-sm font-bold rounded-2xl transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-zinc-100'}`}>
                         <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300"><Folder size={16} strokeWidth={2.5} className="text-zinc-400 dark:text-zinc-500" /> Folder</div>
                         <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500"><span className="truncate max-w-20 font-medium text-xs">{item.section || item.sections?.[0] || 'None'}</span><ChevronRight size={14} /></div>
                      </button>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuView('list'); }} className={`w-full flex items-center justify-between px-4 py-3.5 text-sm font-bold rounded-2xl transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-zinc-100'}`}>
                         <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300"><ListIcon size={16} strokeWidth={2.5} className="text-zinc-400 dark:text-zinc-500" /> List</div>
                         <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500"><span className="truncate max-w-20 font-medium text-xs">{item.list_name || 'None'}</span><ChevronRight size={14} /></div>
                      </button>
                      <div className={`w-full h-px my-1.5 mx-auto ${isDark ? 'bg-white/5' : 'bg-black/5'}`} />
                      {!stickyText ? (
                         <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditingSticky(true); setIsCardMenuOpen(false); }} className={`w-full text-left px-4 py-3.5 text-sm font-bold rounded-2xl flex items-center gap-3 transition-colors ${isDark ? 'hover:bg-white/5 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}><FileText size={16} strokeWidth={2.5} className="text-zinc-400 dark:text-zinc-500" /> Add Sticky Note</button>
                      ) : (
                         <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStickyText(""); onUpdateSticky(item.id, ""); setIsCardMenuOpen(false); }} className={`w-full text-left px-4 py-3.5 text-sm font-bold rounded-2xl flex items-center gap-3 transition-colors ${isDark ? 'hover:bg-white/5 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}><X size={16} strokeWidth={2.5} className="text-zinc-400 dark:text-zinc-500" /> Remove Sticky</button>
                      )}
                      
                      {/* Remove from Folder/List Context Action (Grid View) */}
                      {(currentCategoryType === 'folder' || currentCategoryType === 'list' || currentCategoryType === 'pinned' || currentCategoryType === 'type') && onRemoveFromContext && (
                         <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveFromContext(item.id); setIsCardMenuOpen(false); }} className={`w-full text-left px-4 py-3.5 text-sm font-bold rounded-2xl flex items-center gap-3 transition-colors text-orange-500 hover:bg-orange-500/10 mt-0.5`}>
                            <MinusCircle size={16} strokeWidth={2.5} className="text-orange-500" /> 
                            {currentCategoryType === 'pinned' ? 'Unpin Item' : 
                             currentCategoryType === 'list' ? 'Remove from list' : 
                             `Remove from ${currentCategory}`}
                         </button>
                      )}

                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(item.id); setIsCardMenuOpen(false); }} className="w-full text-left px-4 py-3.5 text-sm font-bold rounded-2xl flex items-center gap-3 hover:bg-red-500/10 text-red-500 transition-colors mt-0.5"><Trash2 size={16} strokeWidth={2.5} /> Delete Item</button>
                   </>
                ) : menuView === 'folder' ? (
                   <div className="flex flex-col max-h-64 overflow-y-auto custom-scrollbar p-1">
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuView('main'); }} className="flex items-center gap-2 px-2 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors mb-1"><ChevronLeft size={16} strokeWidth={2.5} /> Back</button>
                      <div className={`w-full h-px mb-1.5 ${isDark ? 'bg-white/5' : 'bg-black/5'}`} />
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveToFolder(item.id, ""); setIsCardMenuOpen(false); }} className={`flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/5 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}>None {!item.section && !item.sections?.[0] && <Check size={16} strokeWidth={3} className="text-teal-500" />}</button>
                      {customFolders?.map((f: string) => (
                         <button key={f} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveToFolder(item.id, f); setIsCardMenuOpen(false); }} className={`flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/5 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}><span className="truncate">{f}</span> {(item.section === f || item.sections?.[0] === f) && <Check size={16} strokeWidth={3} className="text-teal-500 shrink-0" />}</button>
                      ))}
                   </div>
                ) : (
                   <div className="flex flex-col max-h-64 overflow-y-auto custom-scrollbar p-1">
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuView('main'); }} className="flex items-center gap-2 px-2 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors mb-1"><ChevronLeft size={16} strokeWidth={2.5} /> Back</button>
                      <div className={`w-full h-px mb-1.5 ${isDark ? 'bg-white/5' : 'bg-black/5'}`} />
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveToList(item.id, ""); setIsCardMenuOpen(false); }} className={`flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/5 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}>None {!item.list_name && <Check size={16} strokeWidth={3} className="text-teal-500" />}</button>
                      {customLists?.map((l: string) => (
                         <button key={l} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveToList(item.id, l); setIsCardMenuOpen(false); }} className={`flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/5 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}><span className="truncate">{l}</span> {item.list_name === l && <Check size={16} strokeWidth={3} className="text-teal-500 shrink-0" />}</button>
                      ))}
                   </div>
                )}
             </motion.div>
         </div>, document.body
      )}

      <div className={`flex flex-col w-full h-full relative z-0 ${isSelected ? 'opacity-80' : ''}`}>

        {inTrash && !isSelectMode ? (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-40 flex flex-col items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity gap-4 rounded-3xl duration-200">
            <button onClick={(e) => { e.stopPropagation(); onRestore(item.id); }} className="bg-white text-black px-6 py-3 rounded-full text-sm font-bold flex items-center gap-2 shadow-xl active:scale-95 transition-all duration-150"><RotateCcw size={16} strokeWidth={1.5}/> Restore</button>
            <button onClick={(e) => { e.stopPropagation(); onHardDelete(item.id); }} className="bg-red-50 text-red-600 px-6 py-3 rounded-full text-sm font-bold flex items-center gap-2 shadow-xl active:scale-95 transition-all duration-150"><Trash2 size={16} strokeWidth={1.5}/> Delete</button>
          </div>
        ) : null}

        {itemType === "image" || itemType === "video" || itemType === "audio" || itemType === "document" ? (
          <div className={`w-full relative font-sans flex-1 flex flex-col justify-between bg-transparent ${viewMode === 'card' ? 'h-full' : 'h-auto'}`}>
            {itemType === "video" && !item.url ? ( 
              <motion.video src={displayImg} muted autoPlay loop playsInline draggable={false} className={`w-full object-cover transition-transform duration-200 group-hover/card:scale-105 pointer-events-none rounded-t-3xl ${viewMode === 'card' ? 'h-full rounded-b-3xl' : 'h-auto'}`} />
            ) : displayImg ? (
              <motion.img src={displayImg} loading="lazy" draggable={false} alt={item.title || "Media"} className={`w-full object-cover transition-transform duration-200 group-hover/card:scale-[1.02] pointer-events-none rounded-t-3xl ${viewMode === 'card' ? 'h-full rounded-b-3xl' : 'h-auto'}`} />
            ) : (
              <div className={`w-full flex items-center justify-center rounded-t-3xl ${itemType === 'audio' || itemType === 'document' ? 'h-24' : 'h-40'} ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                 {itemType === 'audio' ? <Music size={32} strokeWidth={1.5} className="text-fuchsia-500 opacity-60" /> :
                  itemType === 'document' ? <FileIcon size={32} strokeWidth={1.5} className="text-blue-500 opacity-60" /> :
                  <ImageIcon size={32} strokeWidth={1} className="text-zinc-400 opacity-50" />}
              </div>
            )}

            {itemType === 'audio' && item.url && (
                <div onClick={e => e.stopPropagation()} className="w-full px-6 pb-4 z-20 pointer-events-auto">
                   <audio controls src={item.url} className="w-full h-10" />
                </div>
            )}
            
            {!inTrash && !isSelectMode && (
              <div className={`absolute inset-0 flex flex-col justify-end p-6 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 z-10 pointer-events-none rounded-3xl ${itemType === 'audio' ? 'pb-20' : ''}`}>
                 {item.title ? (
                   <>
                     <h3 className="text-white text-base font-black tracking-tight drop-shadow-md leading-normal truncate w-[85%] [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">{item.title}</h3>
                     {item.content && <p className="text-white/90 text-xs truncate w-[85%] [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">{item.content}</p>}
                   </>
                 ) : (
                   <>
                     <div className="self-center mb-auto mt-auto bg-white/20 p-4 rounded-full text-white shadow-2xl backdrop-blur-xl">
                        {itemType === 'audio' ? <Music size={20} strokeWidth={1.5} className="ml-0.5" /> : itemType === 'document' ? <FileIcon size={20} strokeWidth={1.5} className="ml-0.5" /> : <Play size={20} strokeWidth={1.5} className="fill-current ml-0.5" />}
                     </div>
                   </>
                 )}
              </div>
            )}
          </div>
          
        ) : (itemType === "link" || itemType === "social_video") ? (
          <div className="flex flex-col h-full justify-between font-sans relative">
            {displayImg && (
              <div className={`w-full shrink-0 border-b ${isDark ? 'border-white/5' : 'border-black/5'} relative overflow-hidden rounded-t-3xl ${viewMode === 'card' ? 'h-40' : (isInstagram ? 'aspect-4/5' : isYouTube ? 'aspect-video' : 'h-40')}`}>
                 <motion.img layoutId={`media-${item.id}`} src={displayImg} loading="lazy" draggable={false} className="w-full h-full object-cover group-hover/card:scale-[1.02] transition-transform duration-200 pointer-events-none" />
              </div>
            )}
            <div className={`p-5 flex flex-col flex-1 justify-between relative z-10 ${!displayImg ? 'pt-16' : ''} ${viewMode === 'card' ? 'overflow-hidden' : ''}`}>
              {!displayImg && (
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-sm shrink-0 border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-[#FAFAFA] border-black/5'}`}>
                     <Globe size={22} strokeWidth={1.5} className="text-teal-500" />
                  </div>
              )}
              <div className="z-10 mt-auto w-full">
                <h3 className={`font-black text-lg mb-2 tracking-tight leading-snug line-clamp-2 ${theme.text}`}>{item.title || "Untitled Link"}</h3>
                {itemType === 'social_video' ? (
                    <p className={`text-[10px] flex items-center gap-1.5 truncate font-bold uppercase tracking-widest ${theme.textMuted}`}>
                       {item.content || "Video"}
                    </p>
                ) : (
                    <p className={`text-[10px] flex items-center gap-1.5 truncate font-bold uppercase tracking-widest ${theme.textMuted}`}>
                       {new URL(item.url || 'http://link').hostname.replace('www.', '')}
                    </p>
                )}
              </div>
            </div>
          </div>

        ) : (
          <div className={`p-5 md:p-6 pt-16 md:pt-16 flex flex-col relative flex-1 ${viewMode === 'card' ? 'h-full' : 'h-full min-h-48'}`}>
            {item.video_url && <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-full text-[10px] font-bold uppercase tracking-widest self-start shrink-0"><Clock size={12}/> Timestamp Note</div>}
            
            {item.title && <h3 className={`font-black text-xl md:text-2xl mb-3 tracking-tighter leading-snug pb-1 w-[85%] shrink-0 ${theme.text}`}>{item.title}</h3>}

            <div className={`text-sm font-medium leading-relaxed whitespace-pre-wrap flex-1 pb-8 overflow-hidden ${viewMode === 'card' ? 'line-clamp-4' : ''} ${theme.textMuted}`}>
               {item.is_checklist && item.checklist_items ? (
                   <div className="flex flex-col gap-2 mt-2 text-sm z-20 pointer-events-auto">
                       {item.checklist_items.slice(0, viewMode === 'card' ? 4 : undefined).map((ci: any) => (
                          <div key={ci.id} className="flex items-start gap-2" onClick={e => e.stopPropagation()}>
                              <button aria-label="Toggle Checkbox" disabled={!canModify || isSelectMode} onClick={() => {
                                  if(!canModify || isSelectMode) return;
                                  toggleChecklistItem(item, ci.id);
                              }} className={`mt-0.5 shrink-0 transition-transform duration-150 ${canModify && !isSelectMode ? 'active:scale-90 cursor-pointer' : 'cursor-default opacity-70'}`}>
                                 {ci.checked ? <CheckSquare size={16} className="text-teal-500" /> : <Square size={16} className={theme.textMuted} />}
                              </button>
                              <span className={`${ci.checked ? 'line-through opacity-50' : ''}`}>{ci.text}</span>
                          </div>
                       ))}
                       {viewMode === 'card' && item.checklist_items.length > 4 && <span className="text-xs font-bold mt-1 opacity-50">+{item.checklist_items.length - 4} more items</span>}
                   </div>
               ) : !item.title && !item.content && !item.is_checklist ? (
                   <span className="opacity-30 italic">Empty note...</span>
               ) : (
                   formatNotePreview(item.content || item.description || item.ai_summary)
               )}
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t ${isDark ? 'from-[#141416]' : 'from-white'} to-transparent pointer-events-none rounded-b-3xl`} />
          </div>
        )}

        <div className={`flex flex-wrap gap-1.5 px-5 ${item.tags && item.tags.length > 0 ? 'pb-2' : 'pb-5'} relative z-20 shrink-0 pointer-events-auto`}>
              {activeReactions.map(([emoji, users]: any) => {
                 const hasReacted = users.includes(currentUserId);
                 const reactorNames = users.map((uid: string) => {
                    if (uid === currentUserId) return "You";
                    const member = teamMembers?.find((m: any) => m.id === uid);
                    return member ? cleanName(member.name) : "Someone";
                 });
                 const tooltipText = reactorNames.join(", ");

                 return (
                   <div key={emoji} className="relative group/reactionpill">
                       <button 
                         disabled={isSelectMode}
                         onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleItemReaction(item, emoji, currentUserId); }}
                         className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-transform duration-150 ${isSelectMode ? 'opacity-50 cursor-default' : 'hover:scale-105 active:scale-95'} ${hasReacted ? 'bg-teal-500/10 text-teal-600 border border-teal-500/20 dark:text-teal-400 dark:border-teal-500/30' : (isDark ? 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10' : 'bg-black/5 text-zinc-600 border border-black/5 hover:bg-black/10')}`}
                       >
                         {APPLE_EMOJIS[emoji] ? (
                            <img src={APPLE_EMOJIS[emoji]} alt={emoji} className="w-3.5 h-3.5 drop-shadow-sm" />
                         ) : (
                            <span>{emoji}</span>
                         )}
                         <span>{users.length}</span>
                       </button>
                       <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-[9px] rounded-lg opacity-0 group-hover/reactionpill:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-150">
                          {tooltipText}
                       </div>
                   </div>
                 )
              })}
        </div>
        
        <div className={`pt-4 px-5 pb-5 mt-auto bg-transparent relative z-20 shrink-0 flex flex-col gap-3 border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
            {item.tags && item.tags.length > 0 && (
               <div className="flex flex-wrap gap-1.5 pointer-events-auto">
                  {item.tags.map((t: string) => (
                      <button 
                         key={t} 
                         disabled={isSelectMode}
                         onClick={(e) => { e.stopPropagation(); if(!isSelectMode) onTagClick(t); }} 
                         className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-transform duration-150 ${isSelectMode ? 'opacity-50 cursor-default' : 'hover:scale-105 active:scale-95'} ${isDark ? 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10' : 'bg-black/5 text-zinc-600 hover:text-zinc-900 hover:bg-black/10'}`}
                      >
                         {t}
                      </button>
                  ))}
               </div>
            )}

            {activeWorkspace === 'team' && item.creator && (
               <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${theme.textMuted}`}>
                   <img src={item.creator_avatar || `https://api.dicebear.com/9.x/shapes/svg?seed=${item.creator}`} className="w-5 h-5 rounded-full border border-white/10 shadow-sm" />
                   {cleanName(item.creator)}
               </div>
            )}
        </div>
      </div>
    </motion.div>
  );
});