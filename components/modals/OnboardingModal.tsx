import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { modalSpring } from "@/lib/utils";

export function OnboardingModal({ ui, profile, updateProfile, handleUpdateProfile, theme, isDark }: any) {
  return (
    <AnimatePresence>
       {ui.showOnboarding && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-200 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
             <motion.div initial={{ scale: 0.95, y: 30 }} animate={{ scale: 1, y: 0 }} transition={modalSpring} className={`w-full max-w-lg p-12 rounded-3xl shadow-2xl flex flex-col border ${isDark ? 'bg-[#121214] border-white/10' : 'bg-white border-stone-200'}`}>
                <div className="flex flex-col items-center text-center mb-10">
                   <div className="w-20 h-20 bg-teal-500/20 text-teal-500 rounded-2xl flex items-center justify-center mb-6"><Sparkles size={40} strokeWidth={1.5} /></div>
                   <h2 className="text-4xl font-black tracking-tight mb-3">Welcome aboard!</h2>
                   <p className={`text-base font-medium leading-relaxed ${theme.textMuted}`}>Let's set up your profile so your team knows who you are.</p>
                </div>
                
                <div className="space-y-6">
                   <div>
                      <label className={`text-[10px] font-bold uppercase tracking-widest mb-3 block ml-2 opacity-70 ${theme.textMuted}`}>Full Name</label>
                      <input type="text" value={profile.displayName} onChange={e => updateProfile({ displayName: e.target.value })} className={`w-full rounded-4xl px-6 py-4 text-base font-bold outline-none transition-all shadow-sm ${theme.input}`} placeholder="John Doe" />
                   </div>
                   <div>
                      <label className={`text-[10px] font-bold uppercase tracking-widest mb-3 block ml-2 opacity-70 ${theme.textMuted}`}>Unique Username</label>
                      <input type="text" value={profile.username} onChange={e => updateProfile({ username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''), error: "" })} className={`w-full rounded-4xl px-6 py-4 text-base font-bold outline-none transition-all shadow-sm ${theme.input} ${profile.error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`} placeholder="johndoe123" />
                      {profile.error && <p className="text-xs text-red-500 font-bold uppercase tracking-widest mt-3 ml-2">{profile.error}</p>}
                   </div>
                   <div>
                      <label className={`text-[10px] font-bold uppercase tracking-widest mb-3 block ml-2 opacity-70 ${theme.textMuted}`}>Bio (Optional)</label>
                      <input type="text" value={profile.bio} onChange={e => updateProfile({ bio: e.target.value })} className={`w-full rounded-4xl px-6 py-4 text-base font-bold outline-none transition-all shadow-sm ${theme.input}`} placeholder="What do you do?" />
                   </div>
                   
                   <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }} onClick={handleUpdateProfile} disabled={profile.isSaving || !profile.username || !profile.displayName} className={`w-full mt-6 font-black text-xl py-5 rounded-full transition-all flex items-center justify-center gap-3 ${theme.btnPrimary} disabled:opacity-50 disabled:hover:scale-100`}>
                      {profile.isSaving ? <Loader2 size={24} strokeWidth={2} className="animate-spin" /> : "Complete Setup"}
                   </motion.button>
                </div>
             </motion.div>
          </motion.div>
       )}
    </AnimatePresence>
  );
}