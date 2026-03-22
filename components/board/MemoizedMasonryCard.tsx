import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, Folder, List as ListIcon, FileText, X, RotateCcw, Trash2, Clock, CheckSquare, Square, Music, File as FileIcon, ImageIcon, Globe, Play, Circle, Hash, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { cleanName } from '@/lib/utils';
import { ReactionBar, APPLE_EMOJIS } from './ReactionBar';

export const MemoizedMasonryCard = memo(function MemoizedMasonryCard({ customFolders, customLists, onMoveToFolder, onMoveToList, onUpdateTags, onTagClick, item, theme, isDark, activeWorkspace, currentUserId, teamRole, viewMode, onClick, inTrash, onRestore, onHardDelete, onDelete, onUpdateSticky, toggleItemReaction, toggleChecklistItem, isSelected, onToggleSelect, isSelectMode, onPlayYouTube, teamMembers }: any) {
  const ytMatch = item.url?.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  const youtubeId = ytMatch ? ytMatch[1] : null;
  const isYouTube = !!youtubeId;
  const isInstagram = item.url?.includes('instagram.com');
  const isSocialVideo = item.url && (isInstagram || isYouTube);
  
  // 🔥 THE TYPE INTERCEPTOR: Strictly separates Uploaded Media from Web Links
  let itemType = 'note';
  if (isSocialVideo) {
      itemType = 'social_video';
  } else if (item.url) {
      // If it has a URL, it is a web link. (Uploaded audio/video/docs have URLs too, so we let those pass)
      if (item.type === 'video' || item.type === 'audio' || item.type === 'document') {
          itemType = item.type;
      } else {
          itemType = 'link'; // Force anything else (even if backend says 'image') to be a link
      }
  } else if (item.type === 'image') {
      itemType = 'image'; // True uploaded images have NO external url
  } else {
      itemType = item.type || 'note';
  }

  const displayImg = item.img || item.thumbnail_url; 
  
  const [isEditingSticky, setIsEditingSticky] = useState(false);
  const [stickyText, setStickyText] = useState(item.ai_summary || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [isCardMenuOpen, setIsCardMenuOpen] = useState(false);
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<'main' | 'folder' | 'list'>('main');
  const controlsRef = useRef<HTMLDivElement>(null);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const [tagInput, setTagInput] = useState((item.tags || []).join(', '));
  
  useEffect(() => {
     if (isTagMenuOpen) setTagInput((item.tags || []).join(', '));
  }, [isTagMenuOpen, item.tags]);

  useEffect(() => {
     if (!isCardMenuOpen) setTimeout(() => setMenuView('main'), 200);
  }, [isCardMenuOpen]);

  const canModify = activeWorkspace === 'personal' || teamRole === 'admin' || teamRole === 'editor' || item.user_id === currentUserId;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (controlsRef.current && !controlsRef.current.contains(event.target as Node)) {
         setIsCardMenuOpen(false);
         setIsTagMenuOpen(false);
      }
    }
    if (isCardMenuOpen || isTagMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCardMenuOpen, isTagMenuOpen]);

  const handleStickyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
     setStickyText(e.target.value);
  };

  const handleStickyBlur = () => {
     setIsEditingSticky(false);
     if (stickyText !== item.ai_summary && onUpdateSticky) {
        onUpdateSticky(item.id, stickyText);
     }
  };

  const handleDragStart = (e: any) => {
      e.dataTransfer.setData('application/x-brainboard-item', JSON.stringify({ id: item.id }));
      e.dataTransfer.effectAllowed = 'move';
  };

  const reactionsObj = useMemo(() => {
    if (!item?.likes) return {};
    try { return JSON.parse(item.likes); } catch { return {}; }
  }, [item?.likes]);
  const activeReactions = Object.entries(reactionsObj);

  const formatNotePreview = (text: string) => {
     if (!text) return null;
     const parts = text.split(/(\*\*.*?\*\*)/g);
     return parts.map((part, i) => {
         if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className={isDark ? 'text-white' : 'text-zinc-900'}>{part.slice(2, -2)}</strong>;
         if (part.startsWith('# ')) return <span key={i} className={`flex font-black text-xl mb-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{part.slice(2)}</span>;
         if (part.startsWith('- [ ] ')) return <span key={i} className="flex items-center gap-1.5 opacity-80"><Circle size={10} strokeWidth={2}/> {part.slice(6)}</span>;
         return part;
     });
  };

  return (
    <motion.div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      whileHover={{ y: -4 }} 
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onContextMenu={(e) => {
         e.preventDefault();
         if (canModify && !inTrash && !isSelectMode) {
             setIsCardMenuOpen(true);
             setIsTagMenuOpen(false);
         }
      }}
      onClick={(e) => {
         if (isSelectMode) {
             e.preventDefault();
             onToggleSelect(item.id, e.shiftKey);
         } else {
             if (inTrash) return; 
             // Strictly map clicks based on our new secure itemType
             if (isYouTube) {
                 onPlayYouTube(youtubeId);
             } else if (itemType === 'link' || itemType === 'social_video' || itemType === 'document') {
                 if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
             } else if (itemType === 'image' || itemType === 'video') {
                 onClick(e); // Let the parent page handle opening the media viewer
             } else {
                 onClick(e); // Notes
             }
         }
      }} 
      draggable={!inTrash && !isSelectMode}
      onDragStart={handleDragStart}
      className={`group/card relative rounded-[24px] transition-all duration-300 flex flex-col w-full border ${theme.card} ${theme.cardHover} ${itemType === 'note' && !inTrash ? 'cursor-text' : inTrash ? 'cursor-default' : 'cursor-pointer'} font-sans ${viewMode === 'card' ? 'h-85' : 'h-full'} ${isSelected ? 'ring-2 ring-teal-500 scale-[0.98]' : ''} ${isCardMenuOpen || isTagMenuOpen ? 'z-40 shadow-2xl' : 'z-10 hover:z-20'} ${!inTrash && !isSelectMode ? 'active:cursor-grabbing hover:cursor-grab' : ''}`}
    >
      <div className="absolute inset-0 rounded-[24px] pointer-events-none border border-white/5 mix-blend-overlay z-50"></div>
      
      <div
        className="pointer-events-none absolute -inset-px rounded-[24px] opacity-0 transition duration-300 group-hover/card:opacity-100 z-40"
        style={{ background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.06), transparent 50%)` }}
      />

      {canModify && (
         <div className="absolute top-3 left-3 z-40 pointer-events-auto">
            <button 
               onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect(item.id, e.shiftKey); }}
               className={`p-1.5 rounded-full transition-all border shadow-md backdrop-blur-xl active:scale-95 ${isSelected ? 'opacity-100 bg-teal-500 border-teal-500 text-white' : `opacity-0 group-hover/card:opacity-100 ${isDark ? 'bg-black/50 border-white/10 text-white hover:bg-black' : 'bg-white/90 border-black/5 text-zinc-800 hover:bg-white'}` }`}
            >
               <Check size={16} strokeWidth={isSelected ? 3 : 2} />
            </button>
         </div>
      )}

      {canModify && !inTrash && !isSelectMode && (
        <div className="absolute top-0 left-0 w-full z-40" ref={controlsRef}>
           <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-auto">
               <div className="relative group/btn">
                 <button 
                    aria-label="Edit Tags"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsTagMenuOpen(!isTagMenuOpen); setIsCardMenuOpen(false); }} 
                    className={`p-2 rounded-full opacity-0 group-hover/card:opacity-100 transition-all border shadow-md backdrop-blur-xl active:scale-95 ${isTagMenuOpen ? 'opacity-100' : ''} ${isDark ? 'bg-black/50 border-white/10 text-white hover:bg-black' : 'bg-white/90 border-black/5 text-zinc-800 hover:bg-white'}`}
                 >
                    <Hash size={14} strokeWidth={2.5} />
                 </button>
                 <div className="absolute top-full mt-2 right-0 px-2.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-bold rounded-lg opacity-0 translate-y-2 group-hover/btn:opacity-100 group-hover/btn:translate-y-0 transition-all pointer-events-none whitespace-nowrap shadow-xl z-50">Edit Tags</div>
               </div>
               
               <div className="relative group/btn">
                 <button 
                    aria-label="Card Options"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsCardMenuOpen(!isCardMenuOpen); setIsTagMenuOpen(false); setMenuView('main'); }} 
                    className={`p-2 rounded-full opacity-0 group-hover/card:opacity-100 transition-all border shadow-md backdrop-blur-xl active:scale-95 ${isCardMenuOpen ? 'opacity-100' : ''} ${isDark ? 'bg-black/50 border-white/10 text-white hover:bg-black' : 'bg-white/90 border-black/5 text-zinc-800 hover:bg-white'}`}
                 >
                    <MoreHorizontal size={14} strokeWidth={2.5} />
                 </button>
               </div>
           </div>
           
           <AnimatePresence>
              {isTagMenuOpen && (
                 <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -5 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`absolute top-12 left-3 right-3 origin-top z-50 rounded-2xl shadow-2xl border p-3 backdrop-blur-3xl pointer-events-auto ${isDark ? 'bg-zinc-900/95 border-white/10' : 'bg-white/95 border-zinc-200'}`}
                    onClick={e => e.stopPropagation()}
                 >
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 px-1 ${theme.textMuted}`}>Edit Tags</p>
                    <div className="relative">
                       <Hash size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                       <input 
                          autoFocus type="text" placeholder="react, ideas..." value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onBlur={() => {
                             const newTags = tagInput.split(',').map((t: string) => t.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')).filter(Boolean);
                             onUpdateTags(item.id, Array.from(new Set(newTags)));
                          }}
                          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                          className={`w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-teal-500/50 rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold outline-none transition-all ${theme.text}`}
                       />
                    </div>
                 </motion.div>
              )}
           </AnimatePresence>

           <AnimatePresence>
              {isCardMenuOpen && (
                 <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -5 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`absolute top-12 left-3 right-3 origin-top z-50 rounded-2xl shadow-2xl border p-1.5 backdrop-blur-3xl pointer-events-auto flex flex-col ${isDark ? 'bg-zinc-900/95 border-white/10' : 'bg-white/95 border-zinc-200'}`}
                    onClick={e => e.stopPropagation()}
                 >
                    {menuView === 'main' ? (
                       <>
                          <div className="flex items-center justify-around px-1 mb-1 pt-1 pb-1">
                             {['👍', '❤️', '🔥', '👀'].map(emoji => (
                                <button 
                                   key={emoji} 
                                   onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleItemReaction(item, emoji, currentUserId); setIsCardMenuOpen(false); }}
                                   className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-colors text-lg sm:text-xl"
                                >
                                   {APPLE_EMOJIS[emoji] ? (
                                      <img src={APPLE_EMOJIS[emoji]} alt={emoji} className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-md hover:scale-110 transition-transform" />
                                   ) : (
                                      <span>{emoji}</span>
                                   )}
                                </button>
                             ))}
                          </div>
                          
                          <div className={`w-full h-px my-1 mx-auto ${isDark ? 'bg-white/10' : 'bg-black/5'}`} />

                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuView('folder'); }} className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-100'}`}>
                             <div className="flex items-center gap-2.5 text-zinc-600 dark:text-zinc-300">
                                <Folder size={14} strokeWidth={2.5} className="text-zinc-400 dark:text-zinc-500" /> Folder
                             </div>
                             <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
                                <span className="truncate max-w-15 sm:max-w-20 font-medium">{item.section || item.sections?.[0] || 'None'}</span>
                                <ChevronRight size={14} />
                             </div>
                          </button>

                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuView('list'); }} className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-100'}`}>
                             <div className="flex items-center gap-2.5 text-zinc-600 dark:text-zinc-300">
                                <ListIcon size={14} strokeWidth={2.5} className="text-zinc-400 dark:text-zinc-500" /> List
                             </div>
                             <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
                                <span className="truncate max-w-15 sm:max-w-20 font-medium">{item.list_name || 'None'}</span>
                                <ChevronRight size={14} />
                             </div>
                          </button>

                          <div className={`w-full h-px my-1 mx-auto ${isDark ? 'bg-white/10' : 'bg-black/5'}`} />
                          
                          {!stickyText ? (
                             <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditingSticky(true); setIsCardMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}>
                                <FileText size={14} strokeWidth={2.5} className="text-zinc-400 dark:text-zinc-500" /> Add Sticky Note
                             </button>
                          ) : (
                             <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStickyText(""); onUpdateSticky(item.id, ""); setIsCardMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}>
                                <X size={14} strokeWidth={2.5} className="text-zinc-400 dark:text-zinc-500" /> Remove Sticky
                             </button>
                          )}
                          
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(item.id); setIsCardMenuOpen(false); }} className="w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2.5 hover:bg-red-500/10 text-red-500 transition-colors mt-0.5">
                             <Trash2 size={14} strokeWidth={2.5} /> Delete Item
                          </button>
                       </>
                    ) : menuView === 'folder' ? (
                       <div className="flex flex-col max-h-56 overflow-y-auto custom-scrollbar">
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuView('main'); }} className="flex items-center gap-2 px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors mb-1">
                             <ChevronLeft size={14} strokeWidth={2.5} /> Back
                          </button>
                          <div className={`w-full h-px mb-1 ${isDark ? 'bg-white/10' : 'bg-black/5'}`} />
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveToFolder(item.id, ""); setIsCardMenuOpen(false); }} className={`flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}>
                             None
                             {!item.section && !item.sections?.[0] && <Check size={14} strokeWidth={3} className="text-teal-500" />}
                          </button>
                          {customFolders?.map((f: string) => (
                             <button key={f} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveToFolder(item.id, f); setIsCardMenuOpen(false); }} className={`flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}>
                                <span className="truncate">{f}</span>
                                {(item.section === f || item.sections?.[0] === f) && <Check size={14} strokeWidth={3} className="text-teal-500 shrink-0" />}
                             </button>
                          ))}
                       </div>
                    ) : (
                       <div className="flex flex-col max-h-56 overflow-y-auto custom-scrollbar">
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuView('main'); }} className="flex items-center gap-2 px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors mb-1">
                             <ChevronLeft size={14} strokeWidth={2.5} /> Back
                          </button>
                          <div className={`w-full h-px mb-1 ${isDark ? 'bg-white/10' : 'bg-black/5'}`} />
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveToList(item.id, ""); setIsCardMenuOpen(false); }} className={`flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}>
                             None
                             {!item.list_name && <Check size={14} strokeWidth={3} className="text-teal-500" />}
                          </button>
                          {customLists?.map((l: string) => (
                             <button key={l} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMoveToList(item.id, l); setIsCardMenuOpen(false); }} className={`flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}>
                                <span className="truncate">{l}</span>
                                {item.list_name === l && <Check size={14} strokeWidth={3} className="text-teal-500 shrink-0" />}
                             </button>
                          ))}
                       </div>
                    )}
                 </motion.div>
              )}
           </AnimatePresence>
        </div>
      )}

      {/* Content wrapper with overflow-hidden isolated to protect menus */}
      <div className={`flex flex-col w-full h-full relative z-0 rounded-[24px] overflow-hidden ${isSelected ? 'opacity-80' : ''}`}>

        {inTrash && !isSelectMode ? (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-40 flex flex-col items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity gap-4 rounded-[24px]">
            <button onClick={(e) => { e.stopPropagation(); onRestore(item.id); }} className="bg-white text-black px-6 py-3 rounded-full text-sm font-bold flex items-center gap-2 shadow-xl active:scale-95 transition-all"><RotateCcw size={16} strokeWidth={1.5}/> Restore</button>
            <button onClick={(e) => { e.stopPropagation(); onHardDelete(item.id); }} className="bg-red-50 text-red-600 px-6 py-3 rounded-full text-sm font-bold flex items-center gap-2 shadow-xl active:scale-95 transition-all"><Trash2 size={16} strokeWidth={1.5}/> Delete</button>
          </div>
        ) : null}

        {(!inTrash && (stickyText || isEditingSticky)) && (
            <div 
              onClick={(e) => { 
                 e.preventDefault(); 
                 e.stopPropagation(); 
                 if(canModify) setIsEditingSticky(true); 
              }}
              className={`absolute top-4 left-4 z-30 w-24 h-24 bg-yellow-400/95 backdrop-blur-md text-yellow-950 p-2.5 shadow-xl font-sans text-[10px] font-medium leading-relaxed flex flex-col items-center justify-center text-center rounded-xl pointer-events-auto border border-yellow-300 overflow-hidden ${canModify && !isSelectMode ? 'cursor-text hover:scale-105 hover:bg-yellow-400' : 'cursor-default'} transition-all`}
            >
                {isEditingSticky ? (
                    <textarea 
                       ref={textareaRef} autoFocus value={stickyText} onChange={handleStickyChange} onBlur={handleStickyBlur}
                       className="w-full h-full bg-transparent text-yellow-950 outline-none resize-none placeholder:text-yellow-900/70 overflow-hidden text-center"
                       placeholder="Note..."
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                       <span className="line-clamp-4">{stickyText}</span>
                    </div>
                )}
            </div>
        )}

        {itemType === "image" || itemType === "video" || itemType === "audio" || itemType === "document" ? (
          <div className={`w-full relative font-sans flex-1 flex flex-col justify-between bg-transparent ${viewMode === 'card' ? 'h-full' : 'h-auto'}`}>
            {itemType === "video" && !item.url ? ( 
              <motion.video src={displayImg} muted autoPlay loop playsInline draggable={false} className={`w-full object-cover transition-transform duration-700 group-hover/card:scale-105 pointer-events-none ${viewMode === 'card' ? 'h-full' : 'h-auto'}`} />
            ) : displayImg ? (
              <motion.img src={displayImg} loading="lazy" draggable={false} alt={item.title || "Media"} className={`w-full object-cover transition-transform duration-700 group-hover/card:scale-105 ${viewMode === 'card' ? 'h-full' : 'h-auto'} pointer-events-none`} />
            ) : (
              <div className={`w-full flex items-center justify-center ${itemType === 'audio' || itemType === 'document' ? 'h-24' : 'h-40'}`}>
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
              <div className={`absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-10 pointer-events-none ${itemType === 'audio' ? 'pb-20' : ''}`}>
                 {item.title ? (
                   <>
                     <h3 className="text-white text-base font-bold tracking-tight drop-shadow-md leading-normal truncate w-[85%] [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">{item.title}</h3>
                     {item.content && <p className="text-white/90 text-xs truncate w-[85%] [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">{item.content}</p>}
                   </>
                 ) : (
                   <>
                     <div className="self-center mb-auto mt-auto bg-white/20 p-4 rounded-full text-white shadow-2xl backdrop-blur-xl">
                        {itemType === 'audio' ? <Music size={20} strokeWidth={1.5} className="ml-0.5" /> :
                         itemType === 'document' ? <FileIcon size={20} strokeWidth={1.5} className="ml-0.5" /> : 
                         <Play size={20} strokeWidth={1.5} className="fill-current ml-0.5" />}
                     </div>
                   </>
                 )}
              </div>
            )}
          </div>
          
        ) : (itemType === "link" || itemType === "social_video") ? (
          <div className="flex flex-col h-full justify-between font-sans relative">
            {displayImg && (
              (() => {
                const mediaHeightClass = viewMode === 'card' ? 'h-40' : (isInstagram ? 'aspect-[4/5]' : isYouTube ? 'aspect-video' : 'h-40');
                
                return (
                  <div className={`w-full relative shrink-0 border-b ${isDark ? 'border-white/5' : 'border-black/5'} ${mediaHeightClass}`}>
                    <div className="absolute inset-0 overflow-hidden rounded-t-[24px]">
                       <motion.img src={displayImg} loading="lazy" draggable={false} className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-700 pointer-events-none" />
                    </div>
                  </div>
                );
              })()
            )}
            <div className={`p-4 sm:p-5 flex flex-col flex-1 justify-between relative z-10 ${viewMode === 'card' ? 'overflow-hidden' : ''}`}>
               {!displayImg && <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-4 sm:mb-5 border shadow-sm shrink-0 ${isDark ? 'bg-[#121214] border-zinc-800' : 'bg-white border-stone-200'}`}><Globe size={20} strokeWidth={1.5} className="text-teal-500" /></div>}
              <div className="z-10 mt-auto w-full">
                <h3 className={`font-bold text-sm sm:text-base mb-1.5 tracking-tight leading-snug line-clamp-2 ${theme.text}`}>{item.title || "Untitled Link"}</h3>
                
                {itemType === 'social_video' ? (
                   <p className={`text-[10px] flex items-center gap-1.5 truncate font-bold uppercase tracking-widest ${theme.textMuted}`}>
                      {item.content || "Video"} {item.content && item.list_name ? '•' : ''} {item.list_name}
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
          <div className={`p-4 sm:p-6 flex flex-col relative ${viewMode === 'card' ? 'h-full' : 'h-full min-h-48 sm:min-h-56'}`}>
            {item.video_url && <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-full text-[10px] font-bold uppercase tracking-widest self-start shrink-0"><Clock size={12}/> Timestamp Note</div>}
            
            {item.title && <h3 className={`font-black text-lg sm:text-xl mb-3 tracking-tighter leading-snug pb-1 w-[85%] shrink-0 ${theme.text}`}>{item.title}</h3>}

            <div className={`text-sm font-medium leading-relaxed whitespace-pre-wrap flex-1 pb-4 overflow-hidden ${viewMode === 'card' ? 'line-clamp-4' : ''} ${theme.textMuted}`}>
               {item.is_checklist && item.checklist_items ? (
                   <div className="flex flex-col gap-2 mt-2 text-sm z-20 pointer-events-auto">
                       {item.checklist_items.slice(0, viewMode === 'card' ? 4 : undefined).map((ci: any) => (
                          <div key={ci.id} className="flex items-start gap-2" onClick={e => e.stopPropagation()}>
                              <button aria-label="Toggle Checkbox" disabled={!canModify || isSelectMode} onClick={() => {
                                  if(!canModify || isSelectMode) return;
                                  toggleChecklistItem(item, ci.id);
                              }} className={`mt-0.5 shrink-0 transition-transform ${canModify && !isSelectMode ? 'active:scale-90 cursor-pointer' : 'cursor-default opacity-70'}`}>
                                 {ci.checked ? <CheckSquare size={16} className="text-teal-500" /> : <Square size={16} className={theme.textMuted} />}
                              </button>
                              <span className={`${ci.checked ? 'line-through opacity-50' : ''}`}>{ci.text}</span>
                          </div>
                       ))}
                       {viewMode === 'card' && item.checklist_items.length > 4 && <span className="text-xs font-bold mt-1 opacity-50">+{item.checklist_items.length - 4} more items</span>}
                   </div>
               ) : (
                   formatNotePreview(item.content || item.description || item.ai_summary)
               )}
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t ${isDark ? 'from-[#09090B]' : 'from-white'} to-transparent pointer-events-none rounded-b-[24px]`} />
          </div>
        )}

        <div className={`flex flex-wrap gap-1.5 px-4 sm:px-5 ${item.tags && item.tags.length > 0 ? 'pb-2' : 'pb-4 sm:pb-5'} relative z-20 shrink-0 pointer-events-auto`}>
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
                         className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-transform ${isSelectMode ? 'opacity-50 cursor-default' : 'hover:scale-105 active:scale-95'} ${hasReacted ? 'bg-teal-500/10 text-teal-600 border border-teal-500/20 dark:text-teal-400 dark:border-teal-500/30' : (isDark ? 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10' : 'bg-black/5 text-zinc-600 border border-black/5 hover:bg-black/10')}`}
                       >
                         {APPLE_EMOJIS[emoji] ? (
                            <img src={APPLE_EMOJIS[emoji]} alt={emoji} className="w-3.5 h-3.5 drop-shadow-sm" />
                         ) : (
                            <span>{emoji}</span>
                         )}
                         <span>{users.length}</span>
                       </button>
                       <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-[9px] rounded-lg opacity-0 group-hover/reactionpill:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                          {tooltipText}
                       </div>
                   </div>
                 )
              })}
        </div>
        
        <div className={`pt-4 px-5 pb-5 mt-auto bg-transparent relative z-20 shrink-0 flex flex-col gap-3 ${isDark ? 'border-t border-white/5' : 'border-t border-black/5'}`}>
            {item.tags && item.tags.length > 0 && (
               <div className="flex flex-wrap gap-1.5 pointer-events-auto">
                  {item.tags.map((t: string) => (
                      <button 
                         key={t} 
                         disabled={isSelectMode}
                         onClick={(e) => { e.stopPropagation(); if(!isSelectMode) onTagClick(t); }} 
                         className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-transform ${isSelectMode ? 'opacity-50 cursor-default' : 'hover:scale-105 active:scale-95'} ${isDark ? 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10' : 'bg-black/5 text-zinc-600 hover:text-zinc-900 hover:bg-black/10'}`}
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