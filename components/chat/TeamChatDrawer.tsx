// filepath: components/chat/TeamChatDrawer.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Trash2, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cleanName, sheetSpring } from '@/lib/utils';

export function TeamChatDrawer({ 
  isChatOpen, closeChat, navWorkspace, isDark, theme, 
  chatMessages, chatScrollRef, session, mentionQuery, teamMembers, 
  insertMention, chatInput, handleTextareaChange, handleSendChatMessage, chatInputRef, teamRole, clearChat 
}: any) {

  return (
    <AnimatePresence>
       {isChatOpen && navWorkspace === 'team' && (
         <>
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-90 md:hidden" onClick={closeChat} />
           <motion.div 
             initial={{ x: '100%', opacity: 0 }} 
             animate={{ x: 0, opacity: 1 }} 
             exit={{ x: '100%', opacity: 0 }} 
             transition={sheetSpring}
             className={`fixed top-0 right-0 w-full md:w-100 h-full shadow-[0_0_80px_rgba(0,0,0,0.5)] flex flex-col z-200 ${isDark ? 'bg-[#09090b]' : 'bg-[#fcfaf8] border-l border-stone-200'}`}
           >
             <div className={`px-6 py-5 flex justify-between items-center border-b w-full shrink-0 ${isDark ? 'border-white/5 bg-[#09090b]' : 'border-black/5 bg-[#fcfaf8]'}`}>
                <h3 className="font-black tracking-tight text-xl flex items-center gap-2">
                   <MessageSquare className="text-teal-500" size={20} strokeWidth={2.5}/> Team Chat
                </h3>
                <div className="flex items-center gap-3">
                  {/* UPGRADED: Explicit Admin Clear All Button */}
                  {teamRole === 'admin' && chatMessages.length > 0 && (
                     <button onClick={clearChat} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-full transition-colors shadow-sm" title="Clear All Chats">
                        <Trash2 size={14}/> <span className="hidden sm:inline">Clear All</span>
                     </button>
                  )}
                  <button onClick={closeChat} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors" aria-label="Close Chat"><X size={20} className={theme.textMuted}/></button>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 custom-scrollbar flex flex-col-reverse" ref={chatScrollRef}>
                {chatMessages.length === 0 ? (
                   <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 space-y-4 my-auto h-full pb-20">
                      <MessageSquare size={48} strokeWidth={1} className={theme.textMuted} />
                      <div className="space-y-1">
                         <h3 className="font-bold text-lg">No messages yet.</h3>
                         <p className={`text-sm ${theme.textMuted}`}>Start the conversation!</p>
                      </div>
                   </div>
                ) : (
                  [...chatMessages].reverse().map((msg: any) => {
                    const isMe = msg.user_id === session?.user?.id;
                    return (
                       <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex max-w-[85%] gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                             {!isMe && <img src={msg.creator_avatar} loading="lazy" className="w-8 h-8 rounded-full shadow-sm object-cover shrink-0" />}
                             <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                               {!isMe && <span className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1 ${theme.textMuted}`}>{cleanName(msg.creator_name)}</span>}
                               <div className={`p-4 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-wrap shadow-sm ${isMe ? 'bg-teal-600 text-white rounded-tr-sm' : (isDark ? 'bg-white/10 text-zinc-100 rounded-tl-sm' : 'bg-white border border-stone-200 text-stone-800 rounded-tl-sm')}`}>
                                  {msg.text}
                               </div>
                               <span className={`text-[9px] font-bold mt-1.5 px-1 uppercase tracking-widest opacity-60 ${theme.textMuted}`}>{formatDistanceToNow(new Date(msg.created_at))} ago</span>
                             </div>
                          </div>
                       </div>
                    );
                  })
                )}
             </div>

             <div className={`px-5 pt-4 pb-6 border-t relative shrink-0 ${isDark ? 'border-white/5 bg-[#09090b]' : 'border-black/5 bg-white'}`}>
                <AnimatePresence>
                   {mentionQuery.active && mentionQuery.target === 'chat' && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`absolute bottom-full left-4 right-4 mb-2 rounded-2xl shadow-2xl border p-2 backdrop-blur-xl ${isDark ? 'bg-zinc-800/95 border-zinc-700' : 'bg-white/95 border-stone-200'}`}>
                         <p className={`text-[10px] font-bold uppercase tracking-widest px-3 py-2 mb-1 ${theme.textMuted}`}>Mention Team Member</p>
                         {teamMembers.filter((m: any) => m.name.toLowerCase().includes(mentionQuery.query.toLowerCase())).map((member: any) => (
                            <button key={member.id} onClick={() => insertMention(cleanName(member.name))} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors active:scale-95 ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-stone-100 text-stone-900'}`}>
                               <img src={member.avatar} loading="lazy" className="w-6 h-6 rounded-full object-cover shrink-0" />
                               <span className="text-xs font-bold">{cleanName(member.name)}</span>
                            </button>
                         ))}
                      </motion.div>
                   )}
                </AnimatePresence>
                <div className="relative">
                   <textarea 
                     ref={chatInputRef}
                     value={chatInput} 
                     onChange={handleTextareaChange}
                     onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChatMessage(); } }}
                     placeholder="Type a message... use @ to mention."
                     className={`w-full rounded-3xl py-3.5 pl-5 pr-14 text-sm font-medium outline-none transition-all resize-none min-h-13 max-h-32 custom-scrollbar ${theme.input} shadow-inner`}
                     rows={1}
                   />
                   <button onClick={handleSendChatMessage} disabled={!chatInput.trim()} className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-2.5 rounded-full transition-all ${chatInput.trim() ? 'bg-teal-500 text-white shadow-md active:scale-90 hover:bg-teal-400' : 'bg-transparent text-stone-400 cursor-not-allowed'}`}>
                      <Send size={16} className={chatInput.trim() ? "translate-x-0.5" : ""} />
                   </button>
                </div>
             </div>
           </motion.div>
         </>
       )}
    </AnimatePresence>
  );
}