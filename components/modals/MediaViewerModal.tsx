import React, { useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, FastForward, Minimize2, Maximize2, ZoomIn, ZoomOut, Download, Trash2, X } from 'lucide-react';
import { BentoItem } from '@/app/types';
import { formatTimestamp, downloadMedia } from '@/lib/utils';
import { ReactionBar } from '@/components/board/ReactionBar';

export function MediaViewerModal({ media, updateMedia, closeMediaViewer, session, teamRole, nav, setEditingNote, profile, teamWorkspaceId, moveToTrash, toggleItemReaction, theme, isDark, items }: any) {
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const currentItem = items.find((i: BentoItem) => i.id === media.item?.id) || media.item;

  const cycleVideoSpeed = useCallback(() => {
    updateMedia({ speed: media.speed >= 2 ? 0.5 : media.speed + 0.5 });
    if (videoPlayerRef.current) videoPlayerRef.current.playbackRate = media.speed >= 2 ? 0.5 : media.speed + 0.5;
  }, [media.speed, updateMedia]);

  if (!media.item) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, backdropFilter: "blur(0px)" }} animate={{ opacity: 1, backdropFilter: "blur(24px)" }} exit={{ opacity: 0, backdropFilter: "blur(0px)" }} transition={{ duration: 0.3 }}
        className={`fixed inset-0 z-[100] flex ${media.isScrollMode ? 'items-start overflow-y-auto custom-scrollbar pt-24' : 'items-center justify-center overflow-hidden'} bg-black/95 p-8`}
        onClick={closeMediaViewer}
      >
        <div className="fixed top-8 right-8 flex items-center gap-3 z-[110]" onClick={e => e.stopPropagation()}>
           {currentItem.type === 'video' && (
             <div className="flex items-center bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-full p-1.5">
               <button onClick={() => {
                  const t = videoPlayerRef.current?.currentTime || 0;
                  closeMediaViewer();
                  const newItem: BentoItem = {
                     id: `temp-${Date.now()}`, user_id: session.user.id, workspace_id: nav.workspace === 'team' ? teamWorkspaceId : undefined,
                     creator: profile.displayName, type: "note", title: `${currentItem?.title} - Notes`, 
                     content: `[${formatTimestamp(t)}] `, video_url: currentItem?.url,
                     sections: nav.categoryType === 'folder' ? [nav.category] : ["Inbox"],
                  };
                  setEditingNote(newItem);
               }} className="flex items-center gap-2 px-5 py-3 text-white/80 hover:text-emerald-400 hover:bg-emerald-500/20 rounded-full transition-all active:scale-95 text-sm font-bold">
                 <Clock size={18} strokeWidth={2} /> Log Time
               </button>
               <div className="w-px h-6 bg-white/20 mx-1" />
               <button onClick={cycleVideoSpeed} className="flex items-center gap-2 px-5 py-3 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-all active:scale-95 text-sm font-bold">
                 <FastForward size={18} strokeWidth={2} /> {media.speed}x
               </button>
             </div>
           )}
           {currentItem.type === 'image' && (
             <div className="flex items-center bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-full p-1.5">
               <button aria-label="Toggle Scroll Mode" onClick={() => updateMedia({ isScrollMode: !media.isScrollMode })} className={`p-3.5 rounded-full transition-all active:scale-95 ${media.isScrollMode ? 'bg-white text-black shadow-md' : 'text-white/80 hover:text-white hover:bg-white/20'}`}>
                 {media.isScrollMode ? <Minimize2 size={20} strokeWidth={1.5} /> : <Maximize2 size={20} strokeWidth={1.5} />}
               </button>
               {!media.isScrollMode && (
                 <>
                   <div className="w-px h-6 bg-white/20 mx-1" />
                   <button aria-label="Zoom In" onClick={() => updateMedia({ zoom: media.zoom + 0.75 })} className="p-3.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-all active:scale-95"><ZoomIn size={20} strokeWidth={1.5} /></button>
                   <button aria-label="Zoom Out" onClick={() => updateMedia({ zoom: Math.max(1, media.zoom - 0.75) })} className="p-3.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-all active:scale-95"><ZoomOut size={20} strokeWidth={1.5} /></button>
                 </>
               )}
             </div>
           )}
           <div className="flex items-center bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-full p-1.5">
             <button aria-label="Download Media" onClick={() => downloadMedia(currentItem?.url || currentItem?.thumbnail_url || currentItem?.img || "", currentItem?.title || 'media')} className="p-3.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-all active:scale-95"><Download size={20} strokeWidth={1.5} /></button>
             {(nav.workspace === 'personal' || teamRole === 'admin' || teamRole === 'editor' || currentItem.user_id === session?.user?.id) && (
                <button aria-label="Delete Media" onClick={() => { moveToTrash(currentItem.id); closeMediaViewer(); }} className="p-3.5 text-white/80 hover:text-red-400 hover:bg-red-500/20 rounded-full transition-all active:scale-95"><Trash2 size={20} strokeWidth={1.5} /></button>
             )}
           </div>
           <button aria-label="Close Viewer" className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 text-white rounded-full transition-all shadow-2xl ml-2 active:scale-95" onClick={closeMediaViewer}><X size={22} strokeWidth={2} /></button>
        </div>

        <div className="fixed bottom-8 left-8 z-[110]">
           <ReactionBar item={currentItem} currentUserId={session?.user?.id} onToggleReaction={toggleItemReaction} isDark={true} theme={theme} />
        </div>
        
        <div className={`flex w-full transition-all duration-300`}>
           <motion.div 
             layoutId={`media-${currentItem.id}`} 
             className={`relative ${media.isScrollMode ? 'w-full max-w-5xl mx-auto pb-32' : 'w-full h-full max-w-[90vw] flex items-center justify-center mx-auto'}`}
             onClick={(e) => e.stopPropagation()}
           >
             {currentItem.type === 'video' ? (
               <video ref={videoPlayerRef} src={currentItem.url || currentItem.thumbnail_url} controls autoPlay playsInline className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain bg-black" />
             ) : (
               <motion.img 
                 drag={media.zoom > 1 && !media.isScrollMode} 
                 dragConstraints={media.zoom > 1 ? { top: -500 * media.zoom, bottom: 500 * media.zoom, left: -500 * media.zoom, right: 500 * media.zoom } : undefined} 
                 dragElastic={0.2} dragMomentum={true}
                 animate={{ scale: media.zoom }} 
                 transition={{ type: "spring", stiffness: 300, damping: 25 }}
                 src={currentItem.thumbnail_url || currentItem.img} alt={currentItem.title || "Media"} 
                 className={`rounded-2xl shadow-2xl ${media.isScrollMode ? 'w-full h-auto object-cover' : 'max-w-full max-h-[85vh] object-contain'} ${media.zoom > 1 && !media.isScrollMode ? 'cursor-grab active:cursor-grabbing' : ''}`} 
               />
             )}
           </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}