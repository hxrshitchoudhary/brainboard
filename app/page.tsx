"use client";

import React, { useState, useMemo, useEffect, useCallback, memo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { create } from 'zustand';
import { 
  Search, Plus, ImageIcon, Moon, Sun, X, Trash2, Trash, Loader2, 
  Check, Pin, Sparkles, LayoutGrid, Folder, Download, 
  Play, ZoomIn, ZoomOut, Maximize2, Minimize2, Settings, Save, 
  RotateCcw, FastForward, FileText, Wand2, Globe, Compass, 
  ChevronRight, LogOut, Camera, UploadCloud, List as ListIcon, 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight as ChevronRightIcon, Users, CheckCircle2,
  ChevronUp, ChevronDown, Edit2, Circle, Bell, Bold, Italic, Code, Heading1, ListTodo, Clock, 
  MoreHorizontal, CheckCircle, MessageSquare, Send, AlignJustify, ShieldAlert, UserPlus, UserMinus, Columns, Smile, Square, CheckSquare, File as FileIcon, Music, Monitor, Strikethrough, Quote
} from "lucide-react";
import { supabase } from '@/lib/supabase'; 
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths, formatDistanceToNow } from 'date-fns';

export interface ItemComment {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  text: string;
  created_at: string;
  reactions: Record<string, string[]>;
}

export interface BentoItem {
  id: string | number;
  user_id?: string;
  workspace_id?: string;
  type?: string; 
  title?: string;
  content?: string;
  url?: string;
  thumbnail_url?: string;
  video_url?: string;
  img?: string; 
  is_pinned?: boolean;
  tags?: string[];
  section?: string;      
  sections?: string[];   
  list_name?: string;    
  ai_summary?: string;   
  color?: string;
  is_checklist?: boolean;
  checklist_items?: { id: string, text: string, checked: boolean }[];
  creator?: string;
  creator_avatar?: string;
  likes?: string; 
  comments?: string; 
  is_deleted?: boolean;
  scheduled_for?: string;
  updated_at?: string;
  created_at?: string;
}

export interface NotificationItem {
  id: string | number;
  text: string;
  time: Date;
  read: boolean;
}

export interface ChatMessage {
  id: string;
  workspace_id: string;
  user_id: string;
  creator_name: string;
  creator_avatar: string;
  text: string;
  created_at: string;
}

// --- ZUSTAND GLOBAL STORE ---
interface AppState {
  ui: {
    isAuthLoading: boolean; isSaving: boolean; showOnboarding: boolean; isAccountOpen: boolean;
    settingsTab: 'account' | 'team'; showTeamPresence: boolean; showNotifications: boolean;
    isChatOpen: boolean; isUploading: boolean; isDragging: boolean; isAILoading: boolean;
    showLogoutConfirm: boolean;
  };
  nav: {
    category: string; categoryType: 'all' | 'folder' | 'list' | 'type' | 'trash' | 'pinned';
    workspace: 'personal' | 'team'; viewMode: 'grid' | 'card' | 'list' | 'calendar';
    currentDate: Date;
  };
  profile: { displayName: string; username: string; bio: string; error: string; isSaving: boolean; };
  sidebar: { isCreatingFolder: boolean; newFolderName: string; isCreatingList: boolean; newListName: string; };
  media: { item: any | null; isScrollMode: boolean; zoom: number; speed: number; };
  
  updateUi: (updates: Partial<AppState['ui']>) => void;
  updateNav: (updates: Partial<AppState['nav']>) => void;
  updateProfile: (updates: Partial<AppState['profile']>) => void;
  updateSidebar: (updates: Partial<AppState['sidebar']>) => void;
  updateMedia: (updates: Partial<AppState['media']>) => void;
}

const useAppStore = create<AppState>((set) => ({
  ui: { isAuthLoading: true, isSaving: false, showOnboarding: false, isAccountOpen: false, settingsTab: 'account', showTeamPresence: false, showNotifications: false, isChatOpen: false, isUploading: false, isDragging: false, isAILoading: false, showLogoutConfirm: false },
  nav: { category: "All", categoryType: 'all', workspace: 'personal', viewMode: 'grid', currentDate: new Date() },
  profile: { displayName: "", username: "", bio: "", error: "", isSaving: false },
  sidebar: { isCreatingFolder: false, newFolderName: "", isCreatingList: false, newListName: "" },
  media: { item: null, isScrollMode: false, zoom: 1, speed: 1 },
  
  updateUi: (updates) => set((state) => ({ ui: { ...state.ui, ...updates } })),
  updateNav: (updates) => set((state) => ({ nav: { ...state.nav, ...updates } })),
  updateProfile: (updates) => set((state) => ({ profile: { ...state.profile, ...updates } })),
  updateSidebar: (updates) => set((state) => ({ sidebar: { ...state.sidebar, ...updates } })),
  updateMedia: (updates) => set((state) => ({ media: { ...state.media, ...updates } })),
}));

// --- HIGHLY ROUNDED SMOOTH PHYSICS & ANIMATIONS ---
const modalSpring = { type: "spring" as const, bounce: 0.3, duration: 0.6 };
const sheetSpring = { type: "spring" as const, bounce: 0.2, duration: 0.7 };
const bounceHover = { scale: 1.04, transition: { type: "spring", bounce: 0.5 } };
const bounceTap = { scale: 0.94, transition: { type: "spring", bounce: 0.5 } };

const staggerVariants = { 
  hidden: { opacity: 0 }, 
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } } 
};

const cardVariants = { 
  hidden: { opacity: 0, y: 24, filter: "blur(8px)", scale: 0.96 }, 
  visible: { opacity: 1, y: 0, filter: "blur(0px)", scale: 1, transition: { duration: 0.4, type: "spring", bounce: 0.3 } },
  exit: { opacity: 0, scale: 0.96, filter: "blur(4px)", transition: { duration: 0.15 } }
};

const downloadMedia = async (url: string, filename: string) => {
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

const formatTimestamp = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const cleanName = (nameStr: string | null | undefined) => {
  if (!nameStr || typeof nameStr !== 'string') return "User";
  return nameStr.includes('@') ? nameStr.split('@')[0] : nameStr;
};

const renderChatText = (text: string, isDark: boolean) => {
  if (!text) return null;
  const parts = text.split(/(@\w+|#\w+)/g);
  return parts.map((part, i) => {
     if (part.startsWith('@')) return <span key={i} className="font-bold text-teal-500 bg-teal-500/10 px-2 py-0.5 rounded-full">{part}</span>;
     if (part.startsWith('#')) return <span key={i} className="font-bold text-emerald-500">{part}</span>;
     return part;
  });
};

// ==========================================
// 1. CUSTOM HOOK: DATA LAYER
// ==========================================
function useBrainboardData(
  session: any, 
  teamWorkspaceId: string, 
  activeWorkspace: string, 
  displayName: string, 
  showToast: (msg: string, isError?: boolean) => void
) {
  const [items, setItems] = useState<BentoItem[]>([]);
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [customLists, setCustomLists] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .or(`user_id.eq.${session.user.id},workspace_id.eq.${teamWorkspaceId}`)
      .order('created_at', { ascending: false });

    if (error) {
      showToast("Failed to fetch items.", true);
    } else if (data) {
      setItems(data as BentoItem[]);
      const allSections = (data as BentoItem[]).flatMap(item => item.sections || (item.section ? [item.section] : []));
      const folders = Array.from(new Set(allSections)).filter(Boolean) as string[];
      const lists = Array.from(new Set((data as BentoItem[]).map(i => i.list_name).filter(Boolean))) as string[];
      setCustomFolders(folders.filter(f => !["Inbox", "Archive"].includes(f)));
      setCustomLists(lists);
    }
    setIsLoading(false);
  }, [session?.user?.id, teamWorkspaceId, showToast]);

  const saveNote = async (noteToSave: BentoItem) => {
    const isTemp = String(noteToSave.id).startsWith('temp-');
    let newSections = noteToSave.sections || [];
    if (noteToSave.section) newSections = Array.from(new Set([...newSections, noteToSave.section]));

    const payload: any = {
      user_id: session.user.id, workspace_id: noteToSave.workspace_id || (activeWorkspace === 'team' ? teamWorkspaceId : null),
      creator: noteToSave.creator || displayName, type: noteToSave.type || 'note', title: noteToSave.title || null,
      content: noteToSave.content || null, url: noteToSave.url || null, thumbnail_url: noteToSave.thumbnail_url || null,
      video_url: noteToSave.video_url || null, img: noteToSave.img || null, is_pinned: noteToSave.is_pinned || false,
      sections: newSections.length > 0 ? newSections : null, list_name: noteToSave.list_name || null,
      ai_summary: noteToSave.ai_summary || null, color: noteToSave.color || null, 
      is_checklist: noteToSave.is_checklist || false, checklist_items: noteToSave.checklist_items || [], 
      likes: noteToSave.likes || null, comments: noteToSave.comments || null,
      scheduled_for: noteToSave.scheduled_for || null, updated_at: new Date().toISOString()
    };

    Object.keys(payload).forEach(key => { if (payload[key] === null || payload[key] === undefined) delete payload[key]; });

    try {
        if (isTemp) {
            const { data } = await supabase.from('assets').insert([payload]).select().single();
            if (data) {
                setItems(prev => [data, ...prev.filter(i => String(i.id) !== String(noteToSave.id))]);
                showToast("Saved successfully!");
            }
        } else {
            const { error } = await supabase.from('assets').update(payload).eq('id', noteToSave.id);
            if (!error) {
                setItems(prev => prev.map(item => String(item.id) === String(noteToSave.id) ? { ...item, ...payload } : item));
                showToast("Updated successfully!");
            } else {
                showToast("Failed to update item", true);
            }
        }

        if (newSections.length > 0) {
           const mappedFolders = newSections.filter((f: string) => !["Inbox", "Archive"].includes(f));
           if (mappedFolders.length > 0) setCustomFolders(prev => [...new Set([...prev, ...mappedFolders])]);
        }
        if (payload.list_name && !customLists.includes(payload.list_name)) {
           setCustomLists(prev => [...new Set([...prev, payload.list_name as string])]);
        }
    } catch (e) {
        showToast("Failed to save", true);
        console.error(e);
    }
  };

  const insertItem = async (payload: any) => {
    const { data, error } = await supabase.from('assets').insert([payload]).select().single();
    if (error) showToast("Failed to insert item.", true);
    if (data) setItems(prev => [data, ...prev]);
    return data;
  };

  const toggleItemReaction = async (item: BentoItem, emoji: string, userId: string) => {
     let currentReactions: Record<string, string[]> = {};
     try { 
        currentReactions = item.likes ? JSON.parse(item.likes) : {}; 
     } catch {}

     const reactions = { ...currentReactions };
     if (!reactions[emoji]) reactions[emoji] = [];

     if (reactions[emoji].includes(userId)) {
        reactions[emoji] = reactions[emoji].filter(id => id !== userId);
        if (reactions[emoji].length === 0) delete reactions[emoji];
     } else {
        reactions[emoji].push(userId);
     }

     const reactionsString = Object.keys(reactions).length > 0 ? JSON.stringify(reactions) : null;
     
     // Optimistic local update
     setItems(prev => prev.map(i => i.id === item.id ? { ...i, likes: reactionsString as any } : i));
     
     // DB update
     if (!String(item.id).startsWith('temp-')) {
        try {
           await supabase.from('assets').update({ likes: reactionsString }).eq('id', item.id);
        } catch (e) {
           showToast("Failed to save reaction", true);
        }
     }
  };

  const toggleChecklistItem = async (item: BentoItem, clItemId: string) => {
     if (!item.checklist_items) return;
     const newItems = item.checklist_items.map((ci: any) => 
         ci.id === clItemId ? { ...ci, checked: !ci.checked } : ci
     );
     setItems(prev => prev.map(i => i.id === item.id ? { ...i, checklist_items: newItems } : i));
     if (!String(item.id).startsWith('temp-')) {
         try { await supabase.from('assets').update({ checklist_items: newItems }).eq('id', item.id); } catch (e) { showToast("Failed to update checklist", true); }
     }
  };

  const updateStickyNote = async (id: string | number, newSummary: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ai_summary: newSummary } : item));
    if (!String(id).startsWith('temp-')) await supabase.from('assets').update({ ai_summary: newSummary }).eq('id', id);
  };

  const moveToTrash = async (id: string | number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, is_deleted: true } : item));
    showToast("Moved to Trash");
    if (!String(id).startsWith('temp-')) await supabase.from('assets').update({ is_deleted: true }).eq('id', id);
  };

  const restoreFromTrash = async (id: string | number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, is_deleted: false } : item));
    showToast("Item Restored!");
    if (!String(id).startsWith('temp-')) await supabase.from('assets').update({ is_deleted: false }).eq('id', id);
  };

  const hardDelete = async (id: string | number) => {
    setItems(prev => prev.filter(item => item.id !== id));
    showToast("Permanently Deleted");
    if (!String(id).startsWith('temp-')) await supabase.from('assets').delete().eq('id', id);
  };

  const emptyTrash = async () => {
    setItems(prev => prev.filter(item => !item.is_deleted));
    showToast("Trash Emptied");
    await supabase.from('assets').delete().eq('is_deleted', true);
  };

  const renameFolder = async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    setItems(prev => prev.map(item => ({ ...item, sections: item.sections?.map(s => s === oldName ? trimmed : s) })));
    const itemsToUpdate = items.filter(i => i.sections?.includes(oldName));
    for(const item of itemsToUpdate) {
        const newSecs = item.sections?.map(s => s === oldName ? trimmed : s) || [];
        await supabase.from('assets').update({ sections: newSecs }).eq('id', item.id);
    }
  };

  const deleteFolder = async (folderName: string) => {
    setItems(prev => prev.map(item => ({ ...item, sections: item.sections?.filter(s => s !== folderName) })));
    const itemsToUpdate = items.filter(i => i.sections?.includes(folderName));
    for(const item of itemsToUpdate) {
        const newSecs = item.sections?.filter(s => s !== folderName) || [];
        await supabase.from('assets').update({ sections: newSecs.length ? newSecs : null }).eq('id', item.id);
    }
  };

  const renameList = async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    setItems(prev => prev.map(item => item.list_name === oldName ? { ...item, list_name: trimmed } : item));
    const itemsToUpdate = items.filter(i => i.list_name === oldName);
    for(const item of itemsToUpdate) await supabase.from('assets').update({ list_name: trimmed }).eq('id', item.id);
  };

  const deleteList = async (listName: string) => {
    setItems(prev => prev.map(item => item.list_name === listName ? { ...item, list_name: undefined } : item));
    const itemsToUpdate = items.filter(i => i.list_name === listName);
    for(const item of itemsToUpdate) await supabase.from('assets').update({ list_name: null }).eq('id', item.id);
  };

  return {
    items, setItems,
    customFolders, setCustomFolders,
    customLists, setCustomLists,
    isLoading,
    fetchItems, saveNote, insertItem, updateStickyNote, toggleItemReaction, toggleChecklistItem,
    moveToTrash, restoreFromTrash, hardDelete, emptyTrash,
    renameFolder, deleteFolder, renameList, deleteList
  };
}

// ==========================================
// 2. CUSTOM HOOK: TEAM SPACE & CHAT LAYER
// ==========================================
function useTeamSpace(
  session: any, 
  teamWorkspaceId: string, 
  isChatOpen: boolean, 
  navWorkspace: string, 
  showToast: (msg: string, isError?: boolean) => void,
  setItems: React.Dispatch<React.SetStateAction<BentoItem[]>>,
  updateUi: Function,
  chatScrollRef: React.RefObject<HTMLDivElement>
) {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [teamRole, setTeamRole] = useState<string>('none'); 

  const fetchProfilesAndRole = useCallback(async (currentUser: any) => {
    try {
      const { data: workspaceData } = await supabase.from('workspace_members').select('*').eq('workspace_id', teamWorkspaceId);
      const { data: profilesData } = await supabase.from('profiles').select('*');
      
      if (profilesData) {
          const profileMap = new Map();
          const isMeHarshit = currentUser?.email === 'harshiitt33@gmail.com';

          profilesData.forEach(p => {
              const memberInfo = workspaceData?.find(w => w.user_id === p.id);
              let r = memberInfo ? memberInfo.role : 'none';
              
              const isThisUserHarshit = p.id === currentUser?.id && isMeHarshit; 
              const looksLikeHarshit = p.username?.includes('harshiitt33') || p.display_name?.toLowerCase().includes('harshit') || isThisUserHarshit;
              
              // Force Harshiitt33 to be the ONLY admin in the UI. 
              if (r === 'admin' && !looksLikeHarshit) r = 'editor';
              if (isThisUserHarshit) r = 'admin';

              profileMap.set(p.id, {
                id: p.id, 
                name: cleanName(p.display_name) || p.username || 'Authenticated User',
                username: p.username || '',
                bio: p.bio || '',
                avatar: p.avatar_url || `https://api.dicebear.com/9.x/shapes/svg?seed=${p.id}`,
                status: p.id === currentUser?.id ? 'online' : 'offline', 
                lastSeen: new Date(p.updated_at || Date.now()),
                role: r,
                inWorkspace: !!memberInfo
              });
          });
          
          if (!profileMap.has(currentUser?.id) && currentUser) {
              const myMemberInfo = workspaceData?.find(w => w.user_id === currentUser.id);
              profileMap.set(currentUser.id, {
                  id: currentUser.id, 
                  name: cleanName(currentUser.user_metadata?.display_name || currentUser.email) || "You",
                  username: currentUser.user_metadata?.username || "",
                  avatar: currentUser.user_metadata?.avatar_url || `https://api.dicebear.com/9.x/shapes/svg?seed=${currentUser.email}`,
                  status: 'online', 
                  lastSeen: new Date(),
                  role: isMeHarshit ? 'admin' : (myMemberInfo ? myMemberInfo.role : 'none'),
                  inWorkspace: !!myMemberInfo
              });
          }
          
          const mappedArray = Array.from(profileMap.values());
          setTeamMembers(mappedArray);

          const myProfile = mappedArray.find(m => m.id === currentUser?.id);
          if (!myProfile || !myProfile.username || !myProfile.name || myProfile.name === 'Authenticated User') {
              updateUi({ showOnboarding: true });
          } else {
              if (isMeHarshit) setTeamRole('admin');
              else setTeamRole(myProfile.role === 'admin' ? 'editor' : myProfile.role);
          }
      } else if (currentUser) {
          updateUi({ showOnboarding: true });
      }
    } catch (e) {
      console.error("Error fetching profiles", e);
    }
  }, [teamWorkspaceId, updateUi]);

  useEffect(() => {
    if (!session?.user?.id || !teamWorkspaceId) return;

    const fetchChat = async () => {
      const { data } = await supabase.from('team_messages').select('*').eq('workspace_id', teamWorkspaceId).order('created_at', { ascending: true });
      if (data) setChatMessages(data as ChatMessage[]);
    };
    fetchChat();

    const assetChannel = supabase.channel('realtime_assets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets', filter: `workspace_id=eq.${teamWorkspaceId}` }, (payload) => {
         if (payload.eventType === 'INSERT') {
             if (payload.new.user_id !== session.user.id) {
                const creatorName = cleanName(payload.new.creator) || 'A team member';
                const itemType = payload.new.type === 'video' ? (payload.new.url?.includes('instagram') ? 'Reel' : 'Video') : (payload.new.type || 'item');
                setNotifications(prev => [{ id: payload.new.id, text: `${creatorName} added a new ${itemType}.`, time: new Date(payload.new.created_at || new Date()), read: false }, ...prev]);
                setItems(prev => [payload.new as BentoItem, ...prev]);
                
                if (navWorkspace === 'personal') showToast(`🏢 Team: ${creatorName} shared a new ${itemType}!`);
                else showToast(`${creatorName} shared a new ${itemType}!`);
             }
         } else if (payload.eventType === 'UPDATE') {
             setItems(prev => prev.map(item => item.id === payload.new.id ? payload.new as BentoItem : item));
         } else if (payload.eventType === 'DELETE') {
             setItems(prev => prev.filter(item => item.id !== payload.old.id));
         }
      }).subscribe();

    const chatChannel = supabase.channel('realtime_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages', filter: `workspace_id=eq.${teamWorkspaceId}` }, (payload) => {
         setChatMessages(prev => [...prev, payload.new as ChatMessage]);
         setTimeout(() => { if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; }, 100);
         if (payload.new.user_id !== session.user.id && !isChatOpen) {
            setNotifications(prev => [{ id: `msg-${payload.new.id}`, text: `New message from ${cleanName(payload.new.creator_name)}`, time: new Date(payload.new.created_at || new Date()), read: false }, ...prev]);
            
            if (navWorkspace === 'personal') showToast(`💬 Team Chat: New message from ${cleanName(payload.new.creator_name)}`);
            else showToast(`New message from ${cleanName(payload.new.creator_name)}`);
         }
      }).subscribe();

    return () => { supabase.removeChannel(assetChannel); supabase.removeChannel(chatChannel); }
  }, [session, teamWorkspaceId, isChatOpen, navWorkspace, setItems, showToast, chatScrollRef]);

  const handleUpdateMemberRole = async (targetUserId: string, newRole: string) => {
     try {
         if (newRole === 'none') {
             await supabase.from('workspace_members').delete().eq('workspace_id', teamWorkspaceId).eq('user_id', targetUserId);
             showToast("Removed from team.");
         } else {
             await supabase.from('workspace_members').upsert({ workspace_id: teamWorkspaceId, user_id: targetUserId, role: newRole });
             showToast(`Role updated to ${newRole}.`);
         }
         fetchProfilesAndRole(session.user);
     } catch (e) {
         showToast("Failed to update role", true);
         console.error(e);
     }
  };

  const handleMarkAsRead = (id: string | number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };
  
  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return {
    teamMembers, notifications, chatMessages, teamRole,
    fetchProfilesAndRole, handleUpdateMemberRole, handleMarkAsRead, handleMarkAllAsRead
  };
}

// ==========================================
// 3. MAIN COMPONENT
// ==========================================
export default function BrainboardBalanced() {
  const [session, setSession] = useState<any>(null);
  const [teamWorkspaceId] = useState<string>('11111111-1111-1111-1111-111111111111'); 

  // --- ZUSTAND STORE HOOK ---
  const { ui, nav, profile, sidebar, media, updateUi, updateNav, updateProfile, updateSidebar, updateMedia } = useAppStore();

  const closeMediaViewer = useCallback(() => {
    updateMedia({ item: null, isScrollMode: false, zoom: 1, speed: 1 });
  }, [updateMedia]);

  const [mentionQuery, setMentionQuery] = useState<{ active: boolean, query: string, target: 'note' | 'chat' }>({ active: false, query: '', target: 'note' });
  const [chatInput, setChatInput] = useState("");
  
  const [folderOrder, setFolderOrder] = useState<string[]>([]);
  const [listOrder, setListOrder] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDark, setIsDark] = useState<boolean>(false); 
  const [editingNote, setEditingNote] = useState<BentoItem | null>(null);
  
  // Custom Toast State
  const [toast, setToast] = useState<{ message: string; visible: boolean, error?: boolean }>({ message: "", visible: false });
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, isError: boolean = false) => {
    setToast({ message, visible: true, error: isError });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
  }, []);

  // --- REFS ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // --- CUSTOM HOOKS ---
  const {
    items, setItems, customFolders, setCustomFolders, customLists, setCustomLists,
    isLoading, fetchItems, saveNote, insertItem, updateStickyNote, toggleItemReaction, toggleChecklistItem,
    moveToTrash, restoreFromTrash, hardDelete, emptyTrash,
    renameFolder, deleteFolder, renameList, deleteList
  } = useBrainboardData(session, teamWorkspaceId, nav.workspace, profile.displayName, showToast);

  const {
    teamMembers, notifications, chatMessages, teamRole,
    fetchProfilesAndRole, handleUpdateMemberRole, handleMarkAsRead, handleMarkAllAsRead
  } = useTeamSpace(session, teamWorkspaceId, ui.isChatOpen, nav.workspace, showToast, setItems, updateUi, chatScrollRef);

  const activeStateRef = useRef({ category: nav.category, type: nav.categoryType, folders: customFolders, workspace: nav.workspace, userName: profile.displayName, role: teamRole });
  useEffect(() => {
    activeStateRef.current = { category: nav.category, type: nav.categoryType, folders: customFolders, workspace: nav.workspace, userName: profile.displayName, role: teamRole };
  }, [nav.category, nav.categoryType, customFolders, nav.workspace, profile.displayName, teamRole]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('brainboard-theme');
      if (storedTheme) setIsDark(storedTheme === 'dark');
      else setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);

      const savedFolders = localStorage.getItem('bb-folder-order');
      const savedLists = localStorage.getItem('bb-list-order');
      if (savedFolders) setFolderOrder(JSON.parse(savedFolders));
      if (savedLists) setListOrder(JSON.parse(savedLists));
    }
  }, []);

  useEffect(() => {
    setFolderOrder(prev => {
        let updated = [...prev];
        customFolders.forEach(f => { if (!updated.includes(f)) updated.push(f); });
        updated = updated.filter(f => customFolders.includes(f));
        localStorage.setItem('bb-folder-order', JSON.stringify(updated));
        return updated;
    });
  }, [customFolders]);

  useEffect(() => {
    setListOrder(prev => {
        let updated = [...prev];
        customLists.forEach(l => { if (!updated.includes(l)) updated.push(l); });
        updated = updated.filter(l => customLists.includes(l));
        localStorage.setItem('bb-list-order', JSON.stringify(updated));
        return updated;
    });
  }, [customLists]);

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    if (typeof window !== 'undefined') localStorage.setItem('brainboard-theme', nextTheme ? 'dark' : 'light');
  };

  const theme = {
    bg: isDark ? "bg-[#09090b]" : "bg-[#f4f4f5]",
    text: isDark ? "text-zinc-100" : "text-zinc-900",
    textMuted: isDark ? "text-zinc-400" : "text-zinc-500",
    sidebar: isDark ? "bg-[#09090b]/90 backdrop-blur-2xl border-white/[0.06]" : "bg-white border-zinc-200 shadow-sm",
    card: isDark ? "bg-white/[0.03] border-white/[0.08] shadow-md" : "bg-white border-zinc-200/80 shadow-[0_2px_10px_rgb(0,0,0,0.03)]",
    cardHover: isDark ? "hover:bg-white/[0.05] hover:border-white/[0.15] hover:shadow-lg hover:shadow-black/50" : "hover:border-zinc-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5",
    input: isDark ? "bg-white/5 border-white/10 text-white focus:border-teal-500 focus:bg-white/10" : "bg-white border-zinc-200 text-zinc-900 focus:border-teal-500 focus:shadow-md",
    btnPrimary: "bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-900/20 active:scale-95", 
    btnGhost: isDark ? "hover:bg-white/10 text-zinc-400 hover:text-zinc-100 active:scale-95" : "hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 active:scale-95"
  };

  const handleSecureLogout = useCallback(async () => {
    updateUi({ isAuthLoading: true, isAccountOpen: false, showLogoutConfirm: false }); 
    setItems([]); 
    await supabase.auth.signOut(); 
    setSession(null);
    if (typeof window !== 'undefined') localStorage.clear();
    updateUi({ isAuthLoading: false }); 
  }, [updateUi, setItems]);

  useEffect(() => {
    const verifyUser = async () => {
      const { data: { user } } = await supabase.auth.getUser(); 
      if (user) {
        setSession({ user });
        const dName = user.user_metadata?.display_name || user.email?.split('@')[0] || "";
        const uName = user.user_metadata?.username || "";
        updateProfile({ displayName: dName, username: uName });
        
        try { 
            await supabase.from('profiles').upsert({ 
                id: user.id, display_name: dName, username: uName, 
                avatar_url: user.user_metadata?.avatar_url || `https://api.dicebear.com/9.x/shapes/svg?seed=${user.email}`,
                updated_at: new Date().toISOString() 
            }, { onConflict: 'id' }); 
        } catch(e) {
            console.error(e);
        }

        fetchProfilesAndRole(user);
      } else { setSession(null); setItems([]); }
      updateUi({ isAuthLoading: false });
    };
    verifyUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { 
        setSession(null); setItems([]); updateUi({ isAccountOpen: false, showOnboarding: false, showLogoutConfirm: false });
      } else if (session?.user) { 
        setSession(session); 
        updateProfile({
            displayName: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || "",
            username: session.user.user_metadata?.username || ""
        });
        fetchProfilesAndRole(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchProfilesAndRole, updateProfile, updateUi, setItems]);

  useEffect(() => { 
     if (session?.user?.id && !ui.showOnboarding) {
         fetchItems(); 
     }
  }, [session, ui.showOnboarding, fetchItems]);

  const handleNewNote = () => {
    if (!session?.user?.id) return;
    const newItem: BentoItem = {
      id: `temp-${Date.now()}`, user_id: session.user.id, workspace_id: nav.workspace === 'team' ? teamWorkspaceId : undefined,
      creator: profile.displayName, type: "note", title: "", content: "",
      sections: nav.categoryType === 'folder' ? [nav.category] : ["Inbox"], list_name: nav.categoryType === 'list' ? nav.category : undefined,
      scheduled_for: nav.viewMode === 'calendar' ? nav.currentDate.toISOString() : undefined,
    };
    setEditingNote(newItem);
  };

  const handleNewChecklist = () => {
    if (!session?.user?.id) return;
    const newItem: BentoItem = {
      id: `temp-${Date.now()}`, user_id: session.user.id, workspace_id: nav.workspace === 'team' ? teamWorkspaceId : undefined,
      creator: profile.displayName, type: "note", title: "", is_checklist: true, checklist_items: [],
      sections: nav.categoryType === 'folder' ? [nav.category] : ["Inbox"], list_name: nav.categoryType === 'list' ? nav.category : undefined,
      scheduled_for: nav.viewMode === 'calendar' ? nav.currentDate.toISOString() : undefined,
    };
    setEditingNote(newItem);
  };

  const updateLocalNoteState = useCallback((id: string | number, field: string, value: any) => {
    setItems((prev) => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    setEditingNote((prev) => prev && prev.id === id ? { ...prev, [field]: value } : prev);
    
    updateMedia({
        item: media.item && media.item.id === id ? { ...media.item, [field]: value } : media.item
    });
  }, [setItems, updateMedia, media.item]);

  const handleCloseAndSave = async () => {
    if (!editingNote) return;
    updateUi({ isSaving: true });
    await saveNote(editingNote);
    setEditingNote(null);
    updateUi({ isSaving: false });
  };

  const handleUpdateProfile = async () => {
    if (!session?.user) return;
    updateProfile({ isSaving: true, error: "" });

    const cleanUsername = profile.username.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '');

    if (!cleanUsername || !profile.displayName.trim()) {
       updateProfile({ error: "Name and Username are required.", isSaving: false });
       return;
    }

    const { data: existingUsers } = await supabase.from('profiles').select('id').eq('username', cleanUsername);
    if (existingUsers && existingUsers.length > 0) {
      const isMe = existingUsers.every(u => u.id === session.user.id);
      if (!isMe) {
        updateProfile({ error: "This username is already taken!", isSaving: false });
        return;
      }
    }

    const { data, error } = await supabase.auth.updateUser({ data: { display_name: profile.displayName, username: cleanUsername } });
    if (!error && data.user) { 
      setSession({ ...session, user: data.user }); 
      updateProfile({ username: cleanUsername }); 
    } 
    
    try { 
        await supabase.from('profiles').upsert({ 
           id: session.user.id, display_name: profile.displayName, username: cleanUsername, bio: profile.bio, updated_at: new Date().toISOString() 
        }); 
        showToast(ui.showOnboarding ? "Welcome to Brainboard!" : "Profile updated successfully!"); 
        updateUi({ showOnboarding: false });
        fetchItems(); 
    } catch(e) {
        showToast("Failed to sync profile.", true); 
        console.error(e);
    }
    
    updateProfile({ isSaving: false });
    fetchProfilesAndRole(session.user);
  };

  const handleGoogleLogin = async () => {
    if (typeof window === 'undefined') return;
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  };

  const handleChatTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setChatInput(val);
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursor);
    const match = textBeforeCursor.match(/@(\w*)$/);
    if (match && nav.workspace === 'team') {
       setMentionQuery({ active: true, query: match[1], target: 'chat' });
    } else {
       setMentionQuery({ active: false, query: '', target: 'chat' });
    }
  };

  const insertChatMention = (name: string) => {
    const currentText = chatInput;
    if (!chatInputRef.current) return;
    const cursor = chatInputRef.current.selectionStart;
    const textBeforeCursor = currentText.substring(0, cursor);
    const textAfterCursor = currentText.substring(cursor);
    const textWithoutQuery = textBeforeCursor.replace(/@\w*$/, '');
    const newText = textWithoutQuery + `@${name.replace(/\s+/g, '')} ` + textAfterCursor;
    
    setChatInput(newText);
    setMentionQuery({ active: false, query: '', target: 'chat' });
    setTimeout(() => { if(chatInputRef.current) chatInputRef.current.focus(); }, 10);
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !session?.user?.id) return;
    const currentAvatar = session?.user?.user_metadata?.avatar_url || `https://api.dicebear.com/9.x/shapes/svg?seed=${session?.user?.email || 'default'}`;
    const payload = {
       workspace_id: teamWorkspaceId,
       user_id: session.user.id,
       creator_name: profile.displayName,
       creator_avatar: currentAvatar,
       text: chatInput.trim(),
    };
    setChatInput("");
    setMentionQuery({ active: false, query: '', target: 'chat' });
    try { 
        await supabase.from('team_messages').insert([payload]); 
    } catch(e) {
        console.error(e);
        showToast("Failed to send message", true);
    }
  };

  const canModifyStructure = nav.workspace === 'personal' || teamRole === 'admin' || teamRole === 'editor';

  const handleRenameFolder = (oldName: string, newName: string) => {
    if (!canModifyStructure) return showToast("Permission denied.", true);
    renameFolder(oldName, newName);
    if (nav.category === oldName) updateNav({ category: newName.trim() });
  }

  const handleDeleteFolder = (folderName: string) => {
    if (!canModifyStructure) return showToast("Permission denied.", true);
    if (!window.confirm(`Remove folder "${folderName}" from all items?`)) return;
    deleteFolder(folderName);
    if (nav.category === folderName) updateNav({ category: "All", categoryType: "all" });
  }

  const handleRenameList = (oldName: string, newName: string) => {
    if (!canModifyStructure) return showToast("Permission denied.", true);
    renameList(oldName, newName);
    if (nav.category === oldName) updateNav({ category: newName.trim() });
  }

  const handleDeleteList = (listName: string) => {
    if (!canModifyStructure) return showToast("Permission denied.", true);
    if (!window.confirm(`Delete list "${listName}"? Items will lose this tag.`)) return;
    deleteList(listName);
    if (nav.category === listName) updateNav({ category: "All", categoryType: "all" });
  }

  const moveArrayItem = (arr: string[], index: number, offset: number) => {
    const newIndex = index + offset;
    if (newIndex < 0 || newIndex >= arr.length) return arr;
    const newArr = [...arr];
    const temp = newArr[index];
    newArr[index] = newArr[newIndex];
    newArr[newIndex] = temp;
    return newArr;
  };

  const processAndUploadFiles = async (files: File[]) => {
    if (nav.workspace === 'team' && teamRole === 'viewer') return showToast("Permission denied.", true);
    if (!session?.user?.id || files.length === 0) return;

    updateUi({ isUploading: true });

    for (const file of files) {
        let type = 'document';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';

        const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
        
        try {
            await supabase.storage.from('media').upload(fileName, file);
            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
            await insertItem({
              user_id: session.user.id, workspace_id: nav.workspace === 'team' ? teamWorkspaceId : null,
              creator: activeStateRef.current.userName, type: type, 
              title: file.name, thumbnail_url: publicUrl, url: type !== 'image' ? publicUrl : null, 
              sections: nav.categoryType === 'folder' ? [nav.category] : ["Inbox"], 
              list_name: nav.categoryType === 'list' ? nav.category : null
            });
            showToast("File added!");
        } catch(error) {
            showToast("Upload failed", true);
            console.error(error);
        }
    }
    updateUi({ isUploading: false, isDragging: false });
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processAndUploadFiles(Array.from(e.target.files));
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); updateUi({ isDragging: true }); };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!mainContentRef.current?.contains(e.relatedTarget as Node)) updateUi({ isDragging: false });
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    processAndUploadFiles(Array.from(e.dataTransfer.files));
  };

  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      const text = e.clipboardData?.getData('text');
      if (!text || !session?.user?.id) return;

      const { category, type: catType, folders, workspace, userName, role } = activeStateRef.current;
      if (workspace === 'team' && role === 'viewer') return; 

      const isReel = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:reel|p|tv)\/([^\/\?#]+)/i.test(text);
      const isYouTube = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/i.test(text);
      const isLink = text.startsWith('http://') || text.startsWith('https://');
      
      if (isReel || isYouTube || isLink) {
         e.preventDefault();
         updateUi({ isAILoading: true });
         showToast(isReel ? "Capturing Reel..." : isYouTube ? "Capturing YouTube..." : "Capturing link...");
         
         const tempId = `temp-${Date.now()}`;
         let newItem: BentoItem = {
             id: tempId, user_id: session.user.id, workspace_id: workspace === 'team' ? teamWorkspaceId : undefined,
             creator: userName, type: 'link', url: text, title: isReel ? "Fetching Reel..." : isYouTube ? "Fetching YouTube..." : "Fetching Link...",
             ai_summary: (isReel || isYouTube) ? "" : undefined,
             sections: catType === 'folder' ? [category, isReel ? 'Instagram' : isYouTube ? 'YouTube' : 'Links'] : ['Inbox', isReel ? 'Instagram' : isYouTube ? 'YouTube' : 'Links'],
             list_name: catType === 'list' ? category : undefined, created_at: new Date().toISOString() 
         };

         setItems(prev => [newItem, ...prev]);

         if (isReel && !folders.includes('Instagram')) setCustomFolders(p => [...new Set([...p, 'Instagram'])]);
         if (isYouTube && !folders.includes('YouTube')) setCustomFolders(p => [...new Set([...p, 'YouTube'])]);

         try {
             const res = await fetch(`/api/microlink?url=${encodeURIComponent(text)}`);
             const data = await res.json();
             const info = data.data || data; 
             
             const dbPayload: any = {
                 user_id: session.user.id, workspace_id: workspace === 'team' ? teamWorkspaceId : null, creator: userName,
                 type: 'link', url: text, title: info.title || (isReel ? "@creator" : isYouTube ? "YouTube Video" : "Saved Link"),
                 content: info.description || null, thumbnail_url: info.image_url || info.image?.url || info.logo?.url || "https://images.unsplash.com/photo-1616469829581-73993eb86b02?auto=format&fit=crop&w=800&q=80",
                 ai_summary: (isReel || isYouTube) ? (info.ai_summary || "") : null, sections: newItem.sections, list_name: newItem.list_name || null
             };
             Object.keys(dbPayload).forEach(key => { if (dbPayload[key] === null || dbPayload[key] === undefined) delete dbPayload[key]; });

             const { data: dbData, error } = await supabase.from('assets').insert([dbPayload]).select().single();
             if (dbData) {
                 setItems(prev => prev.map(i => i.id === tempId ? dbData : i));
                 showToast(isReel ? "Reel captured!" : isYouTube ? "YouTube saved!" : "Link saved!");
             } else {
                 setItems(prev => prev.filter(i => i.id !== tempId));
                 showToast("Failed to save item.", true);
             }
         } catch (err) {
             const fallbackPayload = {
                 user_id: session.user.id, workspace_id: workspace === 'team' ? teamWorkspaceId : null,
                 creator: userName, type: 'link', url: text, title: "Saved Link", ai_summary: (isReel || isYouTube) ? "" : null, sections: newItem.sections,
             };
             const { data: dbData } = await supabase.from('assets').insert([fallbackPayload]).select().single();
             if (dbData) setItems(prev => prev.map(i => i.id === tempId ? dbData : i));
             else setItems(prev => prev.filter(i => i.id !== tempId));
         } finally { updateUi({ isAILoading: false }); }
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [session, teamWorkspaceId, updateUi, setItems, setCustomFolders, showToast]);

  const filteredData = useMemo(() => {
    let result = items;
    
    if (nav.workspace === 'personal') result = result.filter(item => !item.workspace_id); 
    else result = result.filter(item => item.workspace_id); 

    if (nav.categoryType === 'trash') result = result.filter(item => item.is_deleted === true);
    else {
      result = result.filter(item => !item.is_deleted);
      if (nav.categoryType === 'pinned') result = result.filter(item => item.is_pinned);
      else if (nav.categoryType === 'type') {
          if (nav.category === "media") result = result.filter(item => item.type === "image" || item.type === "video");
          else if (nav.category === "notes") result = result.filter(item => item.type === "note" || !item.type);
          else if (nav.category === "links") result = result.filter(item => item.type === "link" || item.type === 'document' || item.type === 'audio');
      } else if (nav.categoryType === 'folder') result = result.filter(item => item.sections?.includes(nav.category) || item.section === nav.category);
      else if (nav.categoryType === 'list') result = result.filter(item => item.list_name === nav.category);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => `${item.title || ''} ${item.content || ''} ${(item.tags || []).join(' ')} ${item.ai_summary || ''}`.toLowerCase().includes(q));
    }
    return result.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [searchQuery, nav.category, nav.categoryType, items, nav.workspace]);

  const monthStart = startOfMonth(nav.currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const currentAvatar = session?.user?.user_metadata?.avatar_url || `https://api.dicebear.com/9.x/shapes/svg?seed=${session?.user?.email || 'default'}`;
  const userDisplayName = cleanName(session?.user?.user_metadata?.display_name || session?.user?.email);
  const userHandle = session?.user?.user_metadata?.username ? `@${session.user.user_metadata.username}` : cleanName(session?.user?.email);

  const getCategoryTitle = () => {
    if (nav.categoryType === 'trash') return 'Trash';
    if (nav.categoryType === 'pinned') return 'Pinned';
    if (nav.category === 'All') return 'Everything';
    return nav.category.charAt(0).toUpperCase() + nav.category.slice(1);
  };

  if (ui.isAuthLoading) return <div className={`flex h-screen w-full items-center justify-center ${theme.bg}`}><Loader2 strokeWidth={1.5} className={`animate-spin ${theme.textMuted}`} /></div>;

  return (
    <>
      {/* MOBILE STRICT BLOCKER */}
      <div className="flex md:hidden fixed inset-0 z-[99999] bg-[#000000] text-white flex-col items-center justify-center p-8 text-center selection:bg-teal-500/30">
         <Monitor size={80} className="mb-8 text-teal-400 opacity-90" strokeWidth={1} />
         <h2 className="text-4xl font-black tracking-tight mb-4">Desktop Only</h2>
         <p className="text-white/60 text-lg max-w-sm leading-relaxed">
           Brainboard is a powerful, expansive canvas designed for larger screens. Switch to a computer for the optimal experience.
         </p>
      </div>

      {/* DESKTOP APP & LANDING PAGE */}
      <div className="hidden md:flex h-screen w-full relative">

        {/* --- GLOBAL TOAST NOTIFICATION --- */}
        <AnimatePresence>
          {toast.visible && (
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className={`fixed bottom-8 right-8 z-[99999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl ${
                toast.error 
                  ? 'bg-red-500/90 border-red-500/50 text-white' 
                  : isDark 
                    ? 'bg-zinc-800/95 border-white/10 text-white' 
                    : 'bg-white/95 border-black/10 text-black'
              }`}
            >
              {toast.error ? <ShieldAlert size={20} /> : <Bell size={20} className="text-teal-500" />}
              <span className="font-bold text-sm tracking-wide">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {!session ? (
          <div className={`relative h-screen w-full bg-[#000000] text-white overflow-hidden font-sans selection:bg-teal-500/30 flex flex-col items-center justify-center`}>
            {/* Ambient Rotating Background Gradients */}
            <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
               <motion.div animate={{ rotate: 360, scale: [1, 1.1, 1] }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="absolute w-[60vw] h-[60vw] bg-gradient-to-tr from-teal-600/30 to-emerald-900/10 blur-[140px] rounded-full" />
               <motion.div animate={{ rotate: -360, scale: [1, 1.2, 1] }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} className="absolute w-[50vw] h-[50vw] bg-gradient-to-bl from-cyan-600/20 to-blue-900/10 blur-[140px] rounded-full translate-x-32 translate-y-32" />
            </div>

            <nav className="absolute top-0 w-full flex justify-between items-center px-12 py-8 z-50">
              <div className="font-bold text-2xl tracking-tighter flex items-center gap-3 drop-shadow-lg">
                <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10 shadow-xl"><Sparkles size={20} className="text-teal-400" /></div>
                brainboard.
              </div>
              <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={handleGoogleLogin} className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-[2rem] text-sm font-bold transition-colors backdrop-blur-xl shadow-2xl">
                 Enter Workspace
              </motion.button>
            </nav>

            {/* Floating Bento Background Elements */}
            <div className="absolute inset-0 pointer-events-none z-10 perspective-1000">
               <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[20%] left-[10%] w-64 h-48 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] shadow-2xl flex items-center justify-center rotate-[-6deg]">
                 <LayoutGrid size={60} className="text-white/20" />
               </motion.div>
               <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute top-[60%] right-[15%] w-72 h-32 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl flex items-center px-8 rotate-[4deg]">
                 <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center border border-teal-500/30 mr-4"><MessageSquare size={16} className="text-teal-400" /></div>
                 <div className="flex-1 space-y-2"><div className="h-2 w-3/4 bg-white/20 rounded-full"/><div className="h-2 w-1/2 bg-white/10 rounded-full"/></div>
               </motion.div>
               <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute top-[15%] right-[25%] w-48 h-48 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] shadow-2xl flex items-center justify-center rotate-[12deg]">
                 <Sparkles size={50} className="text-emerald-400/30" />
               </motion.div>
            </div>

            <main className="relative z-20 flex flex-col items-center text-center max-w-5xl px-6 w-full mt-10">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/10 bg-white/5 text-white/80 text-sm font-bold mb-10 shadow-2xl backdrop-blur-xl">
                <ShieldAlert size={16} className="text-teal-400" /> A private, unified canvas for your office.
              </motion.div>
              
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="text-7xl md:text-8xl lg:text-[8rem] font-black tracking-tighter mb-10 leading-[0.95] w-full drop-shadow-2xl">
                Curate your <span className="text-transparent bg-clip-text bg-gradient-to-br from-teal-400 to-emerald-600">mind.</span>
              </motion.h1>
              
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className={`max-w-2xl text-xl font-medium mb-16 leading-relaxed text-white/60 drop-shadow-md`}>
                The impossibly clean, highly visual workspace designed for teams. Drop links, write notes, organize media, and collaborate in real-time.
              </motion.p>
              
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}>
                <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={handleGoogleLogin} className={`group bg-white text-black text-lg font-black px-12 py-5 rounded-[3rem] transition-all flex items-center gap-3 shadow-[0_0_60px_rgba(20,184,166,0.4)] hover:shadow-[0_0_80px_rgba(20,184,166,0.6)]`}>
                  Authenticate Securely <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </motion.div>
            </main>
          </div>
        ) : (
          <div className={`flex h-screen w-full transition-colors duration-700 overflow-hidden ${theme.bg} ${theme.text} font-sans selection:bg-teal-500/30`}>
            <input type="file" ref={fileInputRef} onChange={handleMediaUpload} accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.txt" multiple className="hidden" />

            {/* --- MODALS --- */}
            <OnboardingModal ui={ui} profile={profile} updateProfile={updateProfile} handleUpdateProfile={handleUpdateProfile} theme={theme} isDark={isDark} />
            <LogoutConfirmModal ui={ui} updateUi={updateUi} handleSecureLogout={handleSecureLogout} theme={theme} isDark={isDark} />
            
            <SettingsModal 
              ui={ui} updateUi={updateUi} profile={profile} updateProfile={updateProfile} handleUpdateProfile={handleUpdateProfile}
              currentAvatar={currentAvatar} userDisplayName={userDisplayName} userHandle={userHandle}
              teamRole={teamRole} teamMembers={teamMembers} session={session} handleUpdateMemberRole={handleUpdateMemberRole} theme={theme} isDark={isDark}
            />
            
            <MediaViewerModal 
              media={media} updateMedia={updateMedia} closeMediaViewer={closeMediaViewer} session={session} teamRole={teamRole} 
              nav={nav} setEditingNote={setEditingNote} profile={profile} teamWorkspaceId={teamWorkspaceId} moveToTrash={moveToTrash}
              toggleItemReaction={toggleItemReaction} theme={theme} isDark={isDark} items={items}
            />
            
            <NoteEditorModal 
              editingNote={editingNote} updateLocalNoteState={updateLocalNoteState} handleCloseAndSave={handleCloseAndSave} 
              moveToTrash={moveToTrash} ui={ui} updateUi={updateUi} theme={theme} isDark={isDark} teamMembers={teamMembers} 
              mentionQuery={mentionQuery} setMentionQuery={setMentionQuery} nav={nav} session={session} teamRole={teamRole}
              showToast={showToast} toggleItemReaction={toggleItemReaction} items={items} profile={profile}
            />

            {/* --- SIDEBAR --- */}
            <aside className={`w-64 h-full shrink-0 flex flex-col relative z-20 transition-colors duration-700 ${theme.sidebar}`}>
               <div className="p-6 pb-2 pt-8 flex justify-between items-center">
                  <h1 className="font-bold text-2xl tracking-tighter flex items-center gap-2">
                    <Sparkles className="text-teal-500" size={22} strokeWidth={1.5} /> brainboard
                  </h1>
               </div>

               <div className="px-4 mb-2 mt-4">
                  <div className={`relative flex items-center p-1 rounded-2xl shadow-sm ${isDark ? 'bg-white/5 border border-white/5' : 'bg-zinc-100/80 border border-black/5'}`}>
                     <motion.div 
                       layoutId="workspace-pill"
                       className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl shadow-sm border ${isDark ? 'bg-zinc-800 border-white/5' : 'bg-white border-black/5'}`}
                       initial={false}
                       animate={{ left: nav.workspace === 'personal' ? '4px' : 'calc(50%)' }}
                       transition={modalSpring}
                     />
                     <button 
                       onClick={() => { updateNav({ workspace: 'personal', viewMode: 'grid' }); updateUi({ isChatOpen: false }); }} 
                       className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-colors ${nav.workspace === 'personal' ? 'text-teal-600 dark:text-teal-400' : theme.textMuted}`}
                     >
                       Personal
                     </button>
                     <button 
                       onClick={() => updateNav({ workspace: 'team', viewMode: 'grid' })} 
                       className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-colors ${nav.workspace === 'team' ? 'text-teal-600 dark:text-teal-400' : theme.textMuted}`}
                     >
                       Team
                     </button>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar space-y-8">
                  <div>
                     <h4 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMuted} px-3 mb-2 opacity-70`}>Overview</h4>
                     <div className="space-y-0.5">
                       <SidebarItem icon={<Compass size={16} strokeWidth={1.5}/>} label="Everything" active={nav.categoryType === "all"} onClick={() => updateNav({ categoryType: "all", category: "All" })} theme={theme} isDark={isDark} />
                       <SidebarItem icon={<Pin size={16} strokeWidth={1.5}/>} label="Pinned" active={nav.categoryType === "pinned"} onClick={() => updateNav({ categoryType: "pinned", category: "All" })} theme={theme} isDark={isDark} />
                     </div>
                  </div>

                  <div>
                     <h4 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMuted} px-3 mb-2 opacity-70`}>Content</h4>
                     <div className="space-y-0.5">
                       <SidebarItem icon={<FileText size={16} strokeWidth={1.5}/>} label="Notes" active={nav.categoryType === "type" && nav.category === "notes"} onClick={() => updateNav({ categoryType: "type", category: "notes" })} theme={theme} isDark={isDark} />
                       <SidebarItem icon={<Globe size={16} strokeWidth={1.5}/>} label="Links & Docs" active={nav.categoryType === "type" && nav.category === "links"} onClick={() => updateNav({ categoryType: "type", category: "links" })} theme={theme} isDark={isDark} />
                       <SidebarItem icon={<ImageIcon size={16} strokeWidth={1.5}/>} label="Media" active={nav.categoryType === "type" && nav.category === "media"} onClick={() => updateNav({ categoryType: "type", category: "media" })} theme={theme} isDark={isDark} />
                     </div>
                  </div>

                  <div>
                     <div className="flex items-center justify-between px-3 mb-2 group">
                       <h4 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMuted} opacity-70`}>My Lists</h4>
                       {canModifyStructure && <button onClick={() => updateSidebar({ isCreatingList: true })} className={`opacity-0 group-hover:opacity-100 transition-opacity ${theme.textMuted} hover:${theme.text}`}><Plus size={14} strokeWidth={1.5}/></button>}
                     </div>
                     <div className="space-y-0.5">
                        {sidebar.isCreatingList && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${theme.card}`}>
                            <ListIcon size={14} strokeWidth={1.5} className="text-teal-500" />
                            <input 
                              autoFocus type="text" value={sidebar.newListName} 
                              onChange={e => updateSidebar({ newListName: e.target.value })} 
                              onKeyDown={e => { if (e.key === 'Enter') { setCustomLists(p => [...p, sidebar.newListName]); updateSidebar({ isCreatingList: false, newListName: "" }); } if (e.key === 'Escape') updateSidebar({ isCreatingList: false }); }}
                              onBlur={() => { if (sidebar.newListName) setCustomLists(p => [...p, sidebar.newListName]); updateSidebar({ isCreatingList: false, newListName: "" }); }}
                              className={`bg-transparent border-none outline-none text-sm font-bold w-full ${theme.text}`}
                              placeholder="List name..." 
                            />
                          </motion.div>
                        )}
                        {listOrder.map((list, index) => (
                           <SidebarEditableItem 
                              key={list} icon={<ListIcon size={16} strokeWidth={1.5}/>} label={list} active={nav.categoryType === 'list' && nav.category === list} theme={theme} isDark={isDark} canModify={canModifyStructure}
                              onClick={() => updateNav({ categoryType: 'list', category: list })} onRename={(oldN: string, newN: string) => handleRenameList(oldN, newN)} onDelete={() => handleDeleteList(list)}
                              onMoveUp={() => setListOrder(prev => moveArrayItem(prev, index, -1))} onMoveDown={() => setListOrder(prev => moveArrayItem(prev, index, 1))}
                           />
                        ))}
                     </div>
                  </div>

                  <div>
                     <div className="flex items-center justify-between px-3 mb-2 group">
                       <h4 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMuted} opacity-70`}>Folders</h4>
                       {canModifyStructure && <button onClick={() => updateSidebar({ isCreatingFolder: true })} className={`opacity-0 group-hover:opacity-100 transition-opacity ${theme.textMuted} hover:${theme.text}`}><Plus size={14} strokeWidth={1.5}/></button>}
                     </div>
                     <div className="space-y-0.5">
                        {sidebar.isCreatingFolder && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${theme.card}`}>
                            <Folder size={14} strokeWidth={1.5} className="text-teal-500" />
                            <input autoFocus type="text" value={sidebar.newFolderName} onChange={e => updateSidebar({ newFolderName: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { setCustomFolders(p => [...p, sidebar.newFolderName]); updateSidebar({ isCreatingFolder: false, newFolderName: "" }); } if (e.key === 'Escape') updateSidebar({ isCreatingFolder: false }); }} onBlur={() => { if (sidebar.newFolderName) setCustomFolders(p => [...p, sidebar.newFolderName]); updateSidebar({ isCreatingFolder: false, newFolderName: "" }); }} className={`bg-transparent border-none outline-none text-sm font-bold w-full ${theme.text}`} placeholder="Folder name..." />
                          </motion.div>
                        )}
                        {folderOrder.map((folder, index) => (
                           <SidebarEditableItem 
                              key={folder} icon={<Folder size={16} strokeWidth={1.5}/>} label={folder} active={nav.categoryType === 'folder' && nav.category === folder} theme={theme} isDark={isDark} canModify={canModifyStructure}
                              onClick={() => updateNav({ categoryType: 'folder', category: folder })} 
                              onRename={(oldN: string, newN: string) => handleRenameFolder(oldN, newN)} onDelete={() => handleDeleteFolder(folder)}
                              onMoveUp={() => setFolderOrder(prev => moveArrayItem(prev, index, -1))} onMoveDown={() => setFolderOrder(prev => moveArrayItem(prev, index, 1))}
                           />
                        ))}
                     </div>
                  </div>

                  <div className="pt-2">
                       <SidebarItem icon={<Trash size={16} strokeWidth={1.5}/>} label="Trash" active={nav.categoryType === "trash"} onClick={() => updateNav({ categoryType: "trash", category: "All" })} theme={theme} isDark={isDark} />
                  </div>
               </div>

               <div className={`p-4 mt-auto border-t transition-colors ${isDark ? 'border-white/5' : 'border-zinc-200'}`}>
                 <motion.div whileHover={bounceHover} whileTap={bounceTap} className={`flex items-center gap-3 w-full text-left px-2 py-2 rounded-[2rem] transition-all cursor-pointer ${theme.btnGhost}`}>
                   <img src={currentAvatar} className={`w-10 h-10 rounded-full object-cover shadow-sm ring-2 ${isDark ? 'ring-white/10' : 'ring-black/5'}`} alt="Avatar" />
                   <div className="flex-1 min-w-0">
                     <h3 className="font-bold text-sm truncate leading-tight">{userDisplayName}</h3>
                   </div>
                   <button onClick={() => updateUi({ isAccountOpen: true })} className={`p-2 rounded-2xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`} title="Settings"><Settings size={18} strokeWidth={1.5}/></button>
                 </motion.div>
               </div>
            </aside>

            {/* --- MAIN CONTENT AREA --- */}
            <main 
              ref={mainContentRef}
              className="flex-1 flex flex-col relative overflow-hidden focus:outline-none"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              tabIndex={0} 
            >
              <AnimatePresence>
                {ui.isDragging && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-teal-500/10 backdrop-blur-md border-4 border-teal-500/50 border-dashed m-6 rounded-[3rem] flex items-center justify-center pointer-events-none"
                  >
                    <div className="bg-white dark:bg-zinc-900 px-10 py-8 rounded-[3rem] shadow-2xl flex flex-col items-center gap-4 border border-zinc-200 dark:border-zinc-800">
                      <UploadCloud size={48} strokeWidth={1.5} className="text-teal-500 animate-bounce" />
                      <h2 className="text-2xl font-bold tracking-tight">Drop files to upload</h2>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <header className="w-full px-10 pt-8 pb-6 shrink-0 flex items-center justify-between gap-6 z-10">
                <div className="flex-1 max-w-xl flex items-center gap-4">
                  <div className="relative group flex-1">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${theme.textMuted} group-focus-within:text-teal-500`} />
                    <input type="text" placeholder={`Search in ${getCategoryTitle()}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full rounded-[2rem] py-3.5 pl-11 pr-4 text-sm font-medium outline-none transition-all ${theme.input} leading-normal`} />
                  </div>

                  <div className={`flex items-center p-1 rounded-[2rem] border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-zinc-200 shadow-sm'}`}>
                     <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={() => updateNav({ viewMode: 'grid' })} className={`p-2.5 rounded-full transition-all ${nav.viewMode === 'grid' ? (isDark ? 'bg-white/10 text-teal-400 shadow-sm' : 'bg-zinc-100 text-teal-600 shadow-sm') : theme.textMuted}`} title="Masonry Grid">
                       <Columns size={18} strokeWidth={1.5} />
                     </motion.button>
                     <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={() => updateNav({ viewMode: 'card' })} className={`p-2.5 rounded-full transition-all ${nav.viewMode === 'card' ? (isDark ? 'bg-white/10 text-teal-400 shadow-sm' : 'bg-zinc-100 text-teal-600 shadow-sm') : theme.textMuted}`} title="Uniform Cards">
                       <LayoutGrid size={18} strokeWidth={1.5} />
                     </motion.button>
                     <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={() => updateNav({ viewMode: 'list' })} className={`p-2.5 rounded-full transition-all ${nav.viewMode === 'list' ? (isDark ? 'bg-white/10 text-teal-400 shadow-sm' : 'bg-zinc-100 text-teal-600 shadow-sm') : theme.textMuted}`} title="List View">
                       <AlignJustify size={18} strokeWidth={1.5} />
                     </motion.button>
                     <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={() => updateNav({ viewMode: 'calendar' })} className={`p-2.5 rounded-full transition-all ${nav.viewMode === 'calendar' ? (isDark ? 'bg-white/10 text-teal-400 shadow-sm' : 'bg-zinc-100 text-teal-600 shadow-sm') : theme.textMuted}`} title="Calendar View">
                       <CalendarIcon size={18} strokeWidth={1.5} />
                     </motion.button>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 shrink-0">
                  <ThemeToggle isDark={isDark} toggle={toggleTheme} />

                  <AnimatePresence>
                     {nav.workspace === 'team' && (
                       <>
                         <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={() => updateUi({ isChatOpen: !ui.isChatOpen })} className={`p-3 rounded-full border shadow-sm transition-all ${ui.isChatOpen ? 'bg-teal-500 text-white border-teal-600' : (isDark ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-50')}`}>
                            <MessageSquare size={18} strokeWidth={ui.isChatOpen ? 2 : 1.5} className={ui.isChatOpen ? 'text-white' : theme.textMuted} />
                         </motion.button>

                         <div className="relative">
                            <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={() => updateUi({ showNotifications: !ui.showNotifications })} className={`p-3 rounded-full border shadow-sm transition-all ${isDark ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-50'}`}>
                               <Bell size={18} strokeWidth={1.5} className={theme.textMuted} />
                               {notifications.some(n => !n.read) && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900" />}
                            </motion.button>
                            <AnimatePresence>
                               {ui.showNotifications && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => updateUi({ showNotifications: false })} />
                                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={modalSpring} className={`absolute right-0 top-full mt-3 w-80 z-50 rounded-[2.5rem] shadow-2xl border backdrop-blur-2xl p-2 ${isDark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white/95 border-zinc-200'}`}>
                                       <div className="p-4 border-b border-black/5 dark:border-white/5 mb-2 flex items-center justify-between">
                                          <h4 className={`text-xs font-bold uppercase tracking-widest ${theme.textMuted}`}>Notifications</h4>
                                          {notifications.some(n => !n.read) && (
                                             <button onClick={handleMarkAllAsRead} className="text-[10px] text-teal-500 hover:text-teal-600 font-bold uppercase tracking-widest">Mark all read</button>
                                          )}
                                       </div>
                                       <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                                          {notifications.length === 0 ? (
                                              <div className="p-6 text-center text-sm text-zinc-500">No new notifications.</div>
                                          ) : notifications.map(n => (
                                             <div key={n.id} onClick={() => handleMarkAsRead(n.id)} className={`p-4 rounded-3xl transition-colors cursor-pointer group ${n.read ? 'opacity-60' : (isDark ? 'bg-white/5' : 'bg-black/5')} hover:bg-teal-500/10 relative`}>
                                                <p className={`text-sm font-medium leading-snug mb-1.5 pr-6 ${theme.text}`}>{n.text}</p>
                                                <p className="text-[10px] font-bold text-teal-500 uppercase tracking-widest">{formatDistanceToNow(n.time)} ago</p>
                                                {!n.read && <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"><CheckCircle size={18} className="text-teal-500" /></div>}
                                             </div>
                                          ))}
                                       </div>
                                    </motion.div>
                                  </>
                               )}
                            </AnimatePresence>
                         </div>

                         <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="relative">
                            <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={() => updateUi({ showTeamPresence: !ui.showTeamPresence })} className={`hidden md:flex items-center p-1.5 rounded-full shadow-sm cursor-pointer hover:shadow-md transition-shadow border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                              <div className="flex -space-x-2 pl-1.5">
                                {teamMembers.filter(m => m.inWorkspace).slice(0, 3).map((member, i) => (
                                   <img key={i} className={`inline-block h-8 w-8 rounded-full ring-2 object-cover ${isDark ? 'ring-zinc-900' : 'ring-white'}`} src={member.avatar} alt=""/>
                                ))}
                              </div>
                              <div className="px-4 flex items-center gap-1.5 text-xs font-bold text-zinc-500 uppercase tracking-widest"><Users size={14} strokeWidth={2}/> Team</div>
                            </motion.button>
                            <AnimatePresence>
                               {ui.showTeamPresence && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => updateUi({ showTeamPresence: false })} />
                                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={modalSpring} className={`absolute right-0 top-full mt-3 w-80 z-50 rounded-[2.5rem] shadow-2xl border backdrop-blur-2xl p-2 ${isDark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white/95 border-zinc-200'}`}>
                                       <div className="p-4">
                                          <h4 className={`text-xs font-bold uppercase tracking-widest mb-4 ${theme.textMuted}`}>Online Now</h4>
                                          <div className="space-y-4">
                                             {teamMembers.filter(m => m.inWorkspace && m.status === 'online').map(member => (
                                                <div key={member.id} className="flex items-center justify-between gap-3 w-full">
                                                   <div className="flex items-center gap-3 min-w-0 flex-1">
                                                      <img src={member.avatar} className="w-10 h-10 rounded-full object-cover shadow-sm shrink-0" />
                                                      <span className={`text-sm font-bold truncate ${theme.text}`}>{cleanName(member.name)}</span>
                                                   </div>
                                                   <div className="flex items-center shrink-0 ml-2">
                                                      <Circle size={12} className="fill-emerald-500 text-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                                                   </div>
                                                </div>
                                             ))}
                                             {teamMembers.filter(m => m.inWorkspace && m.status === 'online').length === 0 && (
                                                 <p className="text-sm text-zinc-500 font-medium">No one online.</p>
                                             )}
                                          </div>
                                       </div>
                                       <div className={`p-4 border-t ${isDark ? 'border-white/5' : 'border-black/5'} mt-2 pt-5`}>
                                          <h4 className={`text-xs font-bold uppercase tracking-widest mb-4 ${theme.textMuted}`}>Offline</h4>
                                          <div className="space-y-5">
                                             {teamMembers.filter(m => m.inWorkspace && m.status === 'offline').map(member => (
                                                <div key={member.id} className="flex items-center justify-between gap-3 w-full opacity-60">
                                                   <div className="flex items-center gap-3 min-w-0 flex-1">
                                                      <img src={member.avatar} className="w-10 h-10 rounded-full object-cover grayscale shrink-0" />
                                                      <span className={`text-sm font-bold truncate ${theme.text}`}>{cleanName(member.name)}</span>
                                                   </div>
                                                   <div className="flex items-center shrink-0 ml-2">
                                                      <span className="text-[10px] font-medium text-zinc-500 whitespace-nowrap">seen {formatDistanceToNow(member.lastSeen)} ago</span>
                                                   </div>
                                                </div>
                                             ))}
                                          </div>
                                       </div>
                                    </motion.div>
                                  </>
                               )}
                            </AnimatePresence>
                         </motion.div>
                       </>
                     )}
                  </AnimatePresence>

                  {ui.isSaving && <span className="flex items-center gap-2 text-[10px] font-bold text-teal-500 uppercase tracking-widest"><Loader2 size={12} strokeWidth={2} className="animate-spin"/></span>}
                  {ui.isAILoading && <span className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest"><Wand2 size={12} strokeWidth={2} className="animate-bounce"/> Extracting</span>}
                  
                  <AnimatePresence mode="wait">
                    {nav.categoryType === 'trash' ? (
                      <motion.button key="btn-trash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} whileHover={bounceHover} whileTap={bounceTap} onClick={emptyTrash} className={`px-6 py-3 rounded-full text-sm font-bold transition-all flex items-center gap-2 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white`}>
                        <Trash2 size={16} strokeWidth={2} /> Empty Trash
                      </motion.button>
                    ) : (
                      <motion.div key="btn-all" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-2">
                        {teamRole !== 'viewer' && teamRole !== 'none' && (
                           <>
                              <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={() => fileInputRef.current?.click()} disabled={ui.isUploading} className={`px-5 py-3 rounded-full text-sm font-bold transition-all flex items-center justify-center border ${theme.card} hover:opacity-80 active:scale-95`} title="Upload File, Image, Video, Audio">
                                 {ui.isUploading ? <Loader2 size={18} strokeWidth={2} className="animate-spin" /> : <ImageIcon size={18} strokeWidth={1.5} />}
                              </motion.button>
                              <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={handleNewChecklist} className={`px-5 py-3 rounded-full text-sm font-bold transition-all flex items-center justify-center border ${theme.card} hover:opacity-80 active:scale-95`} title="New Checklist">
                                 <CheckSquare size={18} strokeWidth={1.5} />
                              </motion.button>
                              <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={handleNewNote} className={`px-8 py-3 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${theme.btnPrimary}`}>
                                 <Plus size={16} strokeWidth={2} /> New Note
                              </motion.button>
                           </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </header>

              <div className="px-10 pb-6 flex items-end justify-between">
                 <div>
                   {nav.viewMode === 'grid' || nav.viewMode === 'card' || nav.viewMode === 'list' ? (
                      <>
                       <h2 className="text-4xl font-black tracking-tighter leading-tight">
                         {getCategoryTitle()}
                       </h2>
                       <p className={`mt-1 text-sm font-medium flex items-center gap-2 ${theme.textMuted}`}>
                          {filteredData.length} items curated
                       </p>
                      </>
                   ) : (
                      <div className="flex items-center gap-6">
                        <h2 className="text-4xl font-black tracking-tighter leading-tight">{format(nav.currentDate, 'MMMM yyyy')}</h2>
                        <div className={`flex items-center gap-1 border rounded-[2rem] p-1 shadow-sm backdrop-blur-md ${isDark ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                           <button onClick={() => updateNav({ currentDate: subMonths(nav.currentDate, 1) })} className={`p-2.5 rounded-full transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-100' : 'hover:bg-zinc-100 text-zinc-900'}`}><ChevronLeft size={18} strokeWidth={1.5}/></button>
                           <button onClick={() => updateNav({ currentDate: new Date() })} className={`px-5 py-2 text-sm font-bold rounded-full transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}>Today</button>
                           <button onClick={() => updateNav({ currentDate: addMonths(nav.currentDate, 1) })} className={`p-2.5 rounded-full transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-100' : 'hover:bg-zinc-100 text-zinc-900'}`}><ChevronRightIcon size={18} strokeWidth={1.5}/></button>
                        </div>
                      </div>
                   )}
                 </div>
              </div>

              {/* --- DYNAMIC VIEWS --- */}
              <div className="flex-1 overflow-y-auto px-10 pb-20 custom-scrollbar relative">
                {isLoading ? (
                   <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-6 space-y-6">
                     {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className={`h-40 rounded-[2.5rem] break-inside-avoid animate-pulse border ${theme.card}`} />)}
                   </div>
                ) : filteredData.length === 0 && (nav.viewMode === 'grid' || nav.viewMode === 'card') ? (
                   <div className="h-full w-full flex flex-col items-center justify-center text-center pb-20 opacity-50">
                      <LayoutGrid size={64} strokeWidth={1} className={`mb-6 ${theme.textMuted}`} />
                      <h3 className="text-3xl font-black tracking-tight mb-2">A blank canvas.</h3>
                      <p className={`text-base font-medium ${theme.textMuted}`}>Drag & drop files, or press Ctrl+V to paste inspiration.</p>
                   </div>
                   
                ) : nav.viewMode === 'list' ? (
                   /* --- HIGH DENSITY LIST VIEW --- */
                   <div className="flex flex-col gap-3 pb-10">
                      <AnimatePresence>
                         {filteredData.map((item) => {
                            const isSocialVideo = item.url && (item.url.includes('instagram.com') || item.url.includes('youtube.com') || item.url.includes('youtu.be'));
                            const itemType = isSocialVideo ? 'social_video' : (item.type || (item.url ? 'link' : 'note'));
                            const canModify = nav.workspace === 'personal' || teamRole === 'admin' || teamRole === 'editor' || item.user_id === session?.user?.id;
                            
                            return (
                               <motion.div 
                                  key={item.id} layout variants={cardVariants} initial="hidden" animate="visible" exit="exit" 
                                  onClick={() => {
                                     if (nav.categoryType === 'trash') return; 
                                     if (itemType === 'document' && item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
                                     else if (item.url && item.type !== 'note') window.open(item.url, '_blank', 'noopener,noreferrer');
                                     else (item.type === 'image' || item.type === 'video') ? updateMedia({ item }) : setEditingNote(item);
                                  }}
                                  className={`group flex items-center justify-between p-4 rounded-[2rem] border ${theme.card} ${theme.cardHover} cursor-pointer transition-all duration-300`}
                               >
                                  <div className="flex items-center gap-5 flex-1 min-w-0">
                                     <div className={`w-16 h-16 rounded-[1.2rem] overflow-hidden shrink-0 flex items-center justify-center border ${isDark ? 'bg-zinc-800 border-white/5' : 'bg-zinc-100 border-black/5'}`}>
                                        {item.thumbnail_url || item.img ? (
                                           <img src={item.thumbnail_url || item.img} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                           itemType === 'note' ? <FileText size={28} strokeWidth={1.5} className="text-emerald-500" /> : 
                                           itemType === 'document' ? <FileIcon size={28} strokeWidth={1.5} className="text-blue-500" /> :
                                           itemType === 'audio' ? <Music size={28} strokeWidth={1.5} className="text-fuchsia-500" /> :
                                           <Globe size={28} strokeWidth={1.5} className="text-teal-500" />
                                        )}
                                     </div>
                                     <div className="flex flex-col min-w-0 flex-1 pl-2">
                                        <h4 className={`font-bold text-lg truncate mb-1 ${theme.text}`}>{item.title || 'Untitled'}</h4>
                                        <p className={`text-sm font-medium truncate ${theme.textMuted}`}>{item.url || item.ai_summary || item.content || 'No description'}</p>
                                     </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-6 shrink-0 pl-6">
                                     {item.list_name && <span className={`hidden lg:block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${isDark ? 'bg-white/5 text-white/50' : 'bg-black/5 text-black/50'}`}>{item.list_name}</span>}
                                     
                                     {nav.workspace === 'team' && item.creator && (
                                        <div className="hidden md:flex items-center gap-2" title={`Added by ${cleanName(item.creator)}`}>
                                           <img src={item.creator_avatar || `https://api.dicebear.com/9.x/shapes/svg?seed=${item.creator}`} loading="lazy" className="w-8 h-8 rounded-full shadow-sm" />
                                        </div>
                                     )}
                                     
                                     <span className={`text-sm font-bold uppercase tracking-widest w-24 text-right hidden sm:block ${theme.textMuted}`}>{format(new Date(item.created_at || Date.now()), 'MMM d')}</span>
                                     
                                     {canModify && (
                                       <div className="flex items-center gap-2 pl-4 border-l border-black/5 dark:border-white/5">
                                          {nav.categoryType === 'trash' ? (
                                             <>
                                                <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={(e) => { e.stopPropagation(); restoreFromTrash(item.id); }} className={`p-3 rounded-full transition-colors ${isDark ? 'hover:bg-emerald-500/20 text-emerald-400' : 'hover:bg-emerald-100 text-emerald-600'}`}><RotateCcw size={18} strokeWidth={1.5}/></motion.button>
                                                <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={(e) => { e.stopPropagation(); hardDelete(item.id); }} className={`p-3 rounded-full transition-colors ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-600'}`}><Trash2 size={18} strokeWidth={1.5}/></motion.button>
                                             </>
                                          ) : (
                                             <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={(e) => { e.stopPropagation(); moveToTrash(item.id); }} className={`p-3 rounded-full transition-all opacity-0 group-hover:opacity-100 ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-600'}`}><Trash2 size={18} strokeWidth={1.5}/></motion.button>
                                          )}
                                       </div>
                                     )}
                                  </div>
                               </motion.div>
                            )
                         })}
                      </AnimatePresence>
                   </div>

                ) : nav.viewMode === 'card' || nav.viewMode === 'grid' ? (
                  /* --- UNIFORM CARD AND MASONRY VIEWS WITH MEMOIZATION --- */
                  <motion.div variants={staggerVariants} initial="hidden" animate="visible" className={nav.viewMode === 'grid' ? "columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-6 space-y-6" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"}>
                    <AnimatePresence>
                      {filteredData.map((item) => (
                        <motion.div key={item.id} layout variants={cardVariants} initial="hidden" animate="visible" exit="exit" className={nav.viewMode === 'grid' ? "break-inside-avoid" : "h-full"}>
                           <MemoizedMasonryCard 
                             viewMode={nav.viewMode} item={item} theme={theme} isDark={isDark} inTrash={nav.categoryType === 'trash'} activeWorkspace={nav.workspace} currentUserId={session?.user?.id} teamRole={teamRole}
                             onRestore={restoreFromTrash} onHardDelete={hardDelete} onDelete={moveToTrash} onUpdateSticky={updateStickyNote} toggleItemReaction={toggleItemReaction} toggleChecklistItem={toggleChecklistItem}
                             onClick={() => {
                               if (nav.categoryType === 'trash') return; 
                               if (item.type === 'document' && item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
                               else if (item.url && item.type !== 'note') { window.open(item.url, '_blank', 'noopener,noreferrer'); } 
                               else { (item.type === 'image' || item.type === 'video') ? updateMedia({ item }) : setEditingNote(item); }
                             }} 
                           />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>

                ) : (
                  /* --- CALENDAR VIEW --- */
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={modalSpring} className={`w-full rounded-[2.5rem] overflow-hidden flex flex-col shadow-sm border mb-10 ${isDark ? 'bg-[#121214]/50 border-zinc-800/80 backdrop-blur-xl' : 'bg-white border-zinc-200'}`}>
                     <div className={`grid grid-cols-7 border-b shrink-0 ${isDark ? 'border-zinc-800/80 bg-black/20' : 'border-zinc-200 bg-zinc-50'}`}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                           <div key={day} className={`p-5 text-center text-xs font-bold uppercase tracking-widest ${theme.textMuted}`}>{day}</div>
                        ))}
                     </div>
                     <div className={`grid grid-cols-7 auto-rows-fr gap-px ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-200'}`}>
                        {calendarDays.map((day, idx) => {
                           const dayItems = filteredData.filter(item => {
                               const targetDate = item.scheduled_for ? new Date(item.scheduled_for) : new Date(item.created_at || new Date());
                               return isSameDay(targetDate, day);
                           });
                           const isCurrentMonth = isSameMonth(day, monthStart);
                           const isToday = isSameDay(day, new Date());

                           return (
                             <div key={day.toString()} className={`min-h-[140px] p-4 flex flex-col gap-3 transition-colors ${isCurrentMonth ? (isDark ? 'bg-[#09090b]' : 'bg-white') : (isDark ? 'bg-[#09090b]/50 opacity-40' : 'bg-zinc-50 opacity-50')}`}>
                                <div className={`text-sm font-black w-10 h-10 flex items-center justify-center rounded-full shrink-0 ${isToday ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20' : theme.textMuted}`}>{format(day, 'd')}</div>
                                <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1">
                                   {dayItems.map(item => {
                                      const isVideo = item.url && (item.url.includes('instagram.com') || item.url.includes('youtube.com') || item.url.includes('youtu.be'));
                                      const chipColor = isVideo 
                                         ? (isDark ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' : 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200') 
                                         : item.type === 'note' 
                                         ? (isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-100 text-emerald-700 border-emerald-200')
                                         : (isDark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-100 text-blue-700 border-blue-200');
                                      const Icon = isVideo ? Play : item.type === 'note' ? FileText : Globe;
                                      
                                      return (
                                         <motion.div 
                                           key={item.id} 
                                           whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                           onClick={() => {
                                              if (item.type === 'document' && item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
                                              else if (item.url && item.type !== 'note') window.open(item.url, '_blank', 'noopener,noreferrer');
                                              else (item.type === 'image' || item.type === 'video') ? updateMedia({ item }) : setEditingNote(item);
                                           }}
                                           className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer shadow-sm truncate ${chipColor}`}
                                         >
                                            <Icon size={14} strokeWidth={2} className="shrink-0" />
                                            <span className="truncate">{item.title || "Untitled"}</span>
                                         </motion.div>
                                      )
                                   })}
                                </div>
                             </div>
                           )
                        })}
                     </div>
                  </motion.div>
                )}

                {/* --- SLIDE-OUT TEAM CHAT EXTRACTED COMPONENT --- */}
                <TeamChatDrawer 
                  isChatOpen={ui.isChatOpen} 
                  closeChat={() => updateUi({ isChatOpen: false })}
                  navWorkspace={nav.workspace}
                  isDark={isDark}
                  theme={theme}
                  chatMessages={chatMessages}
                  chatScrollRef={chatScrollRef}
                  session={session}
                  mentionQuery={mentionQuery}
                  teamMembers={teamMembers}
                  insertMention={insertChatMention}
                  chatInput={chatInput}
                  handleTextareaChange={handleChatTextareaChange}
                  handleSendChatMessage={handleSendChatMessage}
                  chatInputRef={chatInputRef}
                />

              </div>
            </main>

          </div>
        )}
      </div>
    </>
  );
}

// ==========================================
// --- EXTRACTED MODAL SUB-COMPONENTS ---
// ==========================================

function LogoutConfirmModal({ ui, updateUi, handleSecureLogout, theme, isDark }: any) {
  if (!ui.showLogoutConfirm) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={modalSpring}
          className={`w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl flex flex-col border ${isDark ? 'bg-[#121214] border-white/10' : 'bg-white border-zinc-200'}`}
        >
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6 mx-auto"><LogOut size={28} strokeWidth={2} /></div>
          <h2 className="text-2xl font-black tracking-tight text-center mb-2">Sign Out?</h2>
          <p className={`text-sm font-medium text-center mb-8 ${theme.textMuted}`}>Are you sure you want to securely log out of your workspace?</p>
          <div className="flex gap-3 w-full">
            <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={() => updateUi({ showLogoutConfirm: false })} className={`flex-1 py-3.5 rounded-full font-bold text-sm transition-all ${theme.btnGhost}`}>Cancel</motion.button>
            <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={handleSecureLogout} className={`flex-1 py-3.5 rounded-full font-bold text-sm bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition-all`}>Sign Out</motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function OnboardingModal({ ui, profile, updateProfile, handleUpdateProfile, theme, isDark }: any) {
  return (
    <AnimatePresence>
       {ui.showOnboarding && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
             <motion.div initial={{ scale: 0.95, y: 30 }} animate={{ scale: 1, y: 0 }} transition={modalSpring} className={`w-full max-w-lg p-12 rounded-[3rem] shadow-2xl flex flex-col border ${isDark ? 'bg-[#121214] border-white/10' : 'bg-white border-zinc-200'}`}>
                <div className="flex flex-col items-center text-center mb-10">
                   <div className="w-20 h-20 bg-teal-500/20 text-teal-500 rounded-[2rem] flex items-center justify-center mb-6"><Sparkles size={40} strokeWidth={1.5} /></div>
                   <h2 className="text-4xl font-black tracking-tight mb-3">Welcome aboard!</h2>
                   <p className={`text-base font-medium leading-relaxed ${theme.textMuted}`}>Let's set up your profile so your team knows who you are.</p>
                </div>
                
                <div className="space-y-6">
                   <div>
                      <label className={`text-[10px] font-bold uppercase tracking-widest mb-3 block ml-2 opacity-70 ${theme.textMuted}`}>Full Name</label>
                      <input type="text" value={profile.displayName} onChange={e => updateProfile({ displayName: e.target.value })} className={`w-full rounded-[2rem] px-6 py-4 text-base font-bold outline-none transition-all shadow-sm ${theme.input}`} placeholder="John Doe" />
                   </div>
                   <div>
                      <label className={`text-[10px] font-bold uppercase tracking-widest mb-3 block ml-2 opacity-70 ${theme.textMuted}`}>Unique Username</label>
                      <input type="text" value={profile.username} onChange={e => updateProfile({ username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''), error: "" })} className={`w-full rounded-[2rem] px-6 py-4 text-base font-bold outline-none transition-all shadow-sm ${theme.input} ${profile.error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`} placeholder="johndoe123" />
                      {profile.error && <p className="text-xs text-red-500 font-bold uppercase tracking-widest mt-3 ml-2">{profile.error}</p>}
                   </div>
                   <div>
                      <label className={`text-[10px] font-bold uppercase tracking-widest mb-3 block ml-2 opacity-70 ${theme.textMuted}`}>Bio (Optional)</label>
                      <input type="text" value={profile.bio} onChange={e => updateProfile({ bio: e.target.value })} className={`w-full rounded-[2rem] px-6 py-4 text-base font-bold outline-none transition-all shadow-sm ${theme.input}`} placeholder="What do you do?" />
                   </div>
                   
                   <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={handleUpdateProfile} disabled={profile.isSaving || !profile.username || !profile.displayName} className={`w-full mt-6 font-black text-xl py-5 rounded-[2.5rem] transition-all flex items-center justify-center gap-3 ${theme.btnPrimary} disabled:opacity-50 disabled:hover:scale-100`}>
                      {profile.isSaving ? <Loader2 size={24} strokeWidth={2} className="animate-spin" /> : "Complete Setup"}
                   </motion.button>
                </div>
             </motion.div>
          </motion.div>
       )}
    </AnimatePresence>
  );
}

function SettingsModal({ ui, updateUi, profile, updateProfile, handleUpdateProfile, currentAvatar, userDisplayName, userHandle, teamRole, teamMembers, session, handleUpdateMemberRole, theme, isDark }: any) {
  return (
    <AnimatePresence>
      {ui.isAccountOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 md:p-12" onMouseDown={() => updateUi({ isAccountOpen: false })}>
          <motion.div initial={{ scale: 0.95, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 30, opacity: 0 }} transition={modalSpring} onMouseDown={(e) => e.stopPropagation()} className={`relative w-full max-w-5xl h-[85vh] md:h-[650px] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border ${isDark ? 'border-white/10 bg-[#121214]/95' : 'border-zinc-200 bg-white/95'} backdrop-blur-3xl`}>
            <button className={`absolute top-8 right-8 p-3.5 rounded-full transition-colors z-10 ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'}`} onClick={() => updateUi({ isAccountOpen: false })}><X size={24} strokeWidth={1.5}/></button>
            
            <div className={`w-full md:w-1/3 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r ${isDark ? 'border-white/5 bg-white/[0.02]' : 'border-zinc-200 bg-zinc-50/[0.5]'}`}>
               <div className="p-12 flex flex-col items-center justify-center w-full">
                   <motion.div whileHover={{ scale: 1.05 }} className="relative group cursor-pointer mb-8" onClick={() => alert("Avatar upload placeholder")}>
                      <img src={currentAvatar} className={`w-32 h-32 rounded-[2.5rem] object-cover shadow-2xl ring-4 ${isDark ? 'ring-white/10' : 'ring-black/5'}`} alt="Avatar" />
                      <div className="absolute inset-0 bg-black/60 rounded-[2.5rem] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                         {ui.isUploading ? <Loader2 size={32} strokeWidth={1.5} className="animate-spin text-white" /> : <Camera size={32} strokeWidth={1.5} className="text-white" />}
                      </div>
                   </motion.div>
                   <h3 className="font-black text-2xl tracking-tight text-center w-full truncate">{userDisplayName}</h3>
                   <p className={`text-base mt-2 mb-10 font-bold ${theme.textMuted}`}>{userHandle}</p>
                   
                   <div className="w-full flex flex-col gap-3">
                      <button onClick={() => updateUi({ settingsTab: 'account' })} className={`w-full text-left px-5 py-4 rounded-full font-bold text-base transition-all ${ui.settingsTab === 'account' ? (isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black') : theme.textMuted}`}>Account</button>
                      {teamRole === 'admin' && (
                         <button onClick={() => updateUi({ settingsTab: 'team' })} className={`w-full text-left px-5 py-4 rounded-full font-bold text-base transition-all ${ui.settingsTab === 'team' ? (isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black') : theme.textMuted}`}>Team Space</button>
                      )}
                   </div>

                   <button onClick={() => updateUi({ showLogoutConfirm: true })} className={`mt-auto pt-10 transition-all font-black text-sm uppercase tracking-widest text-red-500 hover:text-red-400 flex items-center gap-2`} title="Log Out"><LogOut size={16} strokeWidth={2} /> Sign Out</button>
               </div>
            </div>

            <div className="w-full md:w-2/3 p-12 md:p-16 overflow-y-auto custom-scrollbar flex flex-col justify-start bg-transparent relative">
               {ui.settingsTab === 'account' ? (
                   <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={modalSpring}>
                       <h2 className="text-4xl font-black tracking-tight mb-12 flex items-center gap-4"><Settings size={36} strokeWidth={1.5} className="text-teal-500" /> Settings</h2>
                       <div className="space-y-8">
                         <div>
                           <label className={`text-xs font-bold uppercase tracking-widest mb-3 block ml-2 opacity-70 ${theme.textMuted}`}>Display Name</label>
                           <input type="text" value={profile.displayName} onChange={e => updateProfile({ displayName: e.target.value })} className={`w-full rounded-[2rem] px-6 py-5 text-base font-bold outline-none transition-all leading-normal shadow-sm ${theme.input}`} placeholder="What should we call you?" />
                         </div>
                         <div>
                           <label className={`text-xs font-bold uppercase tracking-widest mb-3 block ml-2 opacity-70 ${theme.textMuted}`}>Unique Username</label>
                           <input type="text" value={profile.username} onChange={e => updateProfile({ username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''), error: "" })} className={`w-full rounded-[2rem] px-6 py-5 text-base font-bold outline-none transition-all leading-normal shadow-sm ${theme.input} ${profile.error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`} placeholder="your_username" />
                           {profile.error && <p className="text-xs text-red-500 font-bold uppercase tracking-widest mt-3 ml-2">{profile.error}</p>}
                         </div>
                         <div>
                           <label className={`text-xs font-bold uppercase tracking-widest mb-3 block ml-2 opacity-70 ${theme.textMuted}`}>Bio (Optional)</label>
                           <input type="text" value={profile.bio} onChange={e => updateProfile({ bio: e.target.value })} className={`w-full rounded-[2rem] px-6 py-5 text-base font-bold outline-none transition-all leading-normal shadow-sm ${theme.input}`} placeholder="What do you do?" />
                         </div>
                         <div className="pt-6">
                           <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={handleUpdateProfile} disabled={profile.isSaving || !profile.username || !profile.displayName} className={`w-full font-black text-xl py-6 rounded-[2.5rem] transition-all flex items-center justify-center gap-3 ${theme.btnPrimary} disabled:opacity-50 disabled:hover:scale-100`}>
                             {profile.isSaving ? <Loader2 size={24} strokeWidth={2} className="animate-spin" /> : <><CheckCircle2 size={24} strokeWidth={2} /> Save Changes</>}
                           </motion.button>
                         </div>
                       </div>
                   </motion.div>
               ) : (
                   <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={modalSpring}>
                       <h2 className="text-4xl font-black tracking-tight mb-3 flex items-center gap-4"><ShieldAlert size={36} strokeWidth={1.5} className="text-teal-500" /> Team Space</h2>
                       <p className={`text-base font-medium mb-10 leading-relaxed ${theme.textMuted}`}>Manage members and access levels for your office workspace.</p>

                       <div>
                          <label className={`text-xs font-bold uppercase tracking-widest mb-4 block ml-2 opacity-70 ${theme.textMuted}`}>All Authenticated Users</label>
                          <div className={`rounded-[2.5rem] border overflow-hidden shadow-sm ${isDark ? 'border-white/10' : 'border-zinc-200'}`}>
                             {teamMembers.map((member: any, i: number) => (
                                <div key={member.id} className={`flex items-center justify-between p-5 ${i !== 0 ? (isDark ? 'border-t border-white/10' : 'border-t border-zinc-200') : ''}`}>
                                   <div className="flex items-center gap-4 min-w-0">
                                      <img src={member.avatar} loading="lazy" className="w-12 h-12 rounded-full object-cover shadow-sm shrink-0" />
                                      <div className="min-w-0 flex flex-col">
                                         <h4 className={`text-base font-black truncate leading-tight ${theme.text}`}>{cleanName(member.name)} {member.id === session?.user?.id && '(You)'}</h4>
                                         <p className={`text-xs uppercase truncate font-bold tracking-widest mt-1 ${theme.textMuted}`}>@{member.username || 'unknown'}</p>
                                      </div>
                                   </div>
                                   
                                   <div className="flex items-center gap-3 shrink-0 ml-4">
                                      <select 
                                         disabled={member.role === 'admin' || member.id === session?.user?.id}
                                         value={member.inWorkspace ? (member.role || 'viewer') : 'none'} 
                                         onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                                         className={`text-xs font-black uppercase tracking-widest px-4 py-3 rounded-full outline-none appearance-none transition-all ${member.role === 'admin' || member.id === session?.user?.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}
                                      >
                                         <option value="none">Not in Team</option>
                                         {/* Only Harshit has Admin capabilities. Hidden from others. */}
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

function MediaViewerModal({ media, updateMedia, closeMediaViewer, session, teamRole, nav, setEditingNote, profile, teamWorkspaceId, moveToTrash, toggleItemReaction, theme, isDark, items }: any) {
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const currentItem = items.find((i: BentoItem) => i.id === media.item?.id) || media.item;

  const cycleVideoSpeed = useCallback(() => {
    updateMedia({ speed: media.speed >= 2 ? 0.5 : media.speed + 0.5 });
    if (videoPlayerRef.current) videoPlayerRef.current.playbackRate = media.speed >= 2 ? 0.5 : media.speed + 0.5;
  }, [media.speed, updateMedia]);

  if (!media.item) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, backdropFilter: "blur(0px)" }} animate={{ opacity: 1, backdropFilter: "blur(24px)" }} exit={{ opacity: 0, backdropFilter: "blur(0px)" }} transition={{ duration: 0.3 }}
        className={`fixed inset-0 z-100 flex ${media.isScrollMode ? 'items-start overflow-y-auto custom-scrollbar pt-24' : 'items-center justify-center overflow-hidden'} bg-black/95 p-4 md:p-8`}
        onClick={closeMediaViewer}
      >
        <div className="fixed top-8 right-8 flex items-center gap-3 z-110" onClick={e => e.stopPropagation()}>

           {currentItem.type === 'video' && (
             <div className="flex items-center bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[2rem] p-1.5">
               <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={() => {
                  const t = videoPlayerRef.current?.currentTime || 0;
                  closeMediaViewer();
                  const newItem: BentoItem = {
                     id: `temp-${Date.now()}`, user_id: session.user.id, workspace_id: nav.workspace === 'team' ? teamWorkspaceId : undefined,
                     creator: profile.displayName, type: "note", title: `${currentItem?.title} - Notes`, 
                     content: `[${formatTimestamp(t)}] `, video_url: currentItem?.url,
                     sections: nav.categoryType === 'folder' ? [nav.category] : ["Inbox"],
                  };
                  setEditingNote(newItem);
               }} className="flex items-center gap-2 px-5 py-3 text-white/80 hover:text-emerald-400 hover:bg-emerald-500/20 rounded-full transition-all text-sm font-bold">
                 <Clock size={18} strokeWidth={2} /> Log Time
               </motion.button>
               <div className="w-px h-6 bg-white/20 mx-1" />
               <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={cycleVideoSpeed} className="flex items-center gap-2 px-5 py-3 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-all text-sm font-bold">
                 <FastForward size={18} strokeWidth={2} /> {media.speed}x
               </motion.button>
             </div>
           )}
           {currentItem.type === 'image' && (
             <div className="flex items-center bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[2rem] p-1.5">
               <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={() => updateMedia({ isScrollMode: !media.isScrollMode })} className={`p-3.5 rounded-full transition-all ${media.isScrollMode ? 'bg-white text-black shadow-md' : 'text-white/80 hover:text-white hover:bg-white/20'}`}>
                 {media.isScrollMode ? <Minimize2 size={20} strokeWidth={1.5} /> : <Maximize2 size={20} strokeWidth={1.5} />}
               </motion.button>
               {!media.isScrollMode && (
                 <>
                   <div className="w-px h-6 bg-white/20 mx-1" />
                   <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={() => updateMedia({ zoom: media.zoom + 0.75 })} className="p-3.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-all"><ZoomIn size={20} strokeWidth={1.5} /></motion.button>
                   <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={() => updateMedia({ zoom: Math.max(1, media.zoom - 0.75) })} className="p-3.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-all"><ZoomOut size={20} strokeWidth={1.5} /></motion.button>
                 </>
               )}
             </div>
           )}
           <div className="flex items-center bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[2rem] p-1.5">
             <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={() => downloadMedia(currentItem?.url || currentItem?.thumbnail_url || currentItem?.img || "", currentItem?.title || 'media')} className="p-3.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-all"><Download size={20} strokeWidth={1.5} /></motion.button>
             {(nav.workspace === 'personal' || teamRole === 'admin' || teamRole === 'editor' || currentItem.user_id === session?.user?.id) && (
                <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={() => { moveToTrash(currentItem.id); closeMediaViewer(); }} className="p-3.5 text-white/80 hover:text-red-400 hover:bg-red-500/20 rounded-full transition-all"><Trash2 size={20} strokeWidth={1.5} /></motion.button>
             )}
           </div>
           <motion.button whileHover={bounceHover} whileTap={bounceTap} className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 text-white rounded-full transition-all shadow-2xl ml-2" onClick={closeMediaViewer}><X size={22} strokeWidth={2} /></motion.button>
        </div>

        <div className="fixed bottom-8 left-8 z-110">
           <ReactionBar item={currentItem} currentUserId={session?.user?.id} onToggleReaction={toggleItemReaction} isDark={true} theme={theme} />
        </div>
        
        <div className={`flex w-full transition-all duration-300`}>
           <motion.div 
             layoutId={`media-${currentItem.id}`} 
             className={`relative ${media.isScrollMode ? 'w-full max-w-5xl mx-auto pb-32' : 'w-full h-full max-w-[90vw] flex items-center justify-center mx-auto'}`}
             onClick={(e) => e.stopPropagation()}
           >
             {currentItem.type === 'video' ? (
               <video ref={videoPlayerRef} src={currentItem.url || currentItem.thumbnail_url} controls autoPlay playsInline className="max-w-full max-h-[85vh] rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 object-contain bg-black" />
             ) : (
               <motion.img 
                 drag={media.zoom > 1 && !media.isScrollMode} 
                 dragConstraints={media.zoom > 1 ? { top: -500 * media.zoom, bottom: 500 * media.zoom, left: -500 * media.zoom, right: 500 * media.zoom } : undefined} 
                 dragElastic={0.2} dragMomentum={true}
                 animate={{ scale: media.zoom }} 
                 transition={{ type: "spring", stiffness: 300, damping: 25 }}
                 src={currentItem.thumbnail_url || currentItem.img} alt={currentItem.title || "Media"} 
                 className={`rounded-[3rem] shadow-[0_0_120px_rgba(0,0,0,0.8)] border border-white/10 ${media.isScrollMode ? 'w-full h-auto object-cover' : 'max-w-full max-h-[85vh] object-contain'} ${media.zoom > 1 && !media.isScrollMode ? 'cursor-grab active:cursor-grabbing' : ''}`} 
               />
             )}
           </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function NoteEditorModal({ editingNote, updateLocalNoteState, handleCloseAndSave, moveToTrash, ui, updateUi, theme, isDark, teamMembers, mentionQuery, setMentionQuery, nav, session, teamRole, showToast, toggleItemReaction, items, profile }: any) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const optionsMenuRef = useRef<HTMLDivElement>(null);

  const currentItem = useMemo(() => {
     if (editingNote && !String(editingNote.id).startsWith('temp-')) {
         return items.find((i: BentoItem) => i.id === editingNote.id) || editingNote;
     }
     return editingNote;
  }, [items, editingNote]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
         setIsOptionsMenuOpen(false);
      }
    }
    if (isOptionsMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOptionsMenuOpen]);

  const applyFormatting = (prefix: string, suffix: string = prefix) => {
    if (!textareaRef.current || !editingNote) return;
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
          className="fixed inset-0 z-80 flex flex-col items-center justify-end bg-black/40 backdrop-blur-md"
          onMouseDown={handleCloseAndSave}
        >
          {/* iOS-Style Sliding Sheet */}
          <motion.div 
            initial={{ y: "100%", opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: "100%", opacity: 0 }} 
            transition={sheetSpring}
            onMouseDown={(e) => e.stopPropagation()} 
            className={`relative w-full max-w-6xl h-[95vh] flex flex-col rounded-t-[3rem] shadow-[0_-20px_60px_rgba(0,0,0,0.2)] overflow-hidden border-t border-l border-r ${isDark ? 'border-white/10 bg-[#09090b]' : 'border-zinc-200 bg-[#f4f4f5]'} pt-2`}
          >
            {/* Sheet Handle */}
            <div className="w-16 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mb-4 shrink-0" />

            <div className={`flex justify-between items-center px-10 pb-6 shrink-0 border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
              <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={handleCloseAndSave} className={`flex items-center gap-2 text-sm font-bold ${theme.textMuted} hover:${theme.text} transition-colors`}>
                 <ChevronLeft size={18} /> Back to Dashboard
              </motion.button>
              
              <div className="flex items-center gap-3">
                <div className="relative" ref={optionsMenuRef}>
                  <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={() => setIsOptionsMenuOpen(!isOptionsMenuOpen)} className={`p-3 rounded-full transition-all border shadow-sm ${theme.card} hover:opacity-80`}>
                    <MoreHorizontal size={20} strokeWidth={2} />
                  </motion.button>
                  <AnimatePresence>
                    {isOptionsMenuOpen && (
                      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className={`absolute right-0 top-full mt-3 w-64 z-50 p-4 rounded-[2rem] shadow-2xl border backdrop-blur-2xl ${isDark ? 'bg-zinc-800/95 border-zinc-700' : 'bg-white/95 border-zinc-200'}`}>
                         <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-3 px-2 ${theme.textMuted}`}>Note Options</h4>
                         <div className="space-y-3">
                           <div className="flex flex-col gap-1">
                             <label className={`text-[10px] font-bold px-2 ${theme.textMuted}`}>Folder</label>
                             <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-black/5 border-transparent'}`}>
                               <Folder size={14} className="text-teal-500" />
                               <input type="text" value={editingNote.section || editingNote.sections?.[0] || ""} onChange={(e) => updateLocalNoteState(editingNote.id, "section", e.target.value)} placeholder="Folder name..." className={`bg-transparent border-none outline-none w-full text-sm font-medium ${theme.text}`} />
                             </div>
                           </div>
                           <div className="flex flex-col gap-1">
                             <label className={`text-[10px] font-bold px-2 ${theme.textMuted}`}>List</label>
                             <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-black/5 border-transparent'}`}>
                               <ListIcon size={14} className="text-teal-500" />
                               <input type="text" value={editingNote.list_name || ""} onChange={(e) => updateLocalNoteState(editingNote.id, "list_name", e.target.value)} placeholder="List name..." className={`bg-transparent border-none outline-none w-full text-sm font-medium ${theme.text}`} />
                             </div>
                           </div>
                           <div className="flex flex-col gap-1">
                             <label className={`text-[10px] font-bold px-2 ${theme.textMuted}`}>Date</label>
                             <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-black/5 border-transparent'}`}>
                               <CalendarIcon size={14} className="text-teal-500" />
                               <input type="date" value={editingNote.scheduled_for ? new Date(editingNote.scheduled_for).toISOString().split('T')[0] : ""} onChange={(e) => updateLocalNoteState(editingNote.id, "scheduled_for", e.target.value ? new Date(e.target.value).toISOString() : null)} className={`bg-transparent border-none outline-none w-full text-sm font-medium ${theme.text}`} />
                             </div>
                           </div>
                           
                           <div className={`pt-3 mt-3 border-t space-y-1 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                             <button onClick={() => updateLocalNoteState(editingNote.id, "is_pinned", !editingNote.is_pinned)} className={`w-full flex items-center justify-between px-3 py-2 text-sm font-bold rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
                               <span className="flex items-center gap-2"><Pin size={16} className={editingNote.is_pinned ? "fill-current text-teal-500" : ""} /> {editingNote.is_pinned ? 'Unpin Note' : 'Pin Note'}</span>
                             </button>
                             {(nav.workspace === 'personal' || teamRole === 'admin' || teamRole === 'editor' || editingNote.user_id === session?.user?.id) && (
                               <button onClick={() => { moveToTrash(editingNote.id); handleCloseAndSave(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
                                 <Trash2 size={16} /> Move to Trash
                               </button>
                             )}
                           </div>
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={handleCloseAndSave} className={`px-8 py-3.5 rounded-full font-black transition-all text-sm flex items-center gap-2 shadow-lg ${theme.btnPrimary}`}>
                  <Save size={18} strokeWidth={2} /> Save
                </motion.button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
               <div className={`flex-1 flex flex-col w-full max-w-4xl mx-auto px-10 pt-16 pb-40 overflow-y-auto custom-scrollbar font-sans relative`}>

                 <input type="text" placeholder="Untitled Note" value={editingNote.title || ''} onChange={(e) => updateLocalNoteState(editingNote.id, "title", e.target.value)} className={`w-full text-4xl md:text-5xl font-black tracking-tight bg-transparent border-none outline-none mb-6 placeholder:opacity-20 leading-tight ${theme.text}`} autoFocus />

                 <div className="relative w-full flex-1 flex flex-col">
                    <AnimatePresence>
                       {mentionQuery.active && mentionQuery.target === 'note' && nav.workspace === 'team' && (
                          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`absolute z-50 top-0 left-0 mt-10 w-72 rounded-[2rem] shadow-2xl border p-3 backdrop-blur-xl ${isDark ? 'bg-zinc-800/95 border-zinc-700' : 'bg-white/95 border-zinc-200'}`}>
                             <p className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 mb-1 ${theme.textMuted}`}>Mention Team Member</p>
                             {teamMembers.filter((m: any) => m.name.toLowerCase().includes(mentionQuery.query.toLowerCase())).map((member: any) => (
                                <button key={member.id} onClick={() => insertNoteMention(cleanName(member.name))} className={`w-full flex items-center gap-4 px-4 py-3 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-black'}`}>
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
                                <motion.button whileTap={bounceTap} onClick={() => {
                                    const newItems = [...editingNote.checklist_items];
                                    newItems[index].checked = !newItems[index].checked;
                                    updateLocalNoteState(editingNote.id, "checklist_items", newItems);
                                }} className="shrink-0 transition-transform">
                                   {ci.checked ? <CheckSquare size={26} className="text-teal-500" /> : <Square size={26} className={theme.textMuted} />}
                                </motion.button>
                                <input 
                                   value={ci.text} 
                                   onChange={(e) => {
                                       const newItems = [...editingNote.checklist_items];
                                       newItems[index].text = e.target.value;
                                       updateLocalNoteState(editingNote.id, "checklist_items", newItems);
                                   }}
                                   className={`flex-1 bg-transparent border-none outline-none text-xl font-medium transition-all ${ci.checked ? 'line-through text-zinc-500 opacity-60' : theme.text}`}
                                   placeholder="To do..."
                                />
                                <button onClick={() => {
                                    const newItems = editingNote.checklist_items.filter((_: any, i: number) => i !== index);
                                    updateLocalNoteState(editingNote.id, "checklist_items", newItems);
                                }} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-500 transition-all p-2 rounded-full hover:bg-red-500/10"><X size={20} /></button>
                             </div>
                          ))}
                          <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={() => {
                              const newItems = [...(editingNote.checklist_items || []), { id: `ci-${Date.now()}`, text: "", checked: false }];
                              updateLocalNoteState(editingNote.id, "checklist_items", newItems);
                          }} className="flex items-center gap-2 text-base text-teal-500 font-bold mt-6 px-5 py-3 w-fit hover:bg-teal-500/10 rounded-full transition-colors"><Plus size={20}/> Add Item</motion.button>
                       </div>
                    ) : (
                       <textarea ref={textareaRef} placeholder="Start writing... Type @ to mention a team member." value={editingNote.content || ''} onChange={(e) => handleTextareaChange(e)} className={`flex-1 w-full text-xl md:text-2xl font-medium leading-relaxed bg-transparent border-none outline-none resize-none placeholder:opacity-30 custom-scrollbar py-2 ${theme.text}`} />
                    )}
                 </div>
               </div>

               {/* FLOATING ACTION BAR (Command Menu) */}
               <motion.div 
                 initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, ...modalSpring }}
                 className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-2 p-1.5 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.15)] border backdrop-blur-2xl z-50 ${isDark ? 'bg-[#18181b]/90 border-white/10' : 'bg-white/90 border-zinc-200'}`}
               >
                 <div className="flex items-center gap-1 px-2">
                    <button onClick={() => applyFormatting('**')} className={`p-2.5 rounded-full ${theme.btnGhost}`} title="Bold"><Bold size={16} strokeWidth={2}/></button>
                    <button onClick={() => applyFormatting('*')} className={`p-2.5 rounded-full ${theme.btnGhost}`} title="Italic"><Italic size={16} strokeWidth={2}/></button>
                    <button onClick={() => applyFormatting('~~')} className={`p-2.5 rounded-full ${theme.btnGhost}`} title="Strikethrough"><Strikethrough size={16} strokeWidth={2}/></button>
                    <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                    <button onClick={() => applyFormatting('# ', '')} className={`p-2.5 rounded-full ${theme.btnGhost}`} title="Heading"><Heading1 size={16} strokeWidth={2}/></button>
                    <button onClick={() => applyFormatting('- ', '')} className={`p-2.5 rounded-full ${theme.btnGhost}`} title="Bullet List"><ListIcon size={16} strokeWidth={2}/></button>
                    <button onClick={() => applyFormatting('> ', '')} className={`p-2.5 rounded-full ${theme.btnGhost}`} title="Quote"><Quote size={16} strokeWidth={2}/></button>
                    <button onClick={() => applyFormatting('`')} className={`p-2.5 rounded-full ${theme.btnGhost}`} title="Code"><Code size={16} strokeWidth={2}/></button>
                 </div>
                 <div className={`w-px h-6 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                 <div className="flex items-center gap-1 pr-2">
                    <button 
                       onClick={() => updateLocalNoteState(editingNote.id, "is_checklist", !editingNote.is_checklist)} 
                       className={`px-4 py-2.5 rounded-full transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${editingNote.is_checklist ? 'bg-teal-500 text-white' : theme.btnGhost}`}
                       title="Toggle Checklist"
                    >
                       <ListTodo size={16} strokeWidth={2} /> 
                       {editingNote.is_checklist ? 'Checklist' : 'List'}
                    </button>
                 </div>
               </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ReactionBar({ item, currentUserId, onToggleReaction, isDark, theme }: any) {
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
           <motion.button 
             whileHover={bounceHover} whileTap={bounceTap}
             key={emoji} 
             onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleReaction(item, emoji, currentUserId); }}
             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${hasReacted ? 'bg-teal-500/20 text-teal-600 border-teal-500/30 dark:text-teal-400 dark:border-teal-500/30' : (isDark ? 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10' : 'bg-black/5 text-zinc-600 border-black/5 hover:bg-black/10')}`}
           >
             <span>{emoji}</span>
             <span>{users.length}</span>
           </motion.button>
         )
      })}

      <div className="relative group/reaction">
        <motion.button whileHover={bounceHover} whileTap={bounceTap} className={`p-2 rounded-full transition-all border opacity-0 group-hover/card:opacity-100 ${hasReactions ? 'opacity-100' : ''} ${isDark ? 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200' : 'bg-black/5 border-black/5 text-zinc-500 hover:bg-black/10 hover:text-zinc-800'}`}>
           <Smile size={16} />
        </motion.button>
        {/* Invisible padding bridge to prevent hover menu glitch */}
        <div className="absolute bottom-[calc(100%+0.5rem)] left-0 hidden group-hover/reaction:flex flex-col z-50 after:content-[''] after:absolute after:top-full after:left-0 after:w-full after:h-4">
            <div className={`flex items-center gap-1 p-2 rounded-[2rem] shadow-xl border backdrop-blur-xl ${isDark ? 'bg-zinc-800/95 border-white/10' : 'bg-white/95 border-black/10'}`}>
               {reactionEmojis.map(e => (
                  <motion.button 
                    whileHover={bounceHover} whileTap={bounceTap}
                    key={e} 
                    onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); onToggleReaction(item, e, currentUserId); }}
                    className="w-10 h-10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors text-lg"
                  >
                    {e}
                  </motion.button>
               ))}
            </div>
        </div>
      </div>
    </div>
  )
}

function TeamChatDrawer({ 
  isChatOpen, closeChat, navWorkspace, isDark, theme, chatMessages, chatScrollRef, session, 
  mentionQuery, teamMembers, insertMention, chatInput, handleTextareaChange, handleSendChatMessage, chatInputRef 
}: any) {
  if (!isChatOpen || navWorkspace !== 'team') return null;

  return (
    <motion.div 
       initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} transition={modalSpring}
       className={`fixed top-0 right-0 h-full w-80 md:w-[400px] z-40 border-l shadow-2xl flex flex-col ${isDark ? 'bg-[#09090b]/95 border-white/10 backdrop-blur-3xl' : 'bg-white/95 border-black/10 backdrop-blur-3xl'}`}
    >
       <div className={`p-8 pb-5 border-b flex items-center justify-between ${isDark ? 'border-white/10' : 'border-black/5'}`}>
          <h2 className="text-2xl font-black flex items-center gap-3"><MessageSquare size={24} className="text-teal-500" strokeWidth={2} /> Team Chat</h2>
          <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={closeChat} className={`p-2.5 rounded-full transition-all ${theme.btnGhost}`}><X size={20} strokeWidth={1.5} /></motion.button>
       </div>
       
       <div ref={chatScrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-50 text-center">
                 <MessageSquare size={64} strokeWidth={1} className="mb-4 text-teal-500" />
                 <p className="text-base font-bold">No messages yet.</p>
                 <p className="text-sm mt-1">Start the conversation!</p>
              </div>
          ) : chatMessages.map((msg: any) => {
              const isMe = msg.user_id === session?.user?.id;
              return (
                 <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMe && <img src={msg.creator_avatar} loading="lazy" className="w-10 h-10 rounded-full object-cover shrink-0 mt-1" />}
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                       {!isMe && <span className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${theme.textMuted}`}>{cleanName(msg.creator_name)}</span>}
                       <div className={`px-5 py-3.5 rounded-[1.5rem] text-sm font-medium whitespace-pre-wrap leading-relaxed ${isMe ? 'bg-teal-600 text-white rounded-tr-sm shadow-md shadow-teal-900/20' : (isDark ? 'bg-white/10 text-white rounded-tl-sm' : 'bg-zinc-100 text-black rounded-tl-sm shadow-sm')}`}>
                          {renderChatText(msg.text, isDark)}
                       </div>
                       <span className="text-[10px] font-bold text-zinc-500 mt-1.5">{formatDistanceToNow(new Date(msg.created_at))} ago</span>
                    </div>
                 </div>
              )
          })}
       </div>

       <div className={`p-6 border-t relative ${isDark ? 'border-white/10' : 'border-black/5'}`}>
          <AnimatePresence>
            {mentionQuery.active && mentionQuery.target === 'chat' && (
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`absolute z-50 bottom-full left-6 mb-3 w-[calc(100%-3rem)] rounded-[2rem] shadow-2xl border p-3 backdrop-blur-xl ${isDark ? 'bg-zinc-800/95 border-zinc-700' : 'bg-white/95 border-zinc-200'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 mb-1 ${theme.textMuted}`}>Mention Team Member</p>
                  {teamMembers.filter((m: any) => m.name.toLowerCase().includes(mentionQuery.query.toLowerCase())).map((member: any) => (
                     <button key={member.id} onClick={() => insertMention(cleanName(member.name))} className={`w-full flex items-center gap-4 px-4 py-3 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-black'}`}>
                        <img src={member.avatar} loading="lazy" className="w-8 h-8 rounded-full object-cover" />
                        <span className="text-sm font-bold">{cleanName(member.name)}</span>
                     </button>
                  ))}
               </motion.div>
            )}
          </AnimatePresence>

          <div className="relative flex items-end">
             <textarea 
                ref={chatInputRef} value={chatInput} onChange={handleTextareaChange}
                onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChatMessage(); } }}
                placeholder="Type a message... use @ to mention."
                className={`w-full resize-none min-h-[60px] max-h-32 rounded-[2rem] pl-5 pr-14 py-4 text-sm font-medium outline-none transition-all custom-scrollbar shadow-sm border ${isDark ? 'bg-white/5 border-white/10 text-white focus:bg-white/10' : 'bg-white border-zinc-200 text-black focus:border-teal-500'}`}
             />
             <motion.button 
                whileHover={{ scale: 1.1 }} whileTap={bounceTap}
                onClick={handleSendChatMessage} disabled={!chatInput.trim()}
                className="absolute right-2 bottom-2 p-3 rounded-full bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 disabled:hover:bg-teal-600 transition-colors shadow-md"
             >
                <Send size={18} strokeWidth={2} />
             </motion.button>
          </div>
       </div>
    </motion.div>
  );
}

function ThemeToggle({ isDark, toggle }: { isDark: boolean, toggle: () => void }) {
  return (
    <motion.button
      onClick={toggle}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative p-3 flex items-center justify-center rounded-full overflow-hidden transition-all border shadow-sm ${isDark ? 'bg-white/5 border-white/5 text-teal-400' : 'bg-white border-zinc-200 text-teal-600'}`}
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

function IconButton({ icon, onClick, active, theme, title, hoverClass }: any) {
  return (
    <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={onClick} title={title} className={`p-3 rounded-full transition-colors ${active ? theme.btnPrimary : (hoverClass || theme.btnGhost)}`}>
      {icon}
    </motion.button>
  );
}

function SidebarItem({ icon, label, active, onClick, theme, isDark }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-3 rounded-[1.2rem] text-sm font-bold transition-all group ${active ? (isDark ? 'bg-white/5 border border-white/5 shadow-sm text-teal-400' : 'bg-white border border-zinc-200 shadow-sm text-teal-600') : `border border-transparent ${theme.btnGhost}`}`}>
      <div className="flex items-center gap-3.5">
        <div className={`transition-colors ${active ? 'text-inherit' : 'text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100'}`}>{icon}</div>
        <span className="truncate">{label}</span>
      </div>
    </button>
  );
}

function SidebarEditableItem({ icon, label, active, onClick, theme, isDark, canModify, onRename, onDelete, onMoveUp, onMoveDown }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
    }
    if (isMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  if (isEditing) {
    return (
      <div className={`flex items-center gap-2 px-4 py-3 rounded-[1.2rem] border shadow-sm ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}`}>
        <div className="text-teal-500">{icon}</div>
        <input
          autoFocus
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={() => { onRename(label, editValue); setIsEditing(false); }}
          onKeyDown={e => { if(e.key === 'Enter') e.currentTarget.blur(); if(e.key === 'Escape') setIsEditing(false); }}
          className={`bg-transparent outline-none w-full text-sm font-bold ${theme.text}`}
        />
      </div>
    )
  }

  return (
    <div className={`group relative w-full flex items-center justify-between px-4 py-3 rounded-[1.2rem] text-sm font-bold transition-all ${active ? (isDark ? 'bg-white/5 border border-white/5 shadow-sm text-teal-400' : 'bg-white border border-zinc-200 shadow-sm text-teal-600') : `border border-transparent ${theme.btnGhost}`}`}>
      <button onClick={onClick} className="flex-1 flex items-center gap-3.5 text-left overflow-hidden">
        <div className={`transition-colors ${active ? 'text-inherit' : 'text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100'}`}>{icon}</div>
        <span className="truncate">{label}</span>
      </button>
      
      {canModify && (
        <div className="relative" ref={menuRef}>
          <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-full transition-all ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
            <MoreHorizontal size={14} />
          </button>
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -5 }} 
                className={`absolute right-0 top-full mt-1 z-50 w-40 rounded-[1.5rem] shadow-xl border p-1.5 backdrop-blur-2xl ${isDark ? 'bg-zinc-800/95 border-zinc-700' : 'bg-white/95 border-zinc-200'}`}
              >
                 <button onClick={(e) => { e.stopPropagation(); onMoveUp(); setIsMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300 hover:text-white' : 'hover:bg-black/5 text-zinc-600 hover:text-black'}`}><ChevronUp size={14} strokeWidth={2}/> Move Up</button>
                 <button onClick={(e) => { e.stopPropagation(); onMoveDown(); setIsMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300 hover:text-white' : 'hover:bg-black/5 text-zinc-600 hover:text-black'}`}><ChevronDown size={14} strokeWidth={2}/> Move Down</button>
                 <div className={`w-full h-px my-1.5 ${isDark ? 'bg-white/10' : 'bg-black/5'}`} />
                 <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); setIsMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300 hover:text-white' : 'hover:bg-black/5 text-zinc-600 hover:text-black'}`}><Edit2 size={12} strokeWidth={2}/> Rename</button>
                 <button onClick={(e) => { e.stopPropagation(); onDelete(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl flex items-center gap-3 hover:bg-red-500/10 text-red-500 transition-colors"><Trash2 size={12} strokeWidth={2}/> Delete</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

const MemoizedMasonryCard = memo(function MemoizedMasonryCard({ item, theme, isDark, activeWorkspace, currentUserId, teamRole, viewMode, onClick, inTrash, onRestore, onHardDelete, onDelete, onUpdateSticky, toggleItemReaction, toggleChecklistItem }: any) {
  const isSocialVideo = item.url && (item.url.includes('instagram.com') || item.url.includes('youtube.com') || item.url.includes('youtu.be'));
  const itemType = isSocialVideo ? 'social_video' : (item.type || (item.url ? 'link' : 'note')); 
  const displayImg = item.img || item.thumbnail_url; 
  
  const [isEditingSticky, setIsEditingSticky] = useState(false);
  const [stickyText, setStickyText] = useState(item.ai_summary || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canModify = activeWorkspace === 'personal' || teamRole === 'admin' || teamRole === 'editor' || item.user_id === currentUserId;

  const handleStickyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
     setStickyText(e.target.value);
     e.target.style.height = 'auto';
     e.target.style.height = `${e.target.scrollHeight}px`;
  };

  useEffect(() => {
    if (isEditingSticky && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditingSticky]);

  const handleStickyBlur = () => {
     setIsEditingSticky(false);
     if (stickyText !== item.ai_summary && onUpdateSticky) {
        onUpdateSticky(item.id, stickyText);
     }
  };

  const formatNotePreview = (text: string) => {
     if (!text) return null;
     const parts = text.split(/(\*\*.*?\*\*)/g);
     return parts.map((part, i) => {
         if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className={isDark ? 'text-white' : 'text-black'}>{part.slice(2, -2)}</strong>;
         if (part.startsWith('# ')) return <span key={i} className={`block font-black text-xl mb-1 ${isDark ? 'text-white' : 'text-black'}`}>{part.slice(2)}</span>;
         if (part.startsWith('- [ ] ')) return <span key={i} className="block flex items-center gap-1.5 opacity-80"><Circle size={10} strokeWidth={2}/> {part.slice(6)}</span>;
         return part;
     });
  };

  return (
    <motion.div whileHover={{ y: -4 }} onClick={onClick} className={`group/card relative rounded-3xl transition-all duration-500 flex flex-col w-full border ${theme.card} ${theme.cardHover} ${itemType === 'note' && !inTrash ? 'cursor-text' : inTrash ? 'cursor-default' : 'cursor-pointer'} font-sans overflow-hidden ${viewMode === 'card' ? 'h-[340px]' : 'h-full'}`}>
      {inTrash ? (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-40 flex flex-col items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity gap-4 rounded-3xl">
          <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={(e) => { e.stopPropagation(); onRestore(item.id); }} className="bg-white text-black px-6 py-3 rounded-full text-sm font-bold flex items-center gap-2 shadow-xl"><RotateCcw size={16} strokeWidth={1.5}/> Restore</motion.button>
          <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={(e) => { e.stopPropagation(); onHardDelete(item.id); }} className="bg-red-50 text-red-600 px-6 py-3 rounded-full text-sm font-bold flex items-center gap-2 shadow-xl"><Trash2 size={16} strokeWidth={1.5}/> Delete</motion.button>
        </div>
      ) : canModify && (
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(item.id); }} className={`absolute top-4 left-4 z-40 p-2.5 rounded-full opacity-0 group-hover/card:opacity-100 transition-all border text-red-500 hover:bg-red-500 hover:text-white shadow-sm backdrop-blur-xl ${isDark ? 'bg-black/90 border-red-500/20' : 'bg-white/90 border-red-200'}`} title="Move to Trash">
          <Trash2 size={16} strokeWidth={1.5} />
        </button>
      )}

      {itemType === "image" || itemType === "video" || itemType === "audio" || itemType === "document" ? (
        <div className={`w-full relative font-sans flex-1 flex flex-col justify-between ${isDark ? 'bg-[#121214]' : 'bg-zinc-100'} ${viewMode === 'card' ? 'h-full' : 'h-auto'}`}>
          {itemType === "video" && !item.url ? ( 
            <video src={displayImg} muted autoPlay loop playsInline className={`w-full object-cover transition-transform duration-700 group-hover/card:scale-105 pointer-events-none ${viewMode === 'card' ? 'h-full' : 'h-auto'}`} />
          ) : displayImg ? (
            <img src={displayImg} loading="lazy" alt={item.title || "Media"} className={`w-full object-cover transition-transform duration-700 group-hover/card:scale-105 ${viewMode === 'card' ? 'h-full' : 'h-auto'}`} />
          ) : (
            <div className={`w-full flex items-center justify-center ${itemType === 'audio' || itemType === 'document' ? 'h-24' : 'h-40'}`}>
               {itemType === 'audio' ? <Music size={32} strokeWidth={1.5} className="text-fuchsia-500 opacity-60" /> :
                itemType === 'document' ? <FileIcon size={32} strokeWidth={1.5} className="text-blue-500 opacity-60" /> :
                <ImageIcon size={32} strokeWidth={1} className="text-zinc-500 opacity-30" />}
            </div>
          )}

          {itemType === 'audio' && item.url && (
              <div onClick={e => e.stopPropagation()} className="w-full px-6 pb-4 z-20 pointer-events-auto">
                 <audio controls src={item.url} className="w-full h-10" />
              </div>
          )}
          
          {!inTrash && (
            <motion.div layoutId={itemType !== 'note' ? `media-${item.id}` : undefined} className={`absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-10 pointer-events-none ${itemType === 'audio' ? 'pb-20' : ''}`}>
               {item.title ? (
                 <>
                   <h3 className="text-white text-base font-bold tracking-tight drop-shadow-md leading-normal truncate w-[85%]">{item.title}</h3>
                   {item.content && <p className="text-white/80 text-xs truncate w-[85%]">{item.content}</p>}
                   
                   {activeWorkspace === 'team' && (
                      <div className="mt-2 pointer-events-auto">
                        <ReactionBar item={item} currentUserId={currentUserId} onToggleReaction={toggleItemReaction} isDark={true} theme={theme} />
                      </div>
                   )}

                   {activeWorkspace === 'team' && item.creator && (
                     <p className="text-white/70 text-[10px] mt-3 flex items-center gap-1.5 font-bold uppercase tracking-widest">
                       <img src={item.creator_avatar || `https://api.dicebear.com/9.x/shapes/svg?seed=${item.creator}`} loading="lazy" className="w-4 h-4 rounded-full bg-white/20 shadow-sm" />
                       {cleanName(item.creator)}
                     </p>
                   )}
                 </>
               ) : (
                 <>
                   <div className="self-center mb-auto mt-auto bg-white/20 p-4 rounded-full text-white shadow-2xl backdrop-blur-xl">
                      {itemType === 'audio' ? <Music size={20} strokeWidth={1.5} className="ml-0.5" /> :
                       itemType === 'document' ? <FileIcon size={20} strokeWidth={1.5} className="ml-0.5" /> : 
                       <Play size={20} strokeWidth={1.5} className="fill-current ml-0.5" />}
                   </div>
                   {activeWorkspace === 'team' && (
                      <div className="mt-auto pointer-events-auto">
                        <ReactionBar item={item} currentUserId={currentUserId} onToggleReaction={toggleItemReaction} isDark={true} theme={theme} />
                      </div>
                   )}
                 </>
               )}
            </motion.div>
          )}
        </div>
        
      ) : (itemType === "link" || itemType === "social_video") ? (
        <div className="flex flex-col h-full justify-between font-sans relative">
          {displayImg && (
            <div className={`w-full relative shrink-0 border-b ${isDark ? 'border-zinc-800/50' : 'border-zinc-200'} ${viewMode === 'card' ? 'h-40' : (itemType === 'social_video' ? 'aspect-[4/5]' : 'h-40')}`}>
              <div className="absolute inset-0 overflow-hidden">
                 <img src={displayImg} loading="lazy" className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-700" />
              </div>
              
              {itemType === 'social_video' && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="bg-black/30 backdrop-blur-xl p-4 rounded-full text-white shadow-2xl border border-white/20">
                       <Play size={24} strokeWidth={1.5} className="fill-current ml-1" />
                    </div>
                 </div>
              )}

              {!inTrash && itemType === 'social_video' && (
                <div 
                  onClick={(e) => { 
                     e.preventDefault(); 
                     e.stopPropagation(); 
                     if(canModify) setIsEditingSticky(true); 
                  }}
                  className={`absolute top-3 right-3 z-30 w-28 min-h-[4rem] rotate-[4deg] bg-[#ef4444] text-white p-2.5 shadow-[4px_8px_20px_rgba(0,0,0,0.3)] font-sans font-bold text-[11px] leading-tight ${canModify ? 'cursor-text hover:scale-105 hover:rotate-0' : 'cursor-default'} transition-all rounded-lg pointer-events-auto border border-red-400`}
                >
                    {isEditingSticky ? (
                        <textarea 
                           ref={textareaRef} autoFocus value={stickyText} onChange={handleStickyChange} onBlur={handleStickyBlur}
                           className="w-full bg-transparent text-white outline-none resize-none placeholder:text-white/70 overflow-hidden"
                           placeholder="Add note..." style={{ minHeight: '40px' }}
                        />
                    ) : (
                        <div className="whitespace-pre-wrap break-words">{stickyText || "Add note..."}</div>
                    )}
                </div>
              )}
            </div>
          )}
          <div className={`p-5 flex flex-col flex-1 justify-between relative z-10 ${viewMode === 'card' ? 'overflow-hidden' : ''}`}>
             {!displayImg && <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-5 border shadow-sm shrink-0 ${isDark ? 'bg-[#121214] border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}><Globe size={20} strokeWidth={1.5} className="text-teal-500" /></div>}
            <div className="z-10 mt-auto w-full">
              <h3 className={`font-bold text-base mb-1.5 tracking-tight leading-snug line-clamp-2 ${theme.text}`}>{item.title || "Untitled Link"}</h3>
              {itemType === 'social_video' ? (
                 <p className={`text-xs flex items-center gap-1.5 truncate font-bold uppercase tracking-widest ${theme.textMuted}`}>{item.list_name || (item.url?.includes('instagram') ? 'Reels ideas' : 'YouTube ideas')}</p>
              ) : (
                 <p className={`text-xs flex items-center gap-1.5 truncate font-medium ${theme.textMuted}`}>{item.url}</p>
              )}

              {activeWorkspace === 'team' && !inTrash && (
                 <div className="mt-3 w-full">
                    <ReactionBar item={item} currentUserId={currentUserId} onToggleReaction={toggleItemReaction} isDark={isDark} theme={theme} />
                 </div>
              )}

              {activeWorkspace === 'team' && item.creator && (itemType === 'link' || itemType === 'social_video') && (
                 <p className={`text-[10px] flex items-center gap-1.5 truncate font-bold uppercase tracking-widest mt-3 pt-3 border-t ${isDark ? 'border-white/5 text-zinc-400' : 'border-zinc-200 text-zinc-500'}`}>
                    <img src={item.creator_avatar || `https://api.dicebear.com/9.x/shapes/svg?seed=${item.creator}`} loading="lazy" className="w-4 h-4 rounded-full shrink-0" />
                    Added by {cleanName(item.creator)}
                 </p>
              )}
            </div>
          </div>
        </div>

      ) : (
        <div className={`p-6 flex flex-col relative ${viewMode === 'card' ? 'h-full' : 'h-full min-h-[14rem]'}`}>
          {item.video_url && <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-full text-[10px] font-bold uppercase tracking-widest self-start shrink-0"><Clock size={12}/> Timestamp Note</div>}
          {item.title && <h3 className={`font-black text-xl mb-3 tracking-tighter leading-snug pb-1 w-[85%] shrink-0 ${theme.text}`}>{item.title}</h3>}
          
          <div className={`text-sm font-medium leading-relaxed whitespace-pre-wrap flex-1 pb-4 overflow-hidden ${viewMode === 'card' ? 'line-clamp-4' : ''} ${theme.textMuted}`}>
             {item.is_checklist && item.checklist_items ? (
                 <div className="flex flex-col gap-2 mt-2 text-sm z-20 pointer-events-auto">
                     {item.checklist_items.slice(0, viewMode === 'card' ? 4 : undefined).map((ci: any) => (
                        <div key={ci.id} className="flex items-start gap-2" onClick={e => e.stopPropagation()}>
                            <motion.button whileTap={bounceTap} onClick={() => toggleChecklistItem(item, ci.id)} className="mt-0.5 shrink-0 transition-transform">
                               {ci.checked ? <CheckSquare size={16} className="text-teal-500" /> : <Square size={16} className={theme.textMuted} />}
                            </motion.button>
                            <span className={`${ci.checked ? 'line-through opacity-50' : ''}`}>{ci.text}</span>
                        </div>
                     ))}
                     {viewMode === 'card' && item.checklist_items.length > 4 && <span className="text-xs font-bold mt-1 opacity-50">+{item.checklist_items.length - 4} more items</span>}
                 </div>
             ) : (
                 formatNotePreview(item.content || item.description)
             )}
          </div>
          
          {item.tags && item.tags.length > 0 && (
             <div className="flex flex-wrap gap-2 mt-2 mb-2 relative z-10 shrink-0">
                {item.tags.map((t: string) => <span key={t} className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${isDark ? 'bg-white/10 text-white/70' : 'bg-black/5 text-black/60'}`}>#{t}</span>)}
             </div>
          )}
          <div className={`absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t ${isDark ? 'from-[#09090b]' : 'from-white'} to-transparent pointer-events-none rounded-b-3xl`} />
          
          <div className="mt-auto pt-4 relative z-10 shrink-0 w-full">
            {activeWorkspace === 'team' && !inTrash && (
               <div className="mb-3">
                  <ReactionBar item={item} currentUserId={currentUserId} onToggleReaction={toggleItemReaction} isDark={isDark} theme={theme} />
               </div>
            )}
            {activeWorkspace === 'team' && item.creator && (
              <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${theme.textMuted}`}>
                 <img src={item.creator_avatar || `https://api.dicebear.com/9.x/shapes/svg?seed=${item.creator}`} loading="lazy" className="w-4 h-4 rounded-full shadow-sm shrink-0" />
                 {cleanName(item.creator)}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
});