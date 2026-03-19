import React, { useState, useEffect } from 'react';

export const RobustTextareaEditor = React.forwardRef(({ value, onChange, placeholder, className, isDark, theme, onKeyDown, readOnly }: any, ref: any) => {
   const [lineCount, setLineCount] = useState(1);
   
   useEffect(() => {
      if (ref && ref.current) {
         ref.current.style.height = 'auto';
         ref.current.style.height = `${ref.current.scrollHeight}px`;
         setLineCount((value || '').split('\n').length);
      }
   }, [value, ref]);

   const handleInternalKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (onKeyDown) onKeyDown(e);
      if (e.key === 'Tab') {
         e.preventDefault();
         const start = e.currentTarget.selectionStart;
         const end = e.currentTarget.selectionEnd;
         const target = e.currentTarget;
         const newText = value.substring(0, start) + "  " + value.substring(end);
         
         const syntheticEvent = {
             ...e,
             target: { ...target, value: newText, selectionStart: start + 2, selectionEnd: start + 2 }
         };
         onChange(syntheticEvent);
         
         setTimeout(() => {
            target.selectionStart = target.selectionEnd = start + 2;
         }, 0);
      }
   };

   return (
      <div className={`relative flex w-full flex-1 rounded-2xl border transition-all shadow-inner focus-within:ring-2 focus-within:ring-teal-500/50 ${isDark ? 'bg-black/20 border-white/10' : 'bg-stone-50 border-stone-200'}`}>
         <div className={`flex flex-col text-right px-4 py-4 select-none border-r ${isDark ? 'bg-white/2 border-white/5 text-zinc-600' : 'bg-black/2 border-black/5 text-stone-400'} font-mono text-sm`}>
            {Array.from({ length: Math.max(10, lineCount) }).map((_, i) => (
               <span key={i} className="leading-relaxed opacity-50">{i + 1}</span>
            ))}
         </div>
         <textarea 
            ref={ref} 
            placeholder={placeholder} 
            value={value} 
            onChange={onChange} 
            onKeyDown={handleInternalKeyDown}
            readOnly={readOnly}
            className={`${className} p-4 flex-1 w-full bg-transparent border-none outline-none resize-none placeholder:opacity-30 custom-scrollbar ${theme.text} ${readOnly ? 'cursor-default' : ''}`} 
            spellCheck={false}
         />
      </div>
   )
});
RobustTextareaEditor.displayName = 'RobustTextareaEditor';