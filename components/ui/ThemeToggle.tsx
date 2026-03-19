import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ isDark, toggle }: { isDark: boolean, toggle: () => void }) {
  return (
    <motion.button
      aria-label="Toggle Theme"
      onClick={toggle}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative p-3 flex items-center justify-center rounded-full overflow-hidden transition-all border shadow-sm ${isDark ? 'bg-white/5 border-white/5 text-teal-400' : 'bg-white border-stone-200 text-teal-600'}`}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
        className="relative flex items-center justify-center z-10"
      >
        {isDark ? (
           <Moon size={18} strokeWidth={2} className="text-teal-400" fill="currentColor" />
        ) : (
           <Sun size={18} strokeWidth={2} className="text-teal-600" fill="currentColor" />
        )}
      </motion.div>
      <AnimatePresence>
         {isDark && (
           <motion.div
             layoutId="dark-overlay"
             initial={{ scale: 0, opacity: 0 }}
             animate={{ scale: 1.5, opacity: 1 }}
             exit={{ scale: 0, opacity: 0 }}
             transition={{ duration: 0.5, ease: "easeInOut" }}
             className="absolute inset-0 bg-[#121214] rounded-full z-0"
           />
         )}
      </AnimatePresence>
    </motion.button>
  );
}