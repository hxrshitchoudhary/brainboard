import React, { useState } from 'react';

export function SidebarItem({ icon, label, active, onClick, theme, isDark, onDropItem, onDropItems, onDropFiles }: any) {
  const [isDragOver, setIsDragOver] = useState(false);

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
     
     if (typeof window !== 'undefined' && (window as any).__bb_drag) {
         parsed = (window as any).__bb_drag;
     } else {
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
        return; 
     }

     if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onDropFiles) {
         onDropFiles(Array.from(e.dataTransfer.files));
     }
  };

  return (
    <button 
       onClick={onClick} 
       onDragEnter={handleDragEnter}
       onDragLeave={handleDragLeave}
       onDragOver={handleDragOver}
       onDrop={handleDrop}
       className={`relative w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all overflow-hidden group ${
          isDragOver 
             ? 'bg-teal-500/20 border border-teal-500/50 shadow-inner text-teal-500 scale-[1.02]' 
             : active 
                ? (isDark ? 'bg-white/5 border border-white/5 shadow-sm text-teal-400' : 'bg-white border border-stone-200 shadow-sm text-teal-600') 
                : `border border-transparent ${theme.btnGhost}`
       }`}
    >
      {/* Active Indicator Accent Line */}
      {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500 rounded-r-full" />}
      
      <div className="flex items-center gap-3.5 pointer-events-none">
        <div className={`transition-colors pointer-events-none ${active || isDragOver ? 'text-inherit' : 'text-stone-500 group-hover:text-stone-900 dark:group-hover:text-zinc-100'}`}>{icon}</div>
        <span className="truncate pointer-events-none">{label}</span>
      </div>
    </button>
  );
}