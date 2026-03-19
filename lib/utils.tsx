import React from 'react';

// --- HIGHLY ROUNDED SMOOTH PHYSICS & ANIMATIONS ---
export const modalSpring = { type: "spring" as const, bounce: 0.3, duration: 0.6 };
export const sheetSpring = { type: "spring" as const, bounce: 0.2, duration: 0.7 };
export const bounceHover = { scale: 1.04, transition: { type: "spring" as const, bounce: 0.5 } };
export const bounceTap = { scale: 0.94, transition: { type: "spring" as const, bounce: 0.5 } };

export const staggerVariants = { 
  hidden: { opacity: 0 }, 
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } } 
};

export const cardVariants = { 
  hidden: { opacity: 0, y: 24, filter: "blur(8px)", scale: 0.96 }, 
  visible: { opacity: 1, y: 0, filter: "blur(0px)", scale: 1, transition: { duration: 0.4, type: "spring" as const, bounce: 0.3 } },
  exit: { opacity: 0, scale: 0.96, filter: "blur(4px)", transition: { duration: 0.15 } }
};

export const downloadMedia = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'media-download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Download failed", error);
  }
};

export const formatTimestamp = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const cleanName = (nameStr: string | null | undefined) => {
  if (!nameStr || typeof nameStr !== 'string') return "User";
  return nameStr.includes('@') ? nameStr.split('@')[0] : nameStr;
};

export const renderChatText = (text: string, isDark: boolean) => {
  if (!text) return null;
  const parts = text.split(/(@\w+|#\w+)/g);
  return parts.map((part, i) => {
     if (part.startsWith('@')) return <span key={i} className="font-bold text-teal-500 bg-teal-500/10 px-2 py-0.5 rounded-full">{part}</span>;
     if (part.startsWith('#')) return <span key={i} className="font-bold text-emerald-500">{part}</span>;
     return part;
  });
};