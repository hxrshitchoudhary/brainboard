import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Loader2, Settings, CheckCircle2, ShieldAlert, LogOut } from "lucide-react";
import { cleanName, modalSpring } from "@/lib/utils";

export function SettingsModal({ ui, updateUi, profile, updateProfile, handleUpdateProfile, currentAvatar, userDisplayName, userHandle, avatarInputRef, teamRole, teamMembers, session, handleUpdateMemberRole, theme, isDark }: any) {
  return (
    <AnimatePresence>
      {ui.isAccountOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-150 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 sm:p-8 md:p-12" onMouseDown={() => updateUi({ isAccountOpen: false })}>
          <motion.div 
            initial={{ scale: 0.95, y: 30, opacity: 0 }} 
            animate={{ scale: 1, y: 0, opacity: 1 }} 
            exit={{ scale: 0.95, y: 30, opacity: 0 }} 
            transition={modalSpring} 
            onMouseDown={(e) => e.stopPropagation()} 
            className={`relative w-full max-w-5xl h-[90vh] md:h-160 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border ${isDark ? 'border-white/10 bg-[#121214]/95' : 'border-stone-200 bg-white/95'} backdrop-blur-3xl`}
          >
            <button aria-label="Close Settings" className={`absolute top-4 right-4 md:top-8 md:right-8 p-3.5 rounded-full transition-colors z-20 active:scale-95 ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'}`} onClick={() => updateUi({ isAccountOpen: false })}><X size={24} strokeWidth={1.5}/></button>
            
            {/* Sidebar / Top area on mobile */}
            <div className={`w-full md:w-1/3 flex flex-col items-center justify-start md:justify-center border-b md:border-b-0 md:border-r shrink-0 overflow-y-auto ${isDark ? 'bg-white/2 border-white/5' : 'bg-stone-50/50 border-stone-200'}`}>
               <div className="p-8 md:p-12 flex flex-col items-center justify-center w-full">
                   <motion.div whileHover={{ scale: 1.05 }} className="relative group cursor-pointer mb-6 md:mb-8" onClick={() => avatarInputRef.current?.click()}>
                      <img src={currentAvatar} className={`w-24 h-24 md:w-32 md:h-32 rounded-[2rem] md:rounded-[2.5rem] object-cover shadow-2xl ring-4 ${isDark ? 'ring-white/10' : 'ring-black/5'}`} alt="Avatar" />
                      <div className="absolute inset-0 bg-black/60 rounded-[2rem] md:rounded-[2.5rem] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                         {ui.isUploading ? <Loader2 size={32} strokeWidth={1.5} className="animate-spin text-white" /> : <Camera size={32} strokeWidth={1.5} className="text-white" />}
                      </div>
                   </motion.div>
                   <h3 className="font-black text-xl md:text-2xl tracking-tight text-center w-full truncate">{userDisplayName}</h3>
                   <p className={`text-sm md:text-base mt-1 md:mt-2 mb-6 md:mb-10 font-bold ${theme.textMuted}`}>{userHandle}</p>
                   
                   <div className="w-full flex flex-col gap-2 md:gap-3">
                      <button onClick={() => updateUi({ settingsTab: 'account' })} className={`w-full text-left px-5 py-3 md:py-4 rounded-full font-bold text-sm md:text-base transition-all ${ui.settingsTab === 'account' ? (isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black') : theme.textMuted}`}>Account</button>
                      {teamRole === 'admin' && (
                         <button onClick={() => updateUi({ settingsTab: 'team' })} className={`w-full text-left px-5 py-3 md:py-4 rounded-full font-bold text-sm md:text-base transition-all ${ui.settingsTab === 'team' ? (isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black') : theme.textMuted}`}>Team Space</button>
                      )}
                   </div>

                   <button onClick={() => updateUi({ showLogoutConfirm: true })} className={`mt-8 md:mt-auto md:pt-10 transition-all font-black text-xs md:text-sm uppercase tracking-widest text-red-500 hover:text-red-400 flex items-center gap-2`} title="Log Out"><LogOut size={16} strokeWidth={2} /> Sign Out</button>
               </div>
            </div>

            {/* Main Content Area */}
            <div className="w-full md:w-2/3 p-6 sm:p-8 md:p-16 overflow-y-auto custom-scrollbar flex flex-col justify-start bg-transparent relative">
               {ui.settingsTab === 'account' ? (
                   <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={modalSpring}>
                       <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-8 md:mb-12 flex items-center gap-3 md:gap-4"><Settings size={36} strokeWidth={1.5} className="text-teal-500 w-8 h-8 md:w-9 md:h-9" /> Settings</h2>
                       <div className="space-y-6 md:space-y-8">
                         <div>
                           <label className={`text-xs font-bold uppercase tracking-widest mb-2 md:mb-3 block ml-2 opacity-70 ${theme.textMuted}`}>Display Name</label>
                           <input type="text" value={profile.displayName} onChange={e => updateProfile({ displayName: e.target.value })} className={`w-full rounded-3xl md:rounded-4xl px-5 py-4 md:px-6 md:py-5 text-sm md:text-base font-bold outline-none transition-all leading-normal shadow-sm ${theme.input}`} placeholder="What should we call you?" />
                         </div>
                         <div>
                           <label className={`text-xs font-bold uppercase tracking-widest mb-2 md:mb-3 block ml-2 opacity-70 ${theme.textMuted}`}>Unique Username</label>
                           <input 
                              type="text" 
                              disabled={profile.usernameChanged}
                              value={profile.username} 
                              onChange={e => updateProfile({ username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''), error: "" })} 
                              className={`w-full rounded-3xl md:rounded-4xl px-5 py-4 md:px-6 md:py-5 text-sm md:text-base font-bold outline-none transition-all leading-normal shadow-sm ${theme.input} ${profile.error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''} ${profile.usernameChanged ? 'opacity-50 cursor-not-allowed' : ''}`} 
                              placeholder="your_username" 
                           />
                           {profile.error && <p className="text-xs text-red-500 font-bold uppercase tracking-widest mt-2 md:mt-3 ml-2">{profile.error}</p>}
                           {profile.usernameChanged && <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-2 ml-2">Username has been changed once and cannot be changed again.</p>}
                         </div>
                         <div>
                           <label className={`text-xs font-bold uppercase tracking-widest mb-2 md:mb-3 block ml-2 opacity-70 ${theme.textMuted}`}>Bio (Optional)</label>
                           <input type="text" value={profile.bio} onChange={e => updateProfile({ bio: e.target.value })} className={`w-full rounded-3xl md:rounded-4xl px-5 py-4 md:px-6 md:py-5 text-sm md:text-base font-bold outline-none transition-all leading-normal shadow-sm ${theme.input}`} placeholder="What do you do?" />
                         </div>
                         <div className="pt-4 md:pt-6 pb-8 md:pb-0">
                           {/* FIXED: Removed profile.usernameChanged from the disabled array so users can still save display name / bio */}
                           <button onClick={handleUpdateProfile} disabled={profile.isSaving || !profile.username || !profile.displayName} className={`w-full font-black text-lg md:text-xl py-4 md:py-6 rounded-full transition-all flex items-center justify-center gap-3 active:scale-95 ${theme.btnPrimary} disabled:opacity-50 disabled:hover:scale-100`}>
                             {profile.isSaving ? <Loader2 size={24} strokeWidth={2} className="animate-spin" /> : <><CheckCircle2 size={24} strokeWidth={2} /> Save Changes</>}
                           </button>
                         </div>
                       </div>
                   </motion.div>
               ) : (
                   <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={modalSpring}>
                       <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-2 md:mb-3 flex items-center gap-3 md:gap-4"><ShieldAlert size={36} strokeWidth={1.5} className="text-teal-500 w-8 h-8 md:w-9 md:h-9" /> Team Space</h2>
                       <p className={`text-sm md:text-base font-medium mb-8 md:mb-10 leading-relaxed ${theme.textMuted}`}>Manage members and access levels for your office workspace.</p>

                       <div className="pb-8 md:pb-0">
                          <label className={`text-xs font-bold uppercase tracking-widest mb-3 md:mb-4 block ml-2 opacity-70 ${theme.textMuted}`}>All Authenticated Users</label>
                          <div className={`rounded-3xl border overflow-hidden shadow-sm ${isDark ? 'border-white/10' : 'border-stone-200'}`}>
                             {teamMembers.map((member: any, i: number) => (
                                <div key={member.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-5 gap-4 sm:gap-0 ${i !== 0 ? (isDark ? 'border-t border-white/10' : 'border-t border-stone-200') : ''}`}>
                                   <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                      <img src={member.avatar} loading="lazy" className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover shadow-sm shrink-0" />
                                      <div className="min-w-0 flex flex-col">
                                         <h4 className={`text-sm md:text-base font-black truncate leading-tight ${theme.text}`}>{cleanName(member.name)} {member.id === session?.user?.id && '(You)'}</h4>
                                         <p className={`text-[10px] md:text-xs uppercase truncate font-bold tracking-widest mt-1 ${theme.textMuted}`}>@{member.username || 'unknown'}</p>
                                      </div>
                                   </div>
                                   
                                   <div className="flex items-center gap-3 shrink-0 sm:ml-4">
                                      <select 
                                         disabled={teamRole !== 'admin' || member.role === 'admin' || member.id === session?.user?.id}
                                         value={member.inWorkspace ? (member.role || 'viewer') : 'none'} 
                                         onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                                         className={`w-full sm:w-auto text-xs font-black uppercase tracking-widest px-3 py-2 md:px-4 md:py-3 rounded-full outline-none appearance-none transition-all ${(teamRole !== 'admin' || member.role === 'admin' || member.id === session?.user?.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}
                                      >
                                         <option value="none">Not in Team</option>
                                         {member.role === 'admin' && <option value="admin">Admin</option>}
                                         <option value="editor">Editor</option>
                                         <option value="viewer">Viewer</option>
                                      </select>
                                   </div>
                                </div>
                             ))}
                          </div>
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