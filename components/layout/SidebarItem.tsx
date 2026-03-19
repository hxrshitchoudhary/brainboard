import React from 'react';

export function SidebarItem({ icon, label, active, onClick, theme, isDark }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all group ${active ? (isDark ? 'bg-white/5 border border-white/5 shadow-sm text-teal-400' : 'bg-white border border-stone-200 shadow-sm text-teal-600') : `border border-transparent ${theme.btnGhost}`}`}>
      <div className="flex items-center gap-3.5">
        <div className={`transition-colors ${active ? 'text-inherit' : 'text-stone-500 group-hover:text-stone-900 dark:group-hover:text-zinc-100'}`}>{icon}</div>
        <span className="truncate">{label}</span>
      </div>
    </button>
  );
}