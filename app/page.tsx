"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Inter } from 'next/font/google';
import { Toaster, toast as sonnerToast } from 'sonner';
import { Command } from 'cmdk';
import { supabase } from '@/lib/supabase'; 
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths, formatDistanceToNow } from 'date-fns';

// --- ICONS ---
import { 
  Search, Plus, ImageIcon, Moon, Sun, Trash2, Trash, Loader2, 
  Pin, Sparkles, LayoutGrid, Folder, RefreshCw, Play, Settings, 
  FileText, Globe, Compass, ChevronRight, UploadCloud, 
  List as ListIcon, Calendar as CalendarIcon, ChevronLeft, ChevronRight as ChevronRightIcon, 
  Users, CheckCircle, MessageSquare, AlignJustify, ShieldAlert, Monitor, CheckSquare, Columns,
  Bell, Circle, File as FileIcon, Music, RotateCcw, X, Home, Hash, Check, Wand2
} from "lucide-react";

// --- TYPES & STORE ---
import { BentoItem } from "@/app/types";
import { useAppStore } from "@/store/useAppStore";

// --- HOOKS & UTILS ---
import { useDebounce } from "@/hooks/useDebounce";
import { useBrainboardData } from "@/hooks/useBrainboardData";
import { useTeamSpace } from "@/hooks/useTeamSpace";
import { modalSpring, bounceHover, bounceTap, staggerVariants, cardVariants, cleanName } from "@/lib/utils";

// --- COMPONENTS ---
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SidebarItem } from "@/components/layout/SidebarItem";
import { SidebarEditableItem } from "@/components/layout/SidebarEditableItem";
import { LogoutConfirmModal } from "@/components/modals/LogoutConfirmModal";
import { OnboardingModal } from "@/components/modals/OnboardingModal";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { MediaViewerModal } from "@/components/modals/MediaViewerModal";
import { NoteEditorModal } from "@/components/modals/NoteEditorModal";
import { TeamChatDrawer } from "@/components/chat/TeamChatDrawer";
import { MemoizedMasonryCard } from "@/components/board/MemoizedMasonryCard";

const inter = Inter({ subsets: ['latin'] });

export default function BrainboardBalanced() {
  const [session, setSession] = useState<any>(null);
  const [teamWorkspaceId] = useState<string>('11111111-1111-1111-1111-111111111111'); 

  const { ui, nav, profile, sidebar, media, updateUi, updateNav, updateProfile, updateSidebar, updateMedia } = useAppStore();

  const closeMediaViewer = useCallback(() => {
    updateMedia({ item: null, isScrollMode: false, zoom: 1, speed: 1 });
  }, [updateMedia]);

  const [mentionQuery, setMentionQuery] = useState<{ active: boolean, query: string, target: 'note' | 'chat' }>({ active: false, query: '', target: 'note' });
  const [chatInput, setChatInput] = useState("");
  
  const [folderOrder, setFolderOrder] = useState<string[]>([]);
  const [listOrder, setListOrder] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  
  const [isDark, setIsDark] = useState<boolean>(false); 
  const [editingNote, setEditingNote] = useState<BentoItem | null>(null);
  const [cmdKOpen, setCmdKOpen] = useState(false);
  const [playingYouTubeId, setPlayingYouTubeId] = useState<string | null>(null);
  
  const [selectedItems, setSelectedItems] = useState<Set<string | number>>(new Set());
  const [lastSelected, setLastSelected] = useState<string | number | null>(null);
  const isSelectMode = selectedItems.size > 0;

  useEffect(() => {
     setSelectedItems(new Set());
     setLastSelected(null);
  }, [nav.category, nav.categoryType, nav.workspace, nav.viewMode]);

  const [toast, setToast] = useState<{ message: string; visible: boolean, error?: boolean }>({ message: "", visible: false });
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, isError: boolean = false) => {
    setToast({ message, visible: true, error: isError });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
    if (isError) sonnerToast.error(message); else sonnerToast.success(message);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const {
    items, setItems, customFolders, setCustomFolders, customLists, setCustomLists,
    isLoading, page, setPage, hasMore, fetchItems, saveNote, insertItem, updateItemTags, moveItemToFolder, moveItemToList, updateStickyNote, toggleItemReaction, toggleChecklistItem,
    moveToTrash, restoreFromTrash, hardDelete, emptyTrash, renameFolder, deleteFolder, renameList, deleteList,
    bulkMoveToFolder, bulkMoveToList, bulkMoveToTrash, bulkRestoreFromTrash, bulkHardDelete
  } = useBrainboardData(session, teamWorkspaceId, nav.workspace, profile.displayName, showToast, updateUi);

  const {
    teamMembers, notifications, chatMessages, setChatMessages, teamRole,
    fetchProfilesAndRole, handleUpdateMemberRole, handleMarkAsRead, handleMarkAllAsRead
  } = useTeamSpace(session, teamWorkspaceId, ui.isChatOpen, nav.workspace, showToast, setItems, updateUi, chatScrollRef);

  const activeStateRef = useRef({ category: nav.category, type: nav.categoryType, folders: customFolders, workspace: nav.workspace, userName: profile.displayName, role: teamRole });
  useEffect(() => {
    activeStateRef.current = { category: nav.category, type: nav.categoryType, folders: customFolders, workspace: nav.workspace, userName: profile.displayName, role: teamRole };
  }, [nav.category, nav.categoryType, customFolders, nav.workspace, profile.displayName, teamRole]);

  useEffect(() => {
     const down = (e: KeyboardEvent) => {
        if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
           e.preventDefault();
           setCmdKOpen((open) => !open);
        }
        if (e.key === 'Escape' && selectedItems.size > 0) {
            e.preventDefault();
            setSelectedItems(new Set());
            setLastSelected(null);
        }
        if ((e.key === 'Backspace' || e.key === 'Delete') && selectedItems.size > 0 && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) && !(e.target as HTMLElement).isContentEditable) {
            e.preventDefault();
            bulkMoveToTrash(Array.from(selectedItems));
            setSelectedItems(new Set());
            setLastSelected(null);
        }
     };
     document.addEventListener('keydown', down);
     return () => document.removeEventListener('keydown', down);
  }, [selectedItems, bulkMoveToTrash]);

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

  const smartTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach(item => {
       if (item.tags && !item.is_deleted && (!item.workspace_id === (nav.workspace === 'personal'))) {
          item.tags.forEach(t => tags.add(t));
       }
    });
    return Array.from(tags).sort();
  }, [items, nav.workspace]);

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    if (typeof window !== 'undefined') localStorage.setItem('brainboard-theme', nextTheme ? 'dark' : 'light');
  };

  const theme = {
    bg: isDark ? "bg-[#09090b]" : "bg-[#FAF8F5]", 
    text: isDark ? "text-zinc-100" : "text-[#2D2A26]", 
    textMuted: isDark ? "text-zinc-400" : "text-[#8A8178]", 
    sidebar: isDark ? "bg-[#09090b]/90 backdrop-blur-2xl border-white/[0.06]" : "bg-[#FAF8F5]/90 backdrop-blur-2xl border-[#E8E6E1] shadow-sm",
    card: isDark ? "bg-white/[0.03] border-white/[0.08] shadow-md" : "bg-[#FFFFFF] border-[#E8E6E1] shadow-sm",
    cardHover: isDark ? "hover:bg-white/[0.05] hover:border-white/[0.15] hover:shadow-lg hover:shadow-black/50" : "hover:border-[#D6D0C4] hover:shadow-md transition-shadow",
    input: isDark ? "bg-white/5 border-white/10 text-white focus:border-teal-500 focus:bg-white/10" : "bg-white border-[#E8E6E1] text-[#2D2A26] focus:border-teal-500 focus:shadow-sm",
    btnPrimary: "bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-900/20 active:scale-95 transition-all", 
    btnGhost: isDark ? "hover:bg-white/10 text-zinc-400 hover:text-zinc-100 active:scale-95 transition-all" : "hover:bg-[#F0EEE9] text-[#6B6863] hover:text-[#2D2A26] active:scale-95 transition-all"
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
        const uChanged = user.user_metadata?.username_changed || false;
        
        updateProfile({ displayName: dName, username: uName, usernameChanged: uChanged });
        
        try { 
            await supabase.from('profiles').upsert({ 
                id: user.id, display_name: dName, username: uName, 
                avatar_url: user.user_metadata?.avatar_url || `https://api.dicebear.com/9.x/shapes/svg?seed=${user.email}`,
                updated_at: new Date().toISOString() 
            }, { onConflict: 'id' }); 
        } catch(e) { console.error(e); }

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
            username: session.user.user_metadata?.username || "",
            usernameChanged: session.user.user_metadata?.username_changed || false
        });
        fetchProfilesAndRole(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchProfilesAndRole, updateProfile, updateUi, setItems]);

  useEffect(() => { 
     if (session?.user?.id && !ui.showOnboarding) {
         fetchItems(1, false); 
     }
  }, [session?.user?.id, ui.showOnboarding, fetchItems]);

  const handleUpdateProfile = async () => {
    if (!session?.user) return;
    updateProfile({ isSaving: true, error: "" });

    const cleanUsername = profile.username.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '');

    if (!cleanUsername || !profile.displayName.trim()) {
       updateProfile({ error: "Name and Username are required.", isSaving: false });
       return;
    }

    const isUsernameDifferent = cleanUsername !== session.user.user_metadata?.username;
    if (isUsernameDifferent && session.user.user_metadata?.username_changed) {
       updateProfile({ error: "Username can only be changed once.", isSaving: false });
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

    let updateData: any = { display_name: profile.displayName, username: cleanUsername };
    if (isUsernameDifferent && session.user.user_metadata?.username) {
        updateData.username_changed = true;
    }

    const { data, error } = await supabase.auth.updateUser({ data: updateData });
    if (!error && data.user) { 
      setSession({ ...session, user: data.user }); 
      updateProfile({ username: cleanUsername, usernameChanged: updateData.username_changed || profile.usernameChanged }); 
    } 
    
    try { 
        await supabase.from('profiles').upsert({ 
           id: session.user.id, display_name: profile.displayName, username: cleanUsername, bio: profile.bio, updated_at: new Date().toISOString() 
        }); 
        
        if (ui.showOnboarding) {
            await supabase.from('workspace_members').upsert({ 
                workspace_id: teamWorkspaceId, user_id: session.user.id, role: 'editor' 
            }, { onConflict: 'workspace_id, user_id' });
        }
        showToast(ui.showOnboarding ? "Welcome to Brainboard!" : "Profile updated successfully!"); 
        updateUi({ showOnboarding: false });
    } catch(e) {
        showToast("Failed to sync profile.", true); 
        console.error(e);
    }
    
    updateProfile({ isSaving: false });
    fetchProfilesAndRole(session.user);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) return;
    updateUi({ isUploading: true });
    const fileName = `avatar-${session.user.id}-${Date.now()}.${file.name.split('.').pop()}`;
    try {
       await supabase.storage.from('media').upload(fileName, file);
       const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
       await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
       await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);
       setSession({ ...session, user: { ...session.user, user_metadata: { ...session.user.user_metadata, avatar_url: publicUrl } } });
       fetchProfilesAndRole(session.user);
       showToast("Profile picture updated!");
    } catch (err) {
       showToast("Failed to upload avatar", true);
    }
    updateUi({ isUploading: false });
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

  const handleClearChat = async () => {
    if (teamRole !== 'admin') return;
    if (!window.confirm("Are you sure you want to completely clear the team chat?")) return;
    setChatMessages([]);
    await supabase.from('team_messages').delete().eq('workspace_id', teamWorkspaceId);
    showToast("Team chat cleared.");
  };

  const canModifyStructure = nav.workspace === 'personal' || teamRole === 'admin' || teamRole === 'editor';
  const canCreate = nav.workspace === 'personal' || teamRole === 'admin' || teamRole === 'editor';

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
            const { error: storageError } = await supabase.storage.from('media').upload(fileName, file);
            if (storageError) throw storageError;

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

  const handleDragOver = (e: React.DragEvent) => { 
    e.preventDefault(); 
    e.stopPropagation(); 
    if (e.dataTransfer.types.includes('Files')) {
       updateUi({ isDragging: true }); 
    }
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!mainContentRef.current?.contains(e.relatedTarget as Node)) updateUi({ isDragging: false });
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    updateUi({ isDragging: false });
    if (e.dataTransfer.types.includes('Files') && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
       processAndUploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      const text = e.clipboardData?.getData('text');
      if (!text || !session?.user?.id) return;

      const { category, type: catType, folders, workspace, userName, role } = activeStateRef.current;
      if (workspace === 'team' && role === 'viewer') return; 

      const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
      const isYouTubeMatch = text.match(ytRegex);
      const isYouTube = !!isYouTubeMatch;
      const youtubeId = isYouTubeMatch ? isYouTubeMatch[1] : null;

      const isReel = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:reel|p|tv)\/([^\/\?#]+)/i.test(text);
      const isLink = text.startsWith('http://') || text.startsWith('https://');
      
      if (isReel || isYouTube || isLink) {
         e.preventDefault();
         updateUi({ isAILoading: true });
         showToast(isReel ? "Capturing Reel..." : isYouTube ? "Capturing YouTube..." : "Capturing link...");
         
         const tempId = `temp-${Date.now()}`;
         let newItem: BentoItem = {
             id: tempId, user_id: session.user.id, workspace_id: workspace === 'team' ? teamWorkspaceId : undefined,
             creator: userName, type: isYouTube || isReel ? 'social_video' : 'link', url: text, title: isReel ? "Fetching Reel..." : isYouTube ? "Fetching YouTube..." : "Fetching Link...",
             ai_summary: undefined, 
             sections: catType === 'folder' ? [category, isReel ? 'Instagram' : isYouTube ? 'YouTube' : 'Links'] : ['Inbox', isReel ? 'Instagram' : isYouTube ? 'YouTube' : 'Links'],
             list_name: catType === 'list' ? category : undefined, created_at: new Date().toISOString() 
         };

         setItems(prev => [newItem, ...prev]);

         if (isReel && !folders.includes('Instagram')) setCustomFolders(p => [...new Set([...p, 'Instagram'])]);
         if (isYouTube && !folders.includes('YouTube')) setCustomFolders(p => [...new Set([...p, 'YouTube'])]);

         try {
             let fetchedTitle = isYouTube ? "YouTube Video" : (isReel ? "@creator" : "Saved Link");
             let fetchedDescription = null;
             let fetchedThumbnail = "https://images.unsplash.com/photo-1616469829581-73993eb86b02?auto=format&fit=crop&w=800&q=80";

             if (isYouTube && youtubeId) {
                 try {
                     const ytRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(text)}`);
                     if (ytRes.ok) {
                         const ytData = await ytRes.json();
                         fetchedTitle = ytData.title || "YouTube Video";
                         fetchedDescription = ytData.author_name || null; 
                         fetchedThumbnail = ytData.thumbnail_url || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
                     } else {
                         fetchedThumbnail = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
                     }
                 } catch (ytErr) {
                     fetchedThumbnail = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
                 }
             } else {
                 const res = await fetch(`/api/microlink?url=${encodeURIComponent(text)}`);
                 const data = await res.json();
                 const info = data.data || data; 
                 
                 fetchedTitle = info.title || fetchedTitle;
                 fetchedDescription = info.description || null;
                 fetchedThumbnail = info.image_url || info.image?.url || info.logo?.url || fetchedThumbnail;
             }

             const dbPayload: any = {
                 user_id: session.user.id, workspace_id: workspace === 'team' ? teamWorkspaceId : null, creator: userName,
                 type: isYouTube || isReel ? 'social_video' : 'link', url: text, 
                 title: fetchedTitle,
                 content: fetchedDescription, 
                 thumbnail_url: fetchedThumbnail,
                 sections: newItem.sections, list_name: newItem.list_name || null
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
                 creator: userName, type: isYouTube || isReel ? 'social_video' : 'link', url: text, title: "Saved Link", sections: newItem.sections,
                 thumbnail_url: isYouTube && youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : null
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
      else if (nav.categoryType === 'tag') result = result.filter(item => item.tags?.includes(nav.category));
      else if ((nav.categoryType as any) === 'hashtags') result = result.filter(item => item.tags && item.tags.length > 0);
      else if (nav.categoryType === 'type') {
          if (nav.category === "media") result = result.filter(item => item.type === "image" || item.type === "video");
          else if (nav.category === "notes") result = result.filter(item => item.type === "note" || !item.type);
          else if (nav.category === "links") result = result.filter(item => item.type === "link" || item.type === 'document' || item.type === 'audio');
      } else if (nav.categoryType === 'folder') result = result.filter(item => item.sections?.includes(nav.category) || item.section === nav.category);
      else if (nav.categoryType === 'list') result = result.filter(item => item.list_name === nav.category);
    }

    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      result = result.filter(item => `${item.title || ''} ${item.content || ''} ${(item.tags || []).join(' ')} ${item.ai_summary || ''}`.toLowerCase().includes(q));
    }
    return result.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [debouncedSearchQuery, nav.category, nav.categoryType, items, nav.workspace]);

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
    if ((nav.categoryType as any) === 'hashtags') return 'Hashtags';
    if (nav.categoryType === 'tag') return `#${nav.category}`;
    if (nav.category === 'All') return 'Everything';
    return nav.category.charAt(0).toUpperCase() + nav.category.slice(1);
  };

  const handleToggleSelect = useCallback((id: string | number, shiftKey: boolean) => {
     setSelectedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
           newSet.delete(id);
           setLastSelected(null);
        } else {
           if (shiftKey && lastSelected) {
               const data = filteredData;
               const startIdx = data.findIndex(i => i.id === lastSelected);
               const endIdx = data.findIndex(i => i.id === id);
               if (startIdx !== -1 && endIdx !== -1) {
                   const min = Math.min(startIdx, endIdx);
                   const max = Math.max(startIdx, endIdx);
                   for (let i = min; i <= max; i++) {
                       newSet.add(data[i].id);
                   }
               }
           } else {
               newSet.add(id);
           }
           setLastSelected(id);
        }
        return newSet;
     });
  }, [filteredData, lastSelected]);

  const handleSelectAll = () => {
      if (selectedItems.size === filteredData.length) {
          setSelectedItems(new Set());
      } else {
          setSelectedItems(new Set(filteredData.map(i => i.id)));
      }
  };

  if (ui.isAuthLoading) return <div className={`flex h-screen w-full items-center justify-center ${theme.bg}`}><Loader2 strokeWidth={1.5} className={`animate-spin ${theme.textMuted}`} /></div>;

  return (
    <div className={`flex h-screen w-full relative transition-colors duration-700 overflow-hidden ${theme.bg} ${theme.text} selection:bg-teal-500/30 ${inter.className}`}>
      <Toaster theme={isDark ? 'dark' : 'light'} position="bottom-right" style={{ zIndex: 99999 }} />
      
      <AnimatePresence>
         {(ui.isSaving || ui.isAILoading) && (
            <motion.div 
               initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
               style={{ zIndex: 9999 }}
               className={`fixed bottom-24 md:bottom-10 left-1/2 md:left-10 -translate-x-1/2 md:translate-x-0 flex items-center gap-3 px-5 py-2.5 rounded-full shadow-lg border backdrop-blur-xl ${isDark ? 'bg-zinc-900/90 border-white/10' : 'bg-white/90 border-stone-200'}`}
            >
               {ui.isAILoading && <span className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest"><Wand2 size={14} strokeWidth={2} className="animate-bounce"/> Extracting Link...</span>}
               {ui.isSaving && !ui.isAILoading && <span className="flex items-center gap-2 text-[10px] font-bold text-teal-500 uppercase tracking-widest"><Loader2 size={14} strokeWidth={2} className="animate-spin"/> Saving</span>}
            </motion.div>
         )}
      </AnimatePresence>

      <div style={{ zIndex: 99999 }} className="flex md:hidden fixed inset-0 bg-[#000000] text-white flex-col items-center justify-center p-8 text-center selection:bg-teal-500/30">
         <Monitor size={80} className="mb-8 text-teal-400 opacity-90" strokeWidth={1} />
         <h2 className="text-4xl font-black tracking-tight mb-4">Desktop Only</h2>
         <p className="text-white/60 text-lg max-w-sm leading-relaxed">
           Brainboard is a powerful, expansive canvas designed for larger screens. Switch to a computer for the optimal experience.
         </p>
      </div>

      <Command.Dialog open={cmdKOpen} onOpenChange={setCmdKOpen} label="Global Command Menu" className={`fixed top-[20%] left-1/2 transform -translate-x-1/2 w-[90%] md:w-full max-w-2xl rounded-4xl shadow-2xl border overflow-hidden backdrop-blur-3xl ${isDark ? 'bg-zinc-900/90 border-white/10' : 'bg-white/90 border-stone-200'}`} style={{ zIndex: 9999 }}>
         <Command.Input placeholder="Type a command or search..." className="w-full p-5 bg-transparent outline-none text-lg text-zinc-900 dark:text-zinc-100 border-b border-black/5 dark:border-white/5" />
         <Command.List className="p-3 max-h-[50vh] overflow-y-auto custom-scrollbar">
            <Command.Empty className="p-4 text-center text-sm text-stone-500">No results found.</Command.Empty>
            <Command.Group heading="General Actions" className="text-xs font-bold uppercase tracking-widest text-stone-400 p-2">
               <Command.Item onSelect={() => { handleNewNote(); setCmdKOpen(false); }} className="flex items-center gap-3 p-4 rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 text-sm font-bold text-stone-800 dark:text-zinc-100 mb-1 transition-colors">
                  <Plus size={18} /> Create New Note
               </Command.Item>
               <Command.Item onSelect={() => { handleNewChecklist(); setCmdKOpen(false); }} className="flex items-center gap-3 p-4 rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 text-sm font-bold text-stone-800 dark:text-zinc-100 mb-1 transition-colors">
                  <CheckSquare size={18} /> Create New Checklist
               </Command.Item>
               <Command.Item onSelect={() => { fileInputRef.current?.click(); setCmdKOpen(false); }} className="flex items-center gap-3 p-4 rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 text-sm font-bold text-stone-800 dark:text-zinc-100 mb-1 transition-colors">
                  <UploadCloud size={18} /> Upload File / Media
               </Command.Item>
            </Command.Group>
            <Command.Group heading="Navigation" className="text-xs font-bold uppercase tracking-widest text-stone-400 p-2 mt-4">
               <Command.Item onSelect={() => { updateNav({ workspace: 'personal' }); setCmdKOpen(false); }} className="flex items-center gap-3 p-4 rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 text-sm font-bold text-stone-800 dark:text-zinc-100 mb-1 transition-colors">
                  <Users size={18} /> Switch to Personal Workspace
               </Command.Item>
               <Command.Item onSelect={() => { updateNav({ workspace: 'team' }); setCmdKOpen(false); }} className="flex items-center gap-3 p-4 rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 text-sm font-bold text-stone-800 dark:text-zinc-100 mb-1 transition-colors">
                  <Users size={18} /> Switch to Team Workspace
               </Command.Item>
               <Command.Item onSelect={() => { toggleTheme(); setCmdKOpen(false); }} className="flex items-center gap-3 p-4 rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 text-sm font-bold text-stone-800 dark:text-zinc-100 mb-1 transition-colors">
                  {isDark ? <Sun size={18} /> : <Moon size={18} />} Toggle Theme
               </Command.Item>
            </Command.Group>
         </Command.List>
      </Command.Dialog>

      {!session ? (
        <div className={`relative h-screen w-full bg-[#000000] text-white overflow-hidden selection:bg-teal-500/30 flex flex-col items-center justify-center`}>
          <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
             <motion.div animate={{ rotate: 360, scale: [1, 1.1, 1] }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="absolute w-[60vw] h-[60vw] bg-linear-to-tr from-teal-600/30 to-emerald-900/10 blur-[140px] rounded-full" />
             <motion.div animate={{ rotate: -360, scale: [1, 1.2, 1] }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} className="absolute w-[50vw] h-[50vw] bg-linear-to-bl from-cyan-600/20 to-blue-900/10 blur-[140px] rounded-full translate-x-32 translate-y-32" />
          </div>

          <nav className="absolute top-0 w-full flex justify-between items-center px-6 md:px-12 py-8 z-50">
            <div className="font-bold text-xl md:text-2xl tracking-tighter flex items-center gap-3 drop-shadow-lg">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-white/5 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10 shadow-xl"><Sparkles size={20} className="text-teal-400" /></div>
              brainboard.
            </div>
            <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={handleGoogleLogin} className="px-4 py-2.5 md:px-6 md:py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-4xl text-xs md:text-sm font-bold transition-colors backdrop-blur-xl shadow-2xl">
               Enter Workspace
            </motion.button>
          </nav>

          <div className="absolute inset-0 pointer-events-none z-10 perspective-[1000px]">
             <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[20%] left-[10%] w-64 h-48 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] shadow-2xl flex items-center justify-center -rotate-6">
               <LayoutGrid size={60} className="text-white/20" />
             </motion.div>
             <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute top-[60%] right-[15%] w-72 h-32 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl flex items-center px-8 rotate-[4deg]">
               <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center border border-teal-500/30 mr-4"><MessageSquare size={16} className="text-teal-400" /></div>
               <div className="flex-1 space-y-2"><div className="h-2 w-3/4 bg-white/20 rounded-full"/><div className="h-2 w-1/2 bg-white/10 rounded-full"/></div>
             </motion.div>
             <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute top-[15%] right-[25%] w-48 h-48 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] shadow-2xl flex items-center justify-center rotate-12">
               <Sparkles size={50} className="text-emerald-400/30" />
             </motion.div>
          </div>

          <main className="relative z-20 flex flex-col items-center text-center max-w-5xl px-6 w-full mt-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/10 bg-white/5 text-white/80 text-sm font-bold mb-10 shadow-2xl backdrop-blur-xl">
              <ShieldAlert size={16} className="text-teal-400" /> A private, unified canvas for your office.
            </motion.div>
            
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="text-7xl md:text-8xl lg:text-[8rem] font-black tracking-tighter mb-10 leading-[0.95] w-full drop-shadow-2xl">
              Curate your <span className="text-transparent bg-clip-text bg-linear-to-br from-teal-400 to-emerald-600">mind.</span>
            </motion.h1>
            
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className={`max-w-2xl text-lg md:text-xl font-medium mb-16 leading-relaxed text-white/60 drop-shadow-md`}>
              The impossibly clean, highly visual workspace designed for teams. Drop links, write notes, organize media, and collaborate in real-time.
            </motion.p>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}>
              <motion.button whileHover={bounceHover} whileTap={bounceTap} onClick={handleGoogleLogin} className={`group bg-white text-black text-base md:text-lg font-black px-10 py-4 md:px-12 md:py-5 rounded-4xl transition-all flex items-center gap-3 shadow-[0_0_60px_rgba(20,184,166,0.4)] hover:shadow-[0_0_80px_rgba(20,184,166,0.6)]`}>
                Authenticate Securely <ChevronRight className="group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </motion.div>
          </main>
        </div>
      ) : (
        <>
          <input type="file" ref={fileInputRef} onChange={handleMediaUpload} accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.txt" multiple className="hidden" />
          <input type="file" ref={avatarInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />

          {/* MODALS */}
          <OnboardingModal ui={ui} profile={profile} updateProfile={updateProfile} handleUpdateProfile={handleUpdateProfile} theme={theme} isDark={isDark} />
          <LogoutConfirmModal ui={ui} updateUi={updateUi} handleSecureLogout={handleSecureLogout} theme={theme} isDark={isDark} />
          <SettingsModal 
            ui={ui} updateUi={updateUi} profile={profile} updateProfile={updateProfile} handleUpdateProfile={handleUpdateProfile}
            currentAvatar={currentAvatar} userDisplayName={userDisplayName} userHandle={userHandle} avatarInputRef={avatarInputRef}
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

          {/* YOUTUBE THEATER MODAL */}
          <AnimatePresence>
            {playingYouTubeId && (
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                 className="fixed inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl p-4 md:p-10"
                 style={{ zIndex: 99999 }}
                 onClick={() => setPlayingYouTubeId(null)}
               >
                 <button onClick={() => setPlayingYouTubeId(null)} className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"><X size={24} /></button>
                 <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} transition={modalSpring} className="w-full max-w-6xl aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10" onClick={e => e.stopPropagation()}>
                    <iframe src={`https://www.youtube.com/embed/${playingYouTubeId}?autoplay=1&rel=0`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                 </motion.div>
               </motion.div>
            )}
          </AnimatePresence>

          <aside className={`hidden md:flex w-64 h-full shrink-0 flex-col relative z-20 transition-colors duration-700 ${theme.sidebar}`}>
             <div className="p-6 pb-2 pt-8 flex justify-between items-center">
                <h1 className="font-bold text-2xl tracking-tighter flex items-center gap-2">
                  <Sparkles className="text-teal-500" size={22} strokeWidth={1.5} /> brainboard
                </h1>
             </div>

             <div className="px-4 mb-2 mt-4">
                <div className={`relative flex items-center p-1 rounded-xl shadow-sm ${isDark ? 'bg-white/5 border border-white/5' : 'bg-[#e8e4dc]/50 border border-[#e8e4dc]'}`}>
                   <motion.div 
                     layoutId="workspace-pill-desktop"
                     className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg shadow-sm border ${isDark ? 'bg-zinc-800 border-white/5' : 'bg-white border-[#e8e4dc]'}`}
                     initial={false}
                     animate={{ left: nav.workspace === 'personal' ? '4px' : 'calc(50%)' }}
                     transition={modalSpring}
                   />
                   <button 
                     onClick={() => { updateNav({ workspace: 'personal', viewMode: 'grid' }); updateUi({ isChatOpen: false }); fetchItems(1, false); }} 
                     className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-colors ${nav.workspace === 'personal' ? 'text-teal-600 dark:text-teal-400' : theme.textMuted}`}
                   >
                     Personal
                   </button>
                   <button 
                     onClick={() => { updateNav({ workspace: 'team', viewMode: 'grid' }); fetchItems(1, false); }} 
                     className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-colors ${nav.workspace === 'team' ? 'text-teal-600 dark:text-teal-400' : theme.textMuted}`}
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
                     
                     <SidebarItem icon={<Hash size={16} strokeWidth={1.5}/>} label="Hashtags" active={(nav.categoryType as any) === "hashtags" || nav.categoryType === "tag"} onClick={() => updateNav({ categoryType: "hashtags" as any, category: "All" })} theme={theme} isDark={isDark} />
                   </div>
                </div>

                <div>
                   <div className="flex items-center justify-between px-3 mb-2 group">
                     <h4 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMuted} opacity-70`}>My Lists</h4>
                     {canModifyStructure && <button aria-label="Create List" onClick={() => updateSidebar({ isCreatingList: true })} className={`opacity-0 group-hover:opacity-100 transition-opacity ${theme.textMuted} hover:${theme.text}`}><Plus size={14} strokeWidth={1.5}/></button>}
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
                     {canModifyStructure && <button aria-label="Create Folder" onClick={() => updateSidebar({ isCreatingFolder: true })} className={`opacity-0 group-hover:opacity-100 transition-opacity ${theme.textMuted} hover:${theme.text}`}><Plus size={14} strokeWidth={1.5}/></button>}
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
                            onDropItem={(itemId: string | number) => moveItemToFolder(itemId, folder)}
                         />
                      ))}
                   </div>
                </div>

                <div className="pt-2">
                     <SidebarItem icon={<Trash size={16} strokeWidth={1.5}/>} label="Trash" active={nav.categoryType === "trash"} onClick={() => updateNav({ categoryType: "trash", category: "All" })} theme={theme} isDark={isDark} />
                </div>
             </div>

             <div className={`p-4 mt-auto border-t transition-colors ${isDark ? 'border-white/5' : 'border-[#e8e4dc]'}`}>
               <button onClick={() => updateUi({ isAccountOpen: true })} className={`flex items-center gap-3 w-full text-left px-2 py-2 rounded-4xl transition-all cursor-pointer active:scale-95 ${theme.btnGhost}`}>
                 <img src={currentAvatar} className={`w-10 h-10 rounded-full object-cover shadow-sm ring-2 ${isDark ? 'ring-white/10' : 'ring-[#e8e4dc]'}`} alt="Avatar" />
                 <div className="flex-1 min-w-0">
                   <h3 className="font-bold text-sm truncate leading-tight">{userDisplayName}</h3>
                 </div>
                 <div className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#e8e4dc]'}`} title="Settings"><Settings size={18} strokeWidth={1.5}/></div>
               </button>
             </div>
          </aside>

          <main 
            ref={mainContentRef}
            className="flex-1 flex flex-col relative w-full mb-16 md:mb-0 overflow-hidden focus:outline-none bg-transparent"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            tabIndex={0} 
          >
            <AnimatePresence>
               {isSelectMode && (
                  <motion.div 
                     initial={{ y: 100, opacity: 0, x: '-50%' }} animate={{ y: 0, opacity: 1, x: '-50%' }} exit={{ y: 100, opacity: 0, x: '-50%' }}
                     style={{ zIndex: 100 }}
                     className="fixed bottom-20 md:bottom-10 left-1/2 flex items-center gap-2 md:gap-3 px-3 py-3 rounded-full shadow-2xl border backdrop-blur-2xl bg-[#1C1C1E]/95 border-white/10 w-[90%] md:w-auto max-w-lg justify-between md:justify-start"
                  >
                     <div className="px-2 md:px-4 border-r border-white/10 flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-3 shrink-0">
                        <span className="text-white text-xs md:text-sm font-black tracking-tight">{selectedItems.size} <span className="text-zinc-400 font-bold hidden sm:inline">Selected</span></span>
                        <button onClick={handleSelectAll} className="text-[9px] md:text-[10px] text-teal-400 font-bold uppercase tracking-widest hover:text-teal-300">
                           {selectedItems.size === filteredData.length ? 'Deselect All' : 'Select All'}
                        </button>
                     </div>

                     <div className="flex items-center gap-1 md:gap-2 flex-1 justify-end">
                       {nav.categoryType === 'trash' ? (
                          <>
                             <button onClick={() => { bulkRestoreFromTrash(Array.from(selectedItems)); setSelectedItems(new Set()); }} className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] md:text-xs font-bold text-emerald-400 hover:bg-white/10 transition-colors">
                                <RotateCcw size={14} /> <span className="hidden sm:inline">Restore</span>
                             </button>
                             <button onClick={() => { if(window.confirm('Delete these items forever?')) { bulkHardDelete(Array.from(selectedItems)); setSelectedItems(new Set()); } }} className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] md:text-xs font-bold text-red-400 hover:bg-white/10 transition-colors">
                                <Trash2 size={14} /> <span className="hidden sm:inline">Delete</span>
                             </button>
                          </>
                       ) : (
                          <>
                             <div className="relative group">
                                <select 
                                   onChange={(e) => { bulkMoveToFolder(Array.from(selectedItems), e.target.value); setSelectedItems(new Set()); }}
                                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                >
                                   <option value="" disabled selected>Select Folder</option>
                                   {customFolders.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                                <button className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] md:text-xs font-bold text-zinc-300 hover:bg-white/10 transition-colors">
                                   <Folder size={14} className="text-zinc-400" /> <span className="hidden sm:inline">Folder</span>
                                </button>
                             </div>

                             <div className="relative group">
                                <select 
                                   onChange={(e) => { bulkMoveToList(Array.from(selectedItems), e.target.value); setSelectedItems(new Set()); }}
                                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                >
                                   <option value="" disabled selected>Select List</option>
                                   {customLists.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                                <button className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] md:text-xs font-bold text-zinc-300 hover:bg-white/10 transition-colors">
                                   <ListIcon size={14} className="text-zinc-400" /> <span className="hidden sm:inline">List</span>
                                </button>
                             </div>

                             <button onClick={() => { bulkMoveToTrash(Array.from(selectedItems)); setSelectedItems(new Set()); }} className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] md:text-xs font-bold text-red-400 hover:bg-white/10 transition-colors">
                                <Trash2 size={14} /> <span className="hidden sm:inline">Trash</span>
                             </button>
                          </>
                       )}

                       <div className="border-l border-white/10 pl-1 md:pl-3">
                          <button onClick={() => setSelectedItems(new Set())} className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                             <X size={16} />
                          </button>
                       </div>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>

            <AnimatePresence>
              {ui.isDragging && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-teal-500/10 backdrop-blur-md border-4 border-teal-500/50 border-dashed m-6 rounded-4xl flex items-center justify-center pointer-events-none"
                >
                  <div className="bg-white dark:bg-zinc-900 px-10 py-8 rounded-4xl shadow-2xl flex flex-col items-center gap-4 border border-stone-200 dark:border-zinc-800">
                    <UploadCloud size={48} strokeWidth={1.5} className="text-teal-500 animate-bounce" />
                    <h2 className="text-2xl font-bold tracking-tight">Drop files to upload</h2>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <header className={`w-full px-4 md:px-10 pt-6 md:pt-8 pb-4 md:pb-6 shrink-0 flex items-center justify-between gap-4 md:gap-6 relative z-50 bg-transparent`}>
              <div className="flex-1 max-w-xl flex items-center gap-2 md:gap-4">
                <div className="relative group flex-1">
                  <Search className={`absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${theme.textMuted} group-focus-within:text-teal-500`} />
                  <input type="text" placeholder={`Search...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full rounded-4xl py-3 pl-9 md:pl-11 pr-4 text-sm font-medium outline-none transition-all ${theme.input} leading-normal`} />
                </div>

                <div className={`hidden md:flex items-center p-1 rounded-full border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-[#e8e4dc] shadow-sm'}`}>
                   <button aria-label="Masonry Grid" onClick={() => updateNav({ viewMode: 'grid' })} className={`p-2.5 rounded-full transition-all active:scale-95 ${nav.viewMode === 'grid' ? (isDark ? 'bg-white/10 text-teal-400 shadow-sm' : 'bg-[#f4efe6] text-teal-600 shadow-sm') : theme.textMuted}`} title="Masonry Grid">
                     <Columns size={18} strokeWidth={1.5} />
                   </button>
                   <button aria-label="Uniform Cards" onClick={() => updateNav({ viewMode: 'card' })} className={`p-2.5 rounded-full transition-all active:scale-95 ${nav.viewMode === 'card' ? (isDark ? 'bg-white/10 text-teal-400 shadow-sm' : 'bg-[#f4efe6] text-teal-600 shadow-sm') : theme.textMuted}`} title="Uniform Cards">
                     <LayoutGrid size={18} strokeWidth={1.5} />
                   </button>
                   <button aria-label="List View" onClick={() => updateNav({ viewMode: 'list' })} className={`p-2.5 rounded-full transition-all active:scale-95 ${nav.viewMode === 'list' ? (isDark ? 'bg-white/10 text-teal-400 shadow-sm' : 'bg-[#f4efe6] text-teal-600 shadow-sm') : theme.textMuted}`} title="List View">
                     <AlignJustify size={18} strokeWidth={1.5} />
                   </button>
                   <button aria-label="Calendar View" onClick={() => updateNav({ viewMode: 'calendar' })} className={`p-2.5 rounded-full transition-all active:scale-95 ${nav.viewMode === 'calendar' ? (isDark ? 'bg-white/10 text-teal-400 shadow-sm' : 'bg-[#f4efe6] text-teal-600 shadow-sm') : theme.textMuted}`} title="Calendar View">
                     <CalendarIcon size={18} strokeWidth={1.5} />
                   </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 md:gap-4 shrink-0">
                <button aria-label="Manual Sync" onClick={() => fetchItems(1, false)} className={`p-2.5 md:p-3 rounded-full transition-all active:scale-95 border shadow-sm ${isDark ? 'bg-white/5 border-white/5 text-teal-400 hover:bg-white/10' : 'bg-white border-[#e8e4dc] text-teal-600 hover:bg-[#f4efe6]'}`} title="Manual Sync">
                   <RefreshCw size={18} strokeWidth={2} className={ui.isSyncing ? "animate-spin" : ""} />
                </button>

                <ThemeToggle isDark={isDark} toggle={toggleTheme} />

                <AnimatePresence>
                   {nav.workspace === 'team' && (
                     <>
                       <button aria-label="Team Chat" onClick={() => updateUi({ isChatOpen: !ui.isChatOpen })} className={`hidden md:flex p-3 rounded-full border shadow-sm transition-all active:scale-95 ${ui.isChatOpen ? 'bg-teal-500 text-white border-teal-600' : (isDark ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-[#e8e4dc] hover:bg-[#f4efe6]')}`}>
                          <MessageSquare size={18} strokeWidth={ui.isChatOpen ? 2 : 1.5} className={ui.isChatOpen ? 'text-white' : theme.textMuted} />
                       </button>

                       <div className="relative">
                          <button aria-label="Notifications" onClick={() => updateUi({ showNotifications: !ui.showNotifications })} className={`p-2.5 md:p-3 rounded-full border shadow-sm transition-all active:scale-95 ${isDark ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-white border-[#e8e4dc] hover:bg-[#f4efe6]'}`}>
                             <Bell size={18} strokeWidth={1.5} className={theme.textMuted} />
                             {notifications.some(n => !n.read) && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900" />}
                          </button>
                          <AnimatePresence>
                             {ui.showNotifications && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => updateUi({ showNotifications: false })} />
                                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} className={`absolute right-0 top-full mt-3 w-72 md:w-80 z-50 rounded-2xl shadow-2xl border backdrop-blur-2xl p-2 ${isDark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white/95 border-[#e8e4dc]'}`}>
                                     <div className="p-4 border-b border-black/5 dark:border-white/5 mb-2 flex items-center justify-between">
                                        <h4 className={`text-xs font-bold uppercase tracking-widest ${theme.textMuted}`}>Notifications</h4>
                                        {notifications.some(n => !n.read) && (
                                           <button onClick={handleMarkAllAsRead} className="text-[10px] text-teal-500 hover:text-teal-600 font-bold uppercase tracking-widest">Mark all read</button>
                                        )}
                                     </div>
                                     <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                                        {notifications.length === 0 ? (
                                           <div className="p-6 text-center text-sm text-stone-500">No new notifications.</div>
                                        ) : notifications.map(n => (
                                           <div key={n.id} onClick={() => handleMarkAsRead(n.id)} className={`p-4 rounded-xl transition-colors cursor-pointer group ${n.read ? 'opacity-60' : (isDark ? 'bg-white/5' : 'bg-black/5')} hover:bg-teal-500/10 relative`}>
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

                       <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="relative hidden md:block">
                          <button aria-label="Team Presence" onClick={() => updateUi({ showTeamPresence: !ui.showTeamPresence })} className={`flex items-center p-1.5 rounded-full shadow-sm cursor-pointer active:scale-95 hover:shadow-md transition-all border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-[#e8e4dc]'}`}>
                            <div className="flex -space-x-2 pl-1.5">
                              {teamMembers.filter(m => m.inWorkspace).slice(0, 3).map((member, i) => (
                                 <img key={i} className={`inline-block h-8 w-8 rounded-full ring-2 object-cover ${isDark ? 'ring-zinc-900' : 'ring-white'}`} src={member.avatar} alt=""/>
                              ))}
                            </div>
                            <div className="px-4 flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase tracking-widest"><Users size={14} strokeWidth={2}/> Team</div>
                          </button>
                          <AnimatePresence>
                             {ui.showTeamPresence && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => updateUi({ showTeamPresence: false })} />
                                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} className={`absolute right-0 top-full mt-3 w-80 z-50 rounded-2xl shadow-2xl border backdrop-blur-2xl flex flex-col overflow-hidden ${isDark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white/95 border-[#e8e4dc]'}`}>
                                     <div className="flex flex-col gap-1 max-h-80 overflow-y-auto custom-scrollbar p-2">
                                        
                                        <div className="px-3 pt-3 pb-2">
                                           <h4 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMuted}`}>Online Now</h4>
                                        </div>
                                        <div className="flex flex-col gap-1 px-1">
                                           {teamMembers.filter(m => m.inWorkspace && m.status === 'online').length === 0 ? (
                                              <div className="px-3 py-2 text-sm text-stone-500 font-medium">No one online.</div>
                                           ) : (
                                              teamMembers.filter(m => m.inWorkspace && m.status === 'online').map(member => (
                                                 <div key={member.id} className="flex items-center justify-between gap-3 w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5">
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                       <img src={member.avatar} className="w-8 h-8 rounded-full object-cover shadow-sm shrink-0" />
                                                       <span className={`text-sm font-bold truncate ${theme.text}`}>{cleanName(member.name)}</span>
                                                    </div>
                                                    <Circle size={10} className="fill-emerald-500 text-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] rounded-full shrink-0" />
                                                 </div>
                                              ))
                                           )}
                                        </div>

                                        <div className={`mt-2 mb-1 border-t mx-3 ${isDark ? 'border-white/10' : 'border-black/5'}`} />

                                        <div className="px-3 pt-2 pb-2">
                                           <h4 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMuted}`}>Offline</h4>
                                        </div>
                                        <div className="flex flex-col gap-1 px-1 pb-2">
                                           {teamMembers.filter(m => m.inWorkspace && m.status === 'offline').map(member => (
                                              <div key={member.id} className="flex items-center justify-between gap-3 w-full px-3 py-2 rounded-xl opacity-60">
                                                 <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <img src={member.avatar} className="w-8 h-8 rounded-full object-cover grayscale shrink-0" />
                                                    <span className={`text-sm font-bold truncate ${theme.text}`}>{cleanName(member.name)}</span>
                                                 </div>
                                                 <span className="text-[10px] font-medium text-stone-500 whitespace-nowrap shrink-0">seen {formatDistanceToNow(member.lastSeen)} ago</span>
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
                
                <AnimatePresence mode="wait">
                  {nav.categoryType === 'trash' ? (
                    <button key="btn-trash" aria-label="Empty Trash" onClick={emptyTrash} className={`px-4 py-2.5 md:px-6 md:py-3 rounded-full text-xs md:text-sm font-bold transition-all active:scale-95 flex items-center gap-2 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white`}>
                      <Trash2 size={16} strokeWidth={2} /> <span className="hidden md:inline">Empty Trash</span>
                    </button>
                  ) : (
                    <motion.div key="btn-all" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-2">
                      {canCreate && (
                         <>
                            <button aria-label="Upload Files" onClick={() => fileInputRef.current?.click()} disabled={ui.isUploading} className={`px-4 py-2.5 md:px-5 md:py-3 rounded-full text-sm font-bold transition-all flex items-center justify-center border ${theme.card} hover:opacity-80 active:scale-95`} title="Upload File, Image, Video, Audio">
                               <ImageIcon size={18} strokeWidth={1.5} />
                            </button>
                            <button aria-label="New Checklist" onClick={handleNewChecklist} className={`px-5 py-3 rounded-full text-sm font-bold transition-all flex items-center justify-center border ${theme.card} hover:opacity-80 active:scale-95`} title="New Checklist">
                               <CheckSquare size={18} strokeWidth={1.5} />
                            </button>
                            <motion.button aria-label="New Note" whileHover={bounceHover} whileTap={bounceTap} onClick={handleNewNote} className={`px-5 py-2.5 md:px-8 md:py-3 rounded-full text-xs md:text-sm font-bold flex items-center gap-2 ${theme.btnPrimary}`}>
                               <Plus size={16} strokeWidth={2} /> <span className="hidden md:inline">New Note</span>
                            </motion.button>
                         </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </header>

            <div className={`px-4 md:px-10 pb-4 md:pb-6 flex flex-col relative z-40 bg-transparent`}>
               <div className="flex items-end justify-between">
                 {nav.viewMode === 'grid' || nav.viewMode === 'card' || nav.viewMode === 'list' ? (
                    <>
                     <div>
                       <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight">
                         {getCategoryTitle()}
                       </h2>
                       <p className={`mt-1 text-xs md:text-sm font-medium flex items-center gap-2 ${theme.textMuted}`}>
                          {filteredData.length} items curated
                       </p>
                     </div>
                    </>
                 ) : (
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
                      <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight">{format(nav.currentDate, 'MMMM yyyy')}</h2>
                      <div className={`flex items-center gap-1 border rounded-full p-1 shadow-sm backdrop-blur-md ${isDark ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-white border-[#e8e4dc]'}`}>
                         <button aria-label="Previous Month" onClick={() => updateNav({ currentDate: subMonths(nav.currentDate, 1) })} className={`p-2.5 rounded-full transition-colors active:scale-95 ${isDark ? 'hover:bg-zinc-800 text-zinc-100' : 'hover:bg-[#f4efe6] text-stone-900'}`}><ChevronLeft size={18} strokeWidth={1.5}/></button>
                         <button onClick={() => updateNav({ currentDate: new Date() })} className={`px-5 py-2 text-sm font-bold rounded-full transition-colors active:scale-95 ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-[#f4efe6] text-stone-500'}`}>Today</button>
                         <button aria-label="Next Month" onClick={() => updateNav({ currentDate: addMonths(nav.currentDate, 1) })} className={`p-2.5 rounded-full transition-colors active:scale-95 ${isDark ? 'hover:bg-zinc-800 text-zinc-100' : 'hover:bg-[#f4efe6] text-stone-900'}`}><ChevronRightIcon size={18} strokeWidth={1.5}/></button>
                      </div>
                    </div>
                 )}
               </div>

               <AnimatePresence>
                  {((nav.categoryType as any) === 'hashtags' || nav.categoryType === 'tag') && (
                     <motion.div 
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className={`flex flex-col gap-4 mt-6 pt-4 border-t ${isDark ? 'border-white/5' : 'border-[#e8e4dc]'} w-full relative z-30`}
                     >
                        <div className={`relative flex items-center w-full max-w-md rounded-2xl overflow-hidden border focus-within:border-teal-500 transition-colors ${isDark ? 'bg-zinc-900/50 border-white/10' : 'bg-white border-[#e8e4dc] shadow-sm'}`}>
                           <Search size={16} className={`absolute left-4 ${theme.textMuted}`} />
                           <input 
                              type="text" placeholder="Search hashtags..." 
                              value={tagSearchQuery} onChange={e => setTagSearchQuery(e.target.value)}
                              className={`w-full bg-transparent border-none py-3 pl-11 pr-4 text-sm font-medium outline-none ${theme.text}`}
                           />
                           {tagSearchQuery && (
                              <button onClick={() => setTagSearchQuery("")} className={`absolute right-4 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 ${theme.textMuted}`}><X size={14}/></button>
                           )}
                        </div>
                        
                        <div className="w-full flex flex-wrap gap-2 pt-1 pb-2">
                           <button 
                              onClick={() => updateNav({ categoryType: 'hashtags' as any, category: 'All' })}
                              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border shrink-0 ${(nav.categoryType as any) === 'hashtags' ? 'bg-teal-500 text-white border-teal-600 shadow-md' : (isDark ? 'bg-white/5 text-zinc-300 border-white/5 hover:bg-white/10' : 'bg-white text-stone-700 border-[#e8e4dc] hover:bg-[#f4efe6]')}`}
                           >
                              All Hashtags
                           </button>
                           {smartTags.filter(t => t.toLowerCase().includes(tagSearchQuery.toLowerCase())).map(tag => (
                              <button 
                                 key={tag}
                                 onClick={() => updateNav({ categoryType: 'tag', category: tag })}
                                 className={`px-4 py-2 rounded-full text-xs font-bold transition-all border shrink-0 ${nav.categoryType === 'tag' && nav.category === tag ? 'bg-teal-500 text-white border-teal-600 shadow-md' : (isDark ? 'bg-white/5 text-zinc-300 border-white/5 hover:bg-white/10' : 'bg-white text-stone-700 border-[#e8e4dc] hover:bg-[#f4efe6]')}`}
                              >
                                 #{tag}
                              </button>
                           ))}
                           {smartTags.filter(t => t.toLowerCase().includes(tagSearchQuery.toLowerCase())).length === 0 && (
                              <span className={`text-sm font-medium py-2 px-1 shrink-0 ${theme.textMuted}`}>No tags found.</span>
                           )}
                        </div>
                     </motion.div>
                  )}
               </AnimatePresence>
            </div>

            {/* --- DYNAMIC VIEWS --- */}
            <div className="flex-1 overflow-y-auto px-4 md:px-10 pb-24 md:pb-20 custom-scrollbar relative z-10">
              {isLoading && page === 1 ? (
                 <div className={nav.viewMode === 'grid' ? "columns-2 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-4 md:gap-6 space-y-4 md:space-y-6" : nav.viewMode === 'list' ? "flex flex-col gap-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6"}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                       <div key={i} className={`rounded-2xl border animate-pulse overflow-hidden ${theme.card} ${nav.viewMode === 'list' ? 'flex flex-row p-4 gap-4' : 'flex flex-col h-64 md:h-85 break-inside-avoid'}`}>
                          {nav.viewMode === 'list' ? (
                             <>
                                <div className={`w-16 h-16 rounded-xl shrink-0 ${isDark ? 'bg-zinc-800' : 'bg-stone-200'}`} />
                                <div className="flex-1 space-y-3 pt-1">
                                   <div className={`h-4 w-1/3 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-stone-200'}`} />
                                   <div className={`h-3 w-1/2 rounded-full ${isDark ? 'bg-zinc-800/50' : 'bg-stone-200/50'}`} />
                                </div>
                             </>
                          ) : (
                             <>
                                <div className={`w-full h-32 md:h-40 shrink-0 ${isDark ? 'bg-zinc-800' : 'bg-stone-200'}`} />
                                <div className="p-4 md:p-5 flex-1 space-y-4">
                                   <div className={`h-5 w-3/4 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-stone-200'}`} />
                                   <div className="space-y-2">
                                      <div className={`h-3 w-full rounded-full ${isDark ? 'bg-zinc-800/50' : 'bg-stone-200/50'}`} />
                                      <div className={`h-3 w-5/6 rounded-full ${isDark ? 'bg-zinc-800/50' : 'bg-stone-200/50'}`} />
                                   </div>
                                </div>
                             </>
                          )}
                       </div>
                    ))}
                 </div>
              ) : filteredData.length === 0 && (nav.viewMode === 'grid' || nav.viewMode === 'card') ? (
                 <div className="flex-1 w-full flex flex-col items-center my-auto text-center opacity-50 px-4 min-h-75">
                    <div className={`w-full max-w-lg border-2 border-dashed rounded-4xl p-10 md:p-16 flex flex-col items-center justify-center transition-colors ${isDark ? 'border-zinc-700 bg-white/5' : 'border-[#D6D0C4] bg-black/5'}`}>
                      <LayoutGrid size={64} strokeWidth={1} className={`mb-6 ${theme.textMuted}`} />
                      <h3 className="text-2xl md:text-3xl font-black tracking-tight mb-2">A blank canvas.</h3>
                      <p className={`text-sm md:text-base font-medium ${theme.textMuted}`}>Drag & drop files, or press Ctrl+V to paste inspiration.</p>
                    </div>
                 </div>
                 
              ) : nav.viewMode === 'list' ? (
                 <div className="flex flex-col gap-3 pb-10">
                    <AnimatePresence>
                       {filteredData.map((item) => {
                          const isSocialVideo = item.url && (item.url.includes('instagram.com') || item.url.includes('youtube.com') || item.url.includes('youtu.be'));
                          const itemType = isSocialVideo ? 'social_video' : (item.type || (item.url ? 'link' : 'note'));
                          const canModify = nav.workspace === 'personal' || teamRole === 'admin' || teamRole === 'editor' || item.user_id === session?.user?.id;
                          const isSelected = selectedItems.has(item.id);
                          
                          return (
                             <div key={item.id} className="w-full">
                                <motion.div 
                                   layout variants={cardVariants} initial="hidden" animate="visible" exit="exit" 
                                   className={`group relative flex items-center justify-between p-4 rounded-2xl border ${theme.card} ${theme.cardHover} cursor-pointer transition-all duration-300 ${isSelected ? 'ring-2 ring-teal-500 bg-teal-500/5' : ''} z-10 hover:z-50 focus-within:z-50`}
                                   draggable={!nav.categoryType.includes('trash') && !isSelectMode}
                                   onDragStart={(e: any) => { e.dataTransfer.setData('application/x-brainboard-item', JSON.stringify({ id: item.id })); }}
                                >
                                   {canModify && (
                                      <button 
                                         onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleSelect(item.id, e.shiftKey); }}
                                         className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all border shadow-md backdrop-blur-xl z-20 ${isSelected ? 'opacity-100 bg-teal-500 border-teal-600 text-white' : `opacity-0 group-hover:opacity-100 ${isDark ? 'bg-[#1C1C1E]/80 border-white/20 text-white hover:bg-black' : 'bg-white/90 border-black/10 text-stone-800 hover:bg-white'}` }`}
                                      >
                                         <Check size={16} strokeWidth={isSelected ? 3 : 2} />
                                      </button>
                                   )}
                                   
                                   <div className={`flex items-center gap-4 flex-1 min-w-0 transition-transform ${canModify ? 'md:group-hover:translate-x-6' : ''} ${isSelected ? 'translate-x-6' : ''}`}>
                                      <div className={`w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border ${isDark ? 'bg-zinc-800 border-white/5' : 'bg-[#e8e4dc]/50 border-[#e8e4dc]'}`}>
                                         {item.thumbnail_url || item.img ? (
                                            <img src={item.thumbnail_url || item.img} loading="lazy" draggable={false} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                         ) : (
                                            itemType === 'note' ? <FileText size={24} strokeWidth={1.5} className="text-emerald-500" /> : 
                                            itemType === 'document' ? <FileIcon size={24} strokeWidth={1.5} className="text-blue-500" /> :
                                            itemType === 'audio' ? <Music size={24} strokeWidth={1.5} className="text-fuchsia-500" /> :
                                            <Globe size={24} strokeWidth={1.5} className="text-teal-500" />
                                         )}
                                      </div>
                                      <div className="flex flex-col min-w-0 flex-1 pl-1">
                                         <h4 className={`font-bold text-base md:text-lg truncate mb-1 ${theme.text}`}>{item.title || 'Untitled'}</h4>
                                         <p className={`text-xs md:text-sm font-medium truncate ${theme.textMuted}`}>{item.url || item.ai_summary || item.content || 'No description'}</p>
                                      </div>
                                   </div>
                                   
                                   <div className="flex items-center gap-4 md:gap-6 shrink-0 pl-4 md:pl-6">
                                      {item.list_name && <span className={`hidden lg:block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${isDark ? 'bg-white/5 text-white/50' : 'bg-black/5 text-black/50'}`}>{item.list_name}</span>}
                                      
                                      {nav.workspace === 'team' && item.creator && (
                                         <div className="hidden md:flex items-center gap-2" title={`Added by ${cleanName(item.creator)}`}>
                                            <img src={item.creator_avatar || `https://api.dicebear.com/9.x/shapes/svg?seed=${item.creator}`} loading="lazy" className="w-8 h-8 rounded-full shadow-sm" />
                                         </div>
                                      )}
                                      
                                      <span className={`text-xs md:text-sm font-bold uppercase tracking-widest w-16 md:w-24 text-right hidden sm:block ${theme.textMuted}`}>{format(new Date(item.created_at || Date.now()), 'MMM d')}</span>
                                      
                                      {canModify && !isSelectMode && (
                                        <div className={`flex items-center gap-1 md:gap-2 pl-2 md:pl-4 border-l ${isDark ? 'border-white/5' : 'border-[#e8e4dc]'}`}>
                                           {nav.categoryType === 'trash' ? (
                                              <>
                                                 <button aria-label="Restore Item" onClick={(e) => { e.stopPropagation(); restoreFromTrash(item.id); }} className={`p-2.5 md:p-3 rounded-full transition-all active:scale-95 ${isDark ? 'hover:bg-emerald-500/20 text-emerald-400' : 'hover:bg-emerald-100 text-emerald-600'}`}><RotateCcw size={16} strokeWidth={1.5}/></button>
                                                 <button aria-label="Delete Permanently" onClick={(e) => { e.stopPropagation(); hardDelete(item.id); }} className={`p-2.5 md:p-3 rounded-full transition-all active:scale-95 ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-600'}`}><Trash2 size={16} strokeWidth={1.5}/></button>
                                              </>
                                           ) : (
                                              <button aria-label="Move to Trash" onClick={(e) => { e.stopPropagation(); moveToTrash(item.id); }} className={`p-2.5 md:p-3 rounded-full transition-all active:scale-95 opacity-0 group-hover:opacity-100 ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-600'}`}><Trash2 size={16} strokeWidth={1.5}/></button>
                                           )}
                                        </div>
                                      )}
                                   </div>
                                </motion.div>
                             </div>
                          )
                       })}
                    </AnimatePresence>
                 </div>

              ) : nav.viewMode === 'card' || nav.viewMode === 'grid' ? (
                <div className={nav.viewMode === 'grid' ? "columns-2 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-4 md:gap-6 space-y-4 md:space-y-6" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6"}>
                  <AnimatePresence>
                    {filteredData.map((item) => {
                       const ytMatch = item.url?.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                       const isYouTube = !!ytMatch;
                       const youtubeId = isYouTube ? ytMatch[1] : null;

                       return (
                         <motion.div 
                            key={item.id} layout variants={cardVariants} initial="hidden" animate="visible" exit="exit" 
                            className={nav.viewMode === 'grid' ? "break-inside-avoid relative" : "h-full relative"}
                         >
                            <MemoizedMasonryCard 
                              customFolders={customFolders} customLists={customLists} onMoveToFolder={moveItemToFolder} onMoveToList={moveItemToList}
                              onUpdateTags={updateItemTags} onTagClick={(tag: string) => updateNav({ categoryType: 'tag', category: tag, viewMode: 'grid' })}
                              viewMode={nav.viewMode} item={item} theme={theme} isDark={isDark} inTrash={nav.categoryType === 'trash'} activeWorkspace={nav.workspace} currentUserId={session?.user?.id} teamRole={teamRole} teamMembers={teamMembers}
                              onRestore={restoreFromTrash} onHardDelete={hardDelete} onDelete={moveToTrash} onUpdateSticky={updateStickyNote} toggleItemReaction={toggleItemReaction} toggleChecklistItem={toggleChecklistItem}
                              isSelected={selectedItems.has(item.id)} onToggleSelect={handleToggleSelect} isSelectMode={isSelectMode}
                              onPlayYouTube={(id: string) => setPlayingYouTubeId(id)}
                              onClick={(e: any) => {
                                if (nav.categoryType === 'trash') return; 
                                if (item.type === 'document' && item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
                                else if (item.url && item.type !== 'note') { window.open(item.url, '_blank', 'noopener,noreferrer'); } 
                                else { (item.type === 'image' || item.type === 'video') ? updateMedia({ item }) : setEditingNote(item); }
                              }} 
                            />
                         </motion.div>
                       )
                    })}
                  </AnimatePresence>
                </div>

              ) : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={modalSpring} className={`w-full rounded-4xl overflow-hidden flex flex-col shadow-sm border mb-10 ${isDark ? 'bg-[#121214]/50 border-zinc-800/80 backdrop-blur-xl' : 'bg-white border-[#e8e4dc]'}`}>
                   <div className={`grid grid-cols-7 border-b shrink-0 ${isDark ? 'border-zinc-800/80 bg-black/20' : 'border-[#e8e4dc] bg-stone-50'}`}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                         <div key={day} className={`p-3 md:p-5 text-center text-[10px] md:text-xs font-bold uppercase tracking-widest ${theme.textMuted}`}>{day.slice(0, 3)}</div>
                      ))}
                   </div>
                   <div className={`grid grid-cols-7 auto-rows-fr gap-px ${isDark ? 'bg-zinc-800/50' : 'bg-[#e8e4dc]'}`}>
                      {calendarDays.map((day, idx) => {
                         const dayItems = filteredData.filter(item => {
                             const targetDate = item.scheduled_for ? new Date(item.scheduled_for) : new Date(item.created_at || new Date());
                             return isSameDay(targetDate, day);
                         });
                         const isCurrentMonth = isSameMonth(day, monthStart);
                         const isToday = isSameDay(day, new Date());

                         return (
                           <div key={day.toString()} className={`min-h-24 md:min-h-35 p-2 md:p-4 flex flex-col gap-2 md:gap-3 transition-colors ${isCurrentMonth ? (isDark ? 'bg-[#09090b]' : 'bg-white') : (isDark ? 'bg-[#09090b]/50 opacity-40' : 'bg-[#faf8f5] opacity-50')}`}>
                              <div className={`text-xs md:text-sm font-black w-6 h-6 md:w-10 md:h-10 flex items-center justify-center rounded-full shrink-0 ${isToday ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20' : theme.textMuted}`}>{format(day, 'd')}</div>
                              <div className="flex-1 flex flex-col gap-1 md:gap-2 overflow-y-auto custom-scrollbar pr-1">
                                 {dayItems.map(item => {
                                    const ytMatch = item.url?.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                                    const isYouTube = !!ytMatch;
                                    const youtubeId = isYouTube ? ytMatch[1] : null;

                                    const isVideo = item.url && (item.url.includes('instagram.com') || isYouTube);
                                    const chipColor = isVideo 
                                       ? (isDark ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' : 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200') 
                                       : item.type === 'note' 
                                       ? (isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-100 text-emerald-700 border-emerald-200')
                                       : (isDark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-100 text-blue-700 border-blue-200');
                                    const Icon = isVideo ? Play : item.type === 'note' ? FileText : Globe;
                                    
                                    return (
                                       <button 
                                          key={item.id} 
                                          onClick={() => {
                                             if (isYouTube) setPlayingYouTubeId(youtubeId);
                                             else if (item.type === 'document' && item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
                                             else if (item.url && item.type !== 'note') window.open(item.url, '_blank', 'noopener,noreferrer');
                                             else (item.type === 'image' || item.type === 'video') ? updateMedia({ item }) : setEditingNote(item);
                                          }}
                                          className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold border cursor-pointer shadow-sm truncate hover:scale-105 active:scale-95 transition-all ${chipColor}`}
                                       >
                                          <Icon size={12} strokeWidth={2} className="shrink-0 md:w-3.5 md:h-3.5" />
                                          <span className="truncate">{item.title || "Untitled"}</span>
                                       </button>
                                    )
                                 })}
                              </div>
                           </div>
                         )
                      })}
                   </div>
                </motion.div>
              )}

              {/* --- PAGINATION LOAD MORE BUTTON --- */}
              {hasMore && !isLoading && !debouncedSearchQuery && !isSelectMode && (
                  <div className="w-full flex justify-center mt-10 mb-8">
                     <button 
                        onClick={() => { setPage(p => p+1); fetchItems(page + 1, true); }}
                        className={`px-8 py-3 rounded-full font-bold text-sm transition-all active:scale-95 border shadow-sm ${isDark ? 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700' : 'bg-white border-[#e8e4dc] text-[#2d2a26] hover:bg-[#f4efe6]'}`}
                     >
                        Load More Content
                     </button>
                  </div>
              )}
              {isLoading && page > 1 && (
                  <div className="w-full flex justify-center mt-10 mb-8">
                     <Loader2 size={24} className={`animate-spin ${theme.textMuted}`} />
                  </div>
              )}

            </div>
          </main>

          {/* MOBILE BOTTOM NAV */}
          <div className={`md:hidden fixed bottom-0 left-0 w-full h-16 border-t flex items-center justify-around pb-safe ${isDark ? 'bg-[#09090b]/90 backdrop-blur-xl border-white/10' : 'bg-[#FAF8F5]/90 backdrop-blur-xl border-[#E8E6E1]'} style={{ zIndex: 9999 }}`}>
              <button onClick={() => { updateNav({ workspace: 'personal', viewMode: 'grid' }); }} className={`flex flex-col items-center gap-1 p-2 ${nav.workspace === 'personal' ? 'text-teal-500' : theme.textMuted}`}>
                 <Home size={20} strokeWidth={nav.workspace === 'personal' ? 2.5 : 1.5} />
              </button>
              <button onClick={() => { updateNav({ workspace: 'team', viewMode: 'grid' }); }} className={`flex flex-col items-center gap-1 p-2 ${nav.workspace === 'team' ? 'text-teal-500' : theme.textMuted}`}>
                 <Users size={20} strokeWidth={nav.workspace === 'team' ? 2.5 : 1.5} />
              </button>
              <button onClick={handleNewNote} className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-teal-500/30 transform -translate-y-4">
                 <Plus size={24} strokeWidth={2.5} />
              </button>
              <button onClick={() => updateUi({ isChatOpen: !ui.isChatOpen })} className={`flex flex-col items-center gap-1 p-2 ${ui.isChatOpen ? 'text-teal-500' : theme.textMuted}`}>
                 <MessageSquare size={20} strokeWidth={ui.isChatOpen ? 2.5 : 1.5} />
              </button>
              <button onClick={() => updateUi({ isAccountOpen: true })} className={`flex flex-col items-center gap-1 p-2 ${ui.isAccountOpen ? 'text-teal-500' : theme.textMuted}`}>
                 <img src={currentAvatar} className={`w-6 h-6 rounded-full object-cover ${ui.isAccountOpen ? 'ring-2 ring-teal-500' : ''}`} alt="Avatar" />
              </button>
          </div>
          
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
             teamRole={teamRole}
             clearChat={handleClearChat}
          />
        </>
      )}
    </div>
  );
}