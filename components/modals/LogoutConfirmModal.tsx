import { motion, AnimatePresence } from "framer-motion";
import { LogOut } from "lucide-react";
import { modalSpring } from "@/lib/utils";

export function LogoutConfirmModal({ ui, updateUi, handleSecureLogout, theme, isDark }: any) {
  if (!ui.showLogoutConfirm) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-300 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={modalSpring}
          className={`w-full max-w-sm p-8 rounded-2xl shadow-2xl flex flex-col border ${isDark ? 'bg-[#121214] border-white/10' : 'bg-white border-stone-200'}`}
        >
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6 mx-auto"><LogOut size={28} strokeWidth={2} /></div>
          <h2 className="text-2xl font-black tracking-tight text-center mb-2">Sign Out?</h2>
          <p className={`text-sm font-medium text-center mb-8 ${theme.textMuted}`}>Are you sure you want to securely log out of your workspace?</p>
          <div className="flex gap-3 w-full">
            <button onClick={() => updateUi({ showLogoutConfirm: false })} className={`flex-1 py-3.5 rounded-full font-bold text-sm transition-all active:scale-95 ${theme.btnGhost}`}>Cancel</button>
            <button onClick={handleSecureLogout} className={`flex-1 py-3.5 rounded-full font-bold text-sm bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition-all active:scale-95`}>Sign Out</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}