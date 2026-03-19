import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, MoreHorizontal, Folder, List as ListIcon, CalendarIcon, Pin, Trash2, Save, Bold, Italic, Strikethrough, Heading1, Quote, Code, ListTodo, CheckSquare, Square, X, Plus, Hash, Check } from 'lucide-react';
import { BentoItem } from '@/app/types';
import { sheetSpring, modalSpring, cleanName } from '@/lib/utils';
import { RobustTextareaEditor } from '@/components/ui/RobustTextareaEditor';

export function NoteEditorModal({ editingNote, updateLocalNoteState, handleCloseAndSave, moveToTrash, ui, updateUi, theme, isDark, teamMembers, mentionQuery, setMentionQuery, nav, session, teamRole, showToast, toggleItemReaction, items, profile }: any) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<'main' | 'folder' | 'list'>('main');
  const controlsRef = useRef<HTMLDivElement>(null);

  const currentItem = useMemo(() => {
     if (editingNote && !String(editingNote.id).startsWith('temp-')) {
         return items.find((i: BentoItem) => i.id === editingNote.id) || editingNote;
     }
     return editingNote;
  }, [items, editingNote]);

  const [tagInput, setTagInput] = useState((currentItem?.tags || []).join(', '));
  
  useEffect(() => {
     if (isTagMenuOpen) setTagInput((currentItem?.tags || []).join(', '));
  }, [isTagMenuOpen, currentItem?.tags]);

  useEffect(() => {
     if (!isOptionsMenuOpen) setTimeout(() => setMenuView('main'), 200);
  }, [isOptionsMenuOpen]);

  const canModify = nav.workspace === 'personal' || teamRole === 'admin' || teamRole === 'editor' || editingNote?.user_id === session?.user?.id;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (controlsRef.current && !controlsRef.current.contains(event.target as Node)) {
         setIsOptionsMenuOpen(false);
         setIsTagMenuOpen(false);
      }
    }
    if (isOptionsMenuOpen || isTagMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOptionsMenuOpen, isTagMenuOpen]);

  const applyFormatting = (prefix: string, suffix: string = prefix) => {
    if (!textareaRef.current || !editingNote || !canModify) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = editingNote.content || "";
    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
    
    updateLocalNoteState(editingNote.id, "content", newText);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + prefix.length, end + prefix.length);
      }
    }, 10);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!canModify) return;
    const val = e.target.value;
    updateLocalNoteState(editingNote!.id, "content", val);
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursor);
    const match = textBeforeCursor.match(/@(\w*)$/);
    if (match && nav.workspace === 'team') {
       setMentionQuery({ active: true, query: match[1], target: 'note' });
    } else {
       setMentionQuery({ active: false, query: '', target: 'note' });
    }
  };

  const insertNoteMention = (name: string) => {
    if (!canModify) return;
    const currentText = editingNote?.content || "";
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const textBeforeCursor = currentText.substring(0, cursor);
    const textAfterCursor = currentText.substring(cursor);
    const textWithoutQuery = textBeforeCursor.replace(/@\w*$/, '');
    const newText = textWithoutQuery + `@${name.replace(/\s+/g, '')} ` + textAfterCursor;
    updateLocalNoteState(editingNote!.id, "content", newText);
    setMentionQuery({ active: false, query: '', target: 'note' });
    setTimeout(() => { if(textareaRef.current) textareaRef.current.focus(); }, 10);
  };

  return (
    <AnimatePresence>
      {editingNote && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
          className="fixed inset-0 z-999 flex flex-col items-center justify-end bg-black/50 backdrop-blur-md"
          onMouseDown={handleCloseAndSave}
        >
          <motion.div 
            initial={{ y: "100%", opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: "100%", opacity: 0 }} 
            transition={sheetSpring}
            onMouseDown={(e) => e.stopPropagation()} 
            className={`relative w-full max-w-6xl h-[95vh] flex flex-col rounded-t-[3rem] shadow-[0_-20px_60px_rgba(0,0,0,0.4)] overflow-hidden border-t border-l border-r ${isDark ? 'border-white/10 bg-[#09090b]' : 'border-stone-200 bg-[#fcfaf8]'} pt-2`}
          >
            <div className="w-16 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mb-4 shrink-0" />

            <div className={`flex justify-between items-center px-10 pb-6 shrink-0 border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
              <button onClick={handleCloseAndSave} className={`flex items-center gap-2 text-sm font-bold ${theme.textMuted} hover:${theme.text} transition-colors active:scale-95`}>
                 <ChevronLeft size={18} /> Back to Dashboard
              </button>
              
              <div className="flex items-center gap-3">
                {canModify && (
                  <div className="relative flex items-center gap-2" ref={controlsRef}>
                    
                    {/* TAGS POPOVER */}
                    <div className="relative flex flex-col items-end">
                       <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsTagMenuOpen(!isTagMenuOpen); setIsOptionsMenuOpen(false); }} className={`p-3 rounded-full transition-all border shadow-sm active:scale-95 ${isTagMenuOpen ? 'opacity-100 bg-black/5 dark:bg-white/10' : theme.card} hover:opacity-80`}>
                          <Hash size={18} strokeWidth={2.5} />
                       </button>
                       <AnimatePresence>
                          {isTagMenuOpen && (
                             <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -5 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} 
                                className={`absolute right-0 top-full mt-2 w-60 origin-top-right z-100 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] border p-3 backdrop-blur-3xl ${isDark ? 'bg-[#1C1C1E]/95 border-zinc-700' : 'bg-white/95 border-stone-200'}`}
                             >
                                <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 px-1 ${theme.textMuted}`}>Edit Tags</p>
                                <div className="relative">
                                   <Hash size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-400' : 'text-stone-400'}`} />
                                   <input 
                                      autoFocus type="text" placeholder="react, ideas..." value={tagInput}
                                      onChange={(e) => setTagInput(e.target.value)}
                                      onBlur={() => {
                                         const newTags = tagInput.split(',').map((t: string) => t.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')).filter(Boolean);
                                         updateLocalNoteState(editingNote.id, "tags", Array.from(new Set(newTags)));
                                      }}
                                      onKeyDown={e => { if(e.key === 'Enter') e.currentTarget.blur(); }}
                                      className={`w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-teal-500/50 rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold outline-none transition-all ${theme.text}`} 
                                   />
                                </div>
                                <p className="text-[9px] text-stone-400 dark:text-zinc-500 mt-2.5 px-1 leading-tight">Separate tags with commas. Press Enter to save.</p>
                             </motion.div>
                          )}
                       </AnimatePresence>
                    </div>

                    {/* MULTI-LEVEL OPTIONS POPOVER */}
                    <div className="relative flex flex-col items-end">
                       <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOptionsMenuOpen(!isOptionsMenuOpen); setIsTagMenuOpen(false); setMenuView('main'); }} className={`p-3 rounded-full transition-all border shadow-sm active:scale-95 ${isOptionsMenuOpen ? 'opacity-100 bg-black/5 dark:bg-white/10' : theme.card} hover:opacity-80`}>
                         <MoreHorizontal size={18} strokeWidth={2.5} />
                       </button>
                       <AnimatePresence>
                         {isOptionsMenuOpen && (
                           <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -5 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} 
                              className={`absolute right-0 top-full mt-2 w-60 z-100 origin-top-right overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] border p-1.5 backdrop-blur-3xl flex flex-col ${isDark ? 'bg-[#1C1C1E]/95 border-zinc-700' : 'bg-white/95 border-stone-200'}`}
                           >
                              
                              {menuView === 'main' ? (
                                 <>
                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuView('folder'); }} className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-stone-100'}`}>
                                       <div className="flex items-center gap-2.5 text-stone-600 dark:text-zinc-300">
                                          <Folder size={14} strokeWidth={2.5} className="text-stone-400 dark:text-zinc-500" /> Folder
                                       </div>
                                       <div className="flex items-center gap-1.5 text-stone-400 dark:text-zinc-500">
                                          <span className="truncate max-w-17.5 font-medium">{editingNote.section || editingNote.sections?.[0] || 'None'}</span>
                                          <ChevronRight size={14} />
                                       </div>
                                    </button>

                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuView('list'); }} className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-stone-100'}`}>
                                       <div className="flex items-center gap-2.5 text-stone-600 dark:text-zinc-300">
                                          <ListIcon size={14} strokeWidth={2.5} className="text-stone-400 dark:text-zinc-500" /> List
                                       </div>
                                       <div className="flex items-center gap-1.5 text-stone-400 dark:text-zinc-500">
                                          <span className="truncate max-w-17.5 font-medium">{editingNote.list_name || 'None'}</span>
                                          <ChevronRight size={14} />
                                       </div>
                                    </button>
                                    
                                    <div className={`relative w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-xl transition-colors overflow-hidden ${isDark ? 'hover:bg-white/10' : 'hover:bg-stone-100'}`}>
                                       <div className="flex items-center gap-2.5 text-stone-600 dark:text-zinc-300">
                                          <CalendarIcon size={14} strokeWidth={2.5} className="text-stone-400 dark:text-zinc-500" /> Date
                                       </div>
                                       <input type="date" value={editingNote.scheduled_for ? new Date(editingNote.scheduled_for).toISOString().split('T')[0] : ""} onChange={(e) => updateLocalNoteState(editingNote.id, "scheduled_for", e.target.value ? new Date(e.target.value).toISOString() : null)} className={`bg-transparent outline-none border-none text-right cursor-pointer w-24 truncate font-medium text-stone-400 dark:text-zinc-500`} />
                                    </div>

                                    <div className={`w-full h-px my-1.5 mx-auto max-w-[90%] ${isDark ? 'bg-white/10' : 'bg-stone-200'}`} />
                                    
                                    <button onClick={() => updateLocalNoteState(editingNote.id, "is_pinned", !editingNote.is_pinned)} className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-200' : 'hover:bg-stone-100 text-stone-700'}`}>
                                      <Pin size={14} strokeWidth={2.5} className={editingNote.is_pinned ? "fill-current text-teal-500" : "text-stone-500 dark:text-zinc-400"} /> {editingNote.is_pinned ? 'Unpin Note' : 'Pin Note'}
                                    </button>

                                    {(nav.workspace === 'personal' || teamRole === 'admin' || teamRole === 'editor' || editingNote.user_id === session?.user?.id) && (
                                      <button onClick={() => { moveToTrash(editingNote.id); handleCloseAndSave(); }} className="w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2.5 hover:bg-red-500/10 text-red-500 transition-colors mt-0.5">
                                        <Trash2 size={14} strokeWidth={2.5} /> Move to Trash
                                      </button>
                                    )}
                                 </>
                              ) : menuView === 'folder' ? (
                                 <div className="flex flex-col max-h-64 overflow-y-auto custom-scrollbar">
                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuView('main'); }} className="flex items-center gap-2 px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-800 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors mb-1">
                                       <ChevronLeft size={14} strokeWidth={2.5} /> Back
                                    </button>
                                    <div className={`w-full h-px mb-1 ${isDark ? 'bg-white/10' : 'bg-black/5'}`} />
                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateLocalNoteState(editingNote.id, "section", null); setIsOptionsMenuOpen(false); }} className={`flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300' : 'hover:bg-stone-100 text-stone-700'}`}>
                                       Inbox
                                       {!editingNote.section && !editingNote.sections?.[0] && <Check size={14} strokeWidth={3} className="text-teal-500" />}
                                    </button>
                                    {nav.categoryType === 'folder' && (
                                       <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateLocalNoteState(editingNote.id, "section", nav.category); setIsOptionsMenuOpen(false); }} className={`flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300' : 'hover:bg-stone-100 text-stone-700'}`}>
                                          {nav.category}
                                          {(editingNote.section === nav.category || editingNote.sections?.[0] === nav.category) && <Check size={14} strokeWidth={3} className="text-teal-500" />}
                                       </button>
                                    )}
                                 </div>
                              ) : (
                                 <div className="flex flex-col max-h-64 overflow-y-auto custom-scrollbar">
                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuView('main'); }} className="flex items-center gap-2 px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-800 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors mb-1">
                                       <ChevronLeft size={14} strokeWidth={2.5} /> Back
                                    </button>
                                    <div className={`w-full h-px mb-1 ${isDark ? 'bg-white/10' : 'bg-black/5'}`} />
                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateLocalNoteState(editingNote.id, "list_name", null); setIsOptionsMenuOpen(false); }} className={`flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300' : 'hover:bg-stone-100 text-stone-700'}`}>
                                       None
                                       {!editingNote.list_name && <Check size={14} strokeWidth={3} className="text-teal-500" />}
                                    </button>
                                    {nav.categoryType === 'list' && (
                                       <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateLocalNoteState(editingNote.id, "list_name", nav.category); setIsOptionsMenuOpen(false); }} className={`flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300' : 'hover:bg-stone-100 text-stone-700'}`}>
                                          {nav.category}
                                          {editingNote.list_name === nav.category && <Check size={14} strokeWidth={3} className="text-teal-500" />}
                                       </button>
                                    )}
                                 </div>
                              )}
                           </motion.div>
                         )}
                       </AnimatePresence>
                    </div>

                  </div>
                )}

                {canModify && (
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }} onClick={handleCloseAndSave} className={`px-8 py-3.5 rounded-full font-black transition-all text-sm flex items-center gap-2 shadow-lg ${theme.btnPrimary}`}>
                    <Save size={18} strokeWidth={2} /> Save
                  </motion.button>
                )}
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
               <div className={`flex-1 flex flex-col w-full max-w-4xl mx-auto px-10 pt-16 pb-40 overflow-y-auto custom-scrollbar font-sans relative`}>

                 <input 
                   type="text" 
                   placeholder="Untitled Note" 
                   value={editingNote.title || ''} 
                   onChange={(e) => updateLocalNoteState(editingNote.id, "title", e.target.value)} 
                   readOnly={!canModify}
                   className={`w-full text-4xl md:text-5xl font-black tracking-tight bg-transparent border-none outline-none mb-6 placeholder:opacity-20 leading-tight ${theme.text} ${!canModify ? 'cursor-default' : ''}`} 
                   autoFocus={canModify}
                 />

                 {editingNote.tags && editingNote.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                       {editingNote.tags.map((t: string) => (
                           <span key={t} className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${isDark ? 'bg-white/10 text-white/70' : 'bg-stone-200 text-stone-700'}`}>#{t}</span>
                       ))}
                    </div>
                 )}

                 <div className="relative w-full flex-1 flex flex-col">
                    <AnimatePresence>
                       {mentionQuery.active && mentionQuery.target === 'note' && nav.workspace === 'team' && canModify && (
                          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`absolute z-90 top-0 left-0 mt-10 w-72 rounded-2xl shadow-2xl border p-3 backdrop-blur-xl ${isDark ? 'bg-zinc-800/95 border-zinc-700' : 'bg-white/95 border-stone-200'}`}>
                             <p className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 mb-1 ${theme.textMuted}`}>Mention Team Member</p>
                             {teamMembers.filter((m: any) => m.name.toLowerCase().includes(mentionQuery.query.toLowerCase())).map((member: any) => (
                                <button key={member.id} onClick={() => insertNoteMention(cleanName(member.name))} className={`w-full flex items-center gap-4 px-4 py-3 rounded-full transition-colors active:scale-95 ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-stone-100 text-stone-900'}`}>
                                   <img src={member.avatar} loading="lazy" className="w-8 h-8 rounded-full object-cover" />
                                   <span className="text-sm font-bold">{cleanName(member.name)}</span>
                                </button>
                             ))}
                          </motion.div>
                       )}
                    </AnimatePresence>
                    
                    {editingNote.is_checklist ? (
                       <div className="flex flex-col gap-4 w-full">
                          {editingNote.checklist_items?.map((ci: any, index: number) => (
                             <div key={ci.id} className="flex items-center gap-4 group">
                                <button aria-label="Toggle Checkbox" disabled={!canModify} onClick={() => {
                                    if(!canModify) return;
                                    const newItems = [...editingNote.checklist_items];
                                    newItems[index].checked = !newItems[index].checked;
                                    updateLocalNoteState(editingNote.id, "checklist_items", newItems);
                                }} className={`shrink-0 transition-transform ${canModify ? 'active:scale-90 cursor-pointer' : 'cursor-default opacity-70'}`}>
                                   {ci.checked ? <CheckSquare size={26} className="text-teal-500" /> : <Square size={26} className={theme.textMuted} />}
                                </button>
                                <input 
                                   value={ci.text} 
                                   readOnly={!canModify}
                                   onChange={(e) => {
                                       const newItems = [...editingNote.checklist_items];
                                       newItems[index].text = e.target.value;
                                       updateLocalNoteState(editingNote.id, "checklist_items", newItems);
                                   }}
                                   className={`flex-1 bg-transparent border-none outline-none text-xl font-medium transition-all ${ci.checked ? 'line-through text-stone-500 opacity-60' : theme.text} ${!canModify ? 'cursor-default' : ''}`}
                                   placeholder={canModify ? "To do..." : ""}
                                />
                                {canModify && (
                                   <button aria-label="Remove item" onClick={() => {
                                       const newItems = editingNote.checklist_items.filter((_: any, i: number) => i !== index);
                                       updateLocalNoteState(editingNote.id, "checklist_items", newItems);
                                   }} className="opacity-0 group-hover:opacity-100 text-stone-500 hover:text-red-500 transition-all p-2 rounded-full hover:bg-red-500/10 active:scale-95"><X size={20} /></button>
                                )}
                             </div>
                          ))}
                          {canModify && (
                             <button onClick={() => {
                                 const newItems = [...(editingNote.checklist_items || []), { id: `ci-${Date.now()}`, text: "", checked: false }];
                                 updateLocalNoteState(editingNote.id, "checklist_items", newItems);
                             }} className="flex items-center gap-2 text-base text-teal-500 font-bold mt-6 px-5 py-3 w-fit hover:bg-teal-500/10 rounded-full transition-colors active:scale-95"><Plus size={20}/> Add Item</button>
                          )}
                       </div>
                    ) : (
                       <RobustTextareaEditor 
                          ref={textareaRef} 
                          placeholder={canModify ? "Start writing... Type @ to mention a team member." : "No content yet."}
                          value={editingNote.content || ''} 
                          onChange={(e: any) => handleTextareaChange(e)} 
                          theme={theme}
                          isDark={isDark}
                          readOnly={!canModify}
                       />
                    )}
                 </div>
               </div>

               {canModify && (
                 <motion.div 
                   initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, ...modalSpring }}
                   className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-2 p-1.5 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.15)] border backdrop-blur-2xl z-50 ${isDark ? 'bg-[#18181b]/90 border-white/10' : 'bg-white/90 border-stone-200'}`}
                 >
                   <div className="flex items-center gap-1 px-2">
                      <button onClick={() => applyFormatting('**')} className={`p-2.5 rounded-full ${theme.btnGhost}`} title="Bold" aria-label="Bold"><Bold size={16} strokeWidth={2}/></button>
                      <button onClick={() => applyFormatting('*')} className={`p-2.5 rounded-full ${theme.btnGhost}`} title="Italic" aria-label="Italic"><Italic size={16} strokeWidth={2}/></button>
                      <button onClick={() => applyFormatting('~~')} className={`p-2.5 rounded-full ${theme.btnGhost}`} title="Strikethrough" aria-label="Strikethrough"><Strikethrough size={16} strokeWidth={2}/></button>
                      <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                      <button onClick={() => applyFormatting('# ', '')} className={`p-2.5 rounded-full ${theme.btnGhost}`} title="Heading" aria-label="Heading"><Heading1 size={16} strokeWidth={2}/></button>
                      <button onClick={() => applyFormatting('- ', '')} className={`p-2.5 rounded-full ${theme.btnGhost}`} title="Bullet List" aria-label="Bullet List"><ListIcon size={16} strokeWidth={2}/></button>
                      <button onClick={() => applyFormatting('> ', '')} className={`p-2.5 rounded-full ${theme.btnGhost}`} title="Quote" aria-label="Quote"><Quote size={16} strokeWidth={2}/></button>
                      <button onClick={() => applyFormatting('`')} className={`p-2.5 rounded-full ${theme.btnGhost}`} title="Code" aria-label="Code"><Code size={16} strokeWidth={2}/></button>
                   </div>
                   <div className={`w-px h-6 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                   <div className="flex items-center gap-1 pr-2">
                      <button 
                         onClick={() => updateLocalNoteState(editingNote.id, "is_checklist", !editingNote.is_checklist)} 
                         className={`px-4 py-2.5 rounded-full transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${editingNote.is_checklist ? 'bg-teal-500 text-white' : theme.btnGhost}`}
                         title="Toggle Checklist"
                         aria-label="Toggle Checklist"
                      >
                         <ListTodo size={16} strokeWidth={2} /> 
                         {editingNote.is_checklist ? 'Checklist' : 'List'}
                      </button>
                   </div>
                 </motion.div>
               )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}