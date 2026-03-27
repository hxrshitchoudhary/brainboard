import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ExternalLink, ZoomIn, ZoomOut, Maximize, Download } from 'lucide-react';

export const MediaViewerModal = ({ media, updateMedia, closeMediaViewer, items }: any) => {
  const [zoom, setZoom] = useState(1);

  // Strictly filter out external web links
  const mediaItems = items?.filter((i: any) => {
      const isExternalLink = i.url && !i.url.includes('supabase.co');
      return !isExternalLink && (i.type === 'image' || i.type === 'video');
  }) || [];
  
  const currentIndex = media.item ? mediaItems.findIndex((i: any) => i.id === media.item.id) : -1;

  const navigate = (dir: number) => {
    const newIdx = currentIndex + dir;
    if (newIdx >= 0 && newIdx < mediaItems.length) {
      setZoom(1); // Reset zoom on next/prev
      updateMedia({ item: mediaItems[newIdx] });
    }
  };

  // Keyboard controls for Navigation & Zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMediaViewer();
      if (e.key === 'ArrowRight') navigate(1);
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === '=' || e.key === '+') setZoom(z => Math.min(z + 0.5, 5));
      if (e.key === '-') setZoom(z => Math.max(z - 0.5, 1));
    };

    if (media.item) {
        window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, mediaItems.length, media.item, closeMediaViewer]);

  // Mouse Wheel Zooming
  const handleWheel = (e: React.WheelEvent) => {
     e.stopPropagation();
     if (e.deltaY < 0) {
        setZoom(z => Math.min(z + 0.25, 5)); // Zoom In
     } else {
        setZoom(z => Math.max(z - 0.25, 1)); // Zoom Out
     }
  };

  // Double Click Zoom
  const handleDoubleClick = (e: React.MouseEvent) => {
     e.stopPropagation();
     setZoom(z => z > 1 ? 1 : 2.5); 
  };

  // Smart Drag Physics
  const handleDragEnd = (e: any, info: any) => {
    if (zoom > 1) return; // Do not close or navigate if zoomed in

    // Flick to close or swipe to navigate only at 100% zoom
    if (Math.abs(info.offset.y) > 120 || Math.abs(info.velocity.y) > 500) {
      closeMediaViewer();
    } else if (info.offset.x > 100 && currentIndex > 0) {
      navigate(-1);
    } else if (info.offset.x < -100 && currentIndex < mediaItems.length - 1) {
      navigate(1);
    }
  };

  // Native Download Handler
  const handleDownload = async (e: React.MouseEvent) => {
     e.stopPropagation();
     const url = media.item.url || media.item.img || media.item.thumbnail_url;
     if (!url) return;
     try {
         const response = await fetch(url);
         const blob = await response.blob();
         const blobUrl = window.URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.style.display = 'none';
         a.href = blobUrl;
         a.download = media.item.title || `brainboard-media-${Date.now()}`;
         document.body.appendChild(a);
         a.click();
         window.URL.revokeObjectURL(blobUrl);
     } catch (err) {
         window.open(url, '_blank');
     }
  };

  return (
    <AnimatePresence>
      {media.item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/95 backdrop-blur-3xl touch-none"
          onClick={closeMediaViewer}
          onWheel={handleWheel}
        >
          {/* Top Bar Navigation */}
          <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <div className="text-white/70 text-sm font-bold tracking-widest uppercase">
              {currentIndex >= 0 ? `${currentIndex + 1} / ${mediaItems.length}` : 'Media View'}
            </div>
            <div className="flex items-center gap-3 pointer-events-auto">
              <button onClick={handleDownload} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-xl" title="Download Media">
                <Download size={20} />
              </button>
              {media.item.url && (
                <a href={media.item.url} target="_blank" rel="noreferrer" className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-xl" onClick={e => e.stopPropagation()} title="Open Original">
                  <ExternalLink size={20} />
                </a>
              )}
              <div className="w-px h-6 bg-white/20 mx-1" />
              <button onClick={closeMediaViewer} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-xl">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Side Nav Arrows */}
          {currentIndex > 0 && zoom === 1 && (
            <button onClick={(e) => { e.stopPropagation(); navigate(-1); }} className="absolute left-6 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/5 hover:bg-white/20 text-white transition-colors z-50 backdrop-blur-xl hidden md:block">
              <ChevronLeft size={28} />
            </button>
          )}
          {currentIndex < mediaItems.length - 1 && zoom === 1 && (
            <button onClick={(e) => { e.stopPropagation(); navigate(1); }} className="absolute right-6 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/5 hover:bg-white/20 text-white transition-colors z-50 backdrop-blur-xl hidden md:block">
              <ChevronRight size={28} />
            </button>
          )}

          {/* The Media Canvas */}
          <div className="w-full h-full flex items-center justify-center p-4 md:p-24 overflow-hidden">
            <motion.div
              drag
              // BALANCED PHYSICS: 
              // 1. Lock bounds when zoom is 1. When > 1, let them pan freely.
              dragConstraints={zoom === 1 ? { left: 0, right: 0, top: 0, bottom: 0 } : undefined}
              // 2. Kill elasticity when zoomed in for instant 1:1 pixel mouse tracking
              dragElastic={zoom === 1 ? 0.8 : 0}
              // 3. Kill momentum when zoomed so the image doesn't "slide away" like ice when you let go of the mouse
              dragMomentum={zoom === 1 ? true : false}
              onDragEnd={handleDragEnd}
              onClick={e => e.stopPropagation()}
              onDoubleClick={handleDoubleClick}
              animate={{ 
                  scale: zoom, 
                  x: zoom === 1 ? 0 : undefined, 
                  y: zoom === 1 ? 0 : undefined 
              }}
              // 4. Snappier, tighter spring so zoom adjustments feel instant, not floaty
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
              className={`relative flex items-center justify-center ${zoom > 1 ? 'cursor-move' : 'cursor-grab active:cursor-grabbing'}`}
            >
              {media.item.type === 'video' && media.item.url ? (
                <video src={media.item.url} controls={zoom === 1} autoPlay loop className="max-w-[95vw] max-h-[85vh] rounded-xl shadow-2xl" />
              ) : (
                <img src={media.item.img || media.item.thumbnail_url} alt={media.item.title} className="max-w-[95vw] max-h-[85vh] object-contain rounded-xl shadow-2xl select-none pointer-events-none" draggable={false} />
              )}
            </motion.div>
          </div>

          {/* Metadata Display - Cleaned and Reduced font sizes */}
          <div className="absolute bottom-0 inset-x-0 p-6 pb-12 flex flex-col items-center text-center z-[40] bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
            <h2 className="text-white text-lg md:text-xl font-bold tracking-tight mb-1 drop-shadow-2xl">{media.item.title || "Untitled Upload"}</h2>
            {media.item.content && <p className="text-white/80 text-xs md:text-sm font-medium max-w-2xl drop-shadow-xl">{media.item.content}</p>}
          </div>

          {/* Glass Toolbar for Zoom Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 z-50 shadow-2xl pointer-events-auto" onClick={e => e.stopPropagation()}>
             <button onClick={() => setZoom(z => Math.max(z - 0.5, 1))} className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Zoom Out">
                <ZoomOut size={18} />
             </button>
             
             <div className="text-xs font-bold text-white/90 w-14 text-center select-none cursor-default font-mono tracking-tighter">
                {Math.round(zoom * 100)}%
             </div>
             
             <button onClick={() => setZoom(z => Math.min(z + 0.5, 5))} className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Zoom In">
                <ZoomIn size={18} />
             </button>
             
             <div className="w-px h-4 bg-white/20 mx-1" />
             
             <button onClick={() => setZoom(1)} className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Reset Zoom">
                <Maximize size={18} />
             </button>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}