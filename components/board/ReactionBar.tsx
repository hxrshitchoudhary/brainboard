import React, { useMemo } from 'react';
import { Smile } from 'lucide-react';

// --- APPLE EMOJI IMAGE MAP ---
// Note: For production, it's best to download these images and put them in your /public folder.
export const APPLE_EMOJIS: Record<string, string> = {
  '👍': 'https://em-content.zobj.net/source/apple/354/thumbs-up_1f44d.png',
  '❤️': 'https://em-content.zobj.net/source/apple/354/red-heart_2764-fe0f.png',
  '🔥': 'https://em-content.zobj.net/source/apple/354/fire_1f525.png',
  '👀': 'https://em-content.zobj.net/source/apple/354/eyes_1f440.png',
  '🚀': 'https://em-content.zobj.net/source/apple/354/rocket_1f680.png'
};

export function ReactionBar({ item, currentUserId, onToggleReaction, isDark, theme }: any) {
  const reactionsObj = useMemo(() => {
     if (!item?.likes) return {};
     try { return JSON.parse(item.likes); } catch { return {}; }
  }, [item?.likes]);

  const reactionEmojis = ["👍", "❤️", "🔥", "👀", "🚀"];
  const hasReactions = Object.keys(reactionsObj).length > 0;

  return (
    <div className="flex items-center gap-1.5 flex-wrap pointer-events-auto" onClick={e => e.stopPropagation()}>
      {Object.entries(reactionsObj).map(([emoji, users]: any) => {
         const hasReacted = users.includes(currentUserId);
         return (
           <button 
             key={emoji} 
             onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleReaction(item, emoji, currentUserId); }}
             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 border ${hasReacted ? 'bg-teal-500/20 text-teal-600 border-teal-500/30 dark:text-teal-400 dark:border-teal-500/30' : (isDark ? 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10' : 'bg-black/5 text-stone-600 border-black/5 hover:bg-black/10')}`}
             aria-label={`Reacted with ${emoji}`}
           >
             {APPLE_EMOJIS[emoji] ? (
                <img src={APPLE_EMOJIS[emoji]} alt={emoji} className="w-4.5 h-4.5 drop-shadow-sm" />
             ) : (
                <span>{emoji}</span>
             )}
             <span>{users.length}</span>
           </button>
         )
      })}

      <div className="relative group/reaction">
        <button aria-label="Add Reaction" className={`p-2 rounded-full transition-all active:scale-95 border opacity-0 group-hover/card:opacity-100 ${hasReactions ? 'opacity-100' : ''} ${isDark ? 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200' : 'bg-black/5 border-black/5 text-stone-500 hover:bg-black/10 hover:text-stone-800'}`}>
           <Smile size={16} />
        </button>
        <div className="absolute bottom-[calc(100%+0.5rem)] left-0 hidden group-hover/reaction:flex flex-col z-50 after:content-[''] after:absolute after:top-full after:left-0 after:w-full after:h-4">
            <div className={`flex items-center gap-1 p-2 rounded-full shadow-xl border backdrop-blur-xl ${isDark ? 'bg-zinc-800/95 border-white/10' : 'bg-white/95 border-stone-200'}`}>
               {reactionEmojis.map(e => (
                  <button 
                    key={e} 
                    onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); onToggleReaction(item, e, currentUserId); }}
                    className="w-10 h-10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 rounded-full transition-all"
                    aria-label={`React with ${e}`}
                  >
                    {APPLE_EMOJIS[e] ? (
                       <img src={APPLE_EMOJIS[e]} alt={e} className="w-5.5 h-5.5 drop-shadow-md hover:scale-110 transition-transform" />
                    ) : (
                       <span className="text-xl">{e}</span>
                    )}
                  </button>
               ))}
            </div>
        </div>
      </div>
    </div>
  )
}