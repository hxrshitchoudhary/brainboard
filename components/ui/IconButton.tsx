import React from 'react';

export function IconButton({ icon, onClick, active, theme, title, hoverClass }: any) {
  return (
    <button onClick={onClick} title={title} aria-label={title} className={`p-3 rounded-full transition-all active:scale-95 ${active ? theme.btnPrimary : (hoverClass || theme.btnGhost)}`}>
      {icon}
    </button>
  );
}