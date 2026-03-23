import React from "react";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { flushSync } from "react-dom";

export function ThemeToggle({ isDark, toggle }: { isDark: boolean; toggle: () => void }) {
  const handleToggle = async (e: React.MouseEvent) => {
    if (!document.startViewTransition) {
      toggle();
      return;
    }

    const x = e.clientX;
    const y = e.clientY;
    
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        toggle();
      });
    });

    await transition.ready;
    
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 500,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  };

  return (
    <motion.button
      aria-label="Toggle Theme"
      onClick={handleToggle}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative p-3 flex items-center justify-center rounded-full overflow-hidden border shadow-sm z-50 transition-colors ${
        isDark
          ? "bg-[#18181B] border-white/5 text-teal-400 hover:bg-white/10"
          : "bg-white border-stone-200 text-teal-600 hover:bg-black/5"
      }`}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
        className="relative flex items-center justify-center z-20"
      >
        {isDark ? (
          <Moon size={18} strokeWidth={2} className="text-teal-400" fill="currentColor" />
        ) : (
          <Sun size={18} strokeWidth={2} className="text-teal-600" fill="currentColor" />
        )}
      </motion.div>
    </motion.button>
  );
}