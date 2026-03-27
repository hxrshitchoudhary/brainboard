"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef, startTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Inter } from 'next/font/google';
import { Toaster, toast as sonnerToast } from 'sonner';
import { Command } from 'cmdk';
import { supabase } from '@/lib/supabase'; 
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths, formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';

// --- ICONS ---
import { 
  Search, Plus, ImageIcon, Moon, Sun, Trash2, Loader2, 
  Pin, Sparkles, LayoutGrid, Folder, RefreshCw, Play, Settings, 
  FileText, Globe, Compass, ChevronRight, UploadCloud, 
  List as ListIcon, Calendar as CalendarIcon, ChevronLeft, ChevronRight as ChevronRightIcon, 
  Users, CheckCircle, MessageSquare, AlignJustify, Monitor, CheckSquare, Columns,
  Bell, Circle, RotateCcw, X, Hash, Command as CmdIcon, MinusCircle
} from "lucide-react";

// --- TYPES & STORE ---
import { BentoItem } from "@/app/types";
import { useAppStore } from "@/store/useAppStore";

// --- HOOKS & UTILS ---
import { useDebounce } from "@/hooks/useDebounce";
import { useBrainboardData } from "@/hooks/useBrainboardData";
import { useTeamSpace } from "@/hooks/useTeamSpace";
import { modalSpring, bounceHover, bounceTap, cardVariants, cleanName } from "@/lib/utils";

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

const NOISE_BG = "url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZUZpbHRlciI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOCIgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZUZpbHRlcikiLz48L3N2Zz4=')";

export default function BrainboardBalanced() {
  const [session, setSession] = useState<any>(null);
  const [teamWorkspaceId] = useState<string>("11111111-1111-1111-1111-111111111111"); 

  const { ui, nav, profile, sidebar, media, updateUi, updateNav, updateProfile, updateSidebar, updateMedia } = useAppStore();

  const closeMediaViewer = useCallback(() => {
    updateMedia({ item: null, isScrollMode: false, zoom: 1, speed: 1 });
  }, [updateMedia]);

  const [mentionQuery, setMentionQuery] = useState<{ active: boolean, query: string, target: "note" | "chat" }>({ active: false, query: "", target: "note" });
  const [chatInput, setChatInput] = useState("");
  
  const [folderOrder, setFolderOrder] = useState<string[]>([]);
  const [listOrder, setListOrder] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  
  const [isDark, setIsDark] = useState<boolean>(true); 
  const [editingNote, setEditingNote] = useState<BentoItem | null>(null);
  const [cmdKOpen, setCmdKOpen] = useState(false);
  const [playingYouTubeId, setPlayingYouTubeId] = useState<string | null>(null);
  const [showTrashConfirm, setShowTrashConfirm] = useState(false);
  
  const [selectedItems, setSelectedItems] = useState<Set<string | number>>(new Set());
  const [lastSelected, setLastSelected] = useState<string | number | null>(null);
  const isSelectMode = selectedItems.size > 0;

  const [lasso, setLasso] = useState({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
  const [initialSelection, setInitialSelection] = useState<Set<string | number>>(new Set());

  const [activeIndex, setActiveIndex] = useState(-1);
  
  const cardBoundsRef = useRef<{ id: string, rect: DOMRect }[]>([]);
  const rafRef = useRef<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null); 

  useEffect(() => {
     setSelectedItems(new Set());
     setLastSelected(null);
     setActiveIndex(-1); 
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
    bulkMoveToFolder, bulkMoveToList, bulkMoveToTrash, bulkRestoreFromTrash, bulkHardDelete,
    bulkPinItems, bulkChangeType, recentIds, setRecentIds
  } = useBrainboardData(session, teamWorkspaceId, nav.workspace, profile.displayName, showToast, updateUi);

  const {
    teamMembers, notifications, chatMessages, setChatMessages, teamRole,
    fetchProfilesAndRole, handleUpdateMemberRole, handleMarkAsRead, handleMarkAllAsRead
  } = useTeamSpace(session, teamWorkspaceId, ui.isChatOpen, nav.workspace, showToast, setItems, updateUi, chatScrollRef);

  const activeStateRef = useRef({ category: nav.category, type: nav.categoryType, folders: customFolders, workspace: nav.workspace, userName: profile.displayName, role: teamRole });
  
  useEffect(() => {
    activeStateRef.current = { category: nav.category, type: nav.categoryType, folders: customFolders, workspace: nav.workspace, userName: profile.displayName, role: teamRole };
  }, [nav.category, nav.categoryType, customFolders, nav.workspace, profile.displayName, teamRole]);

  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
      if (isLoading) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting && hasMore) {
              setPage((p: number) => p + 1);
              fetchItems(page + 1, true);
          }
      });
      if (node) observerRef.current.observe(node);
  }, [isLoading, hasMore, fetchItems, page, setPage]);

  const filteredData = useMemo(() => {
    const uniqueMap = new Map();
    for (const item of items) {
        if (!uniqueMap.has(item.id)) {
            uniqueMap.set(item.id, item);
        }
    }
    let result = Array.from(uniqueMap.values());

    if (nav.workspace === "personal") {
        result = result.filter(item => !item.workspace_id); 
    } else {
        result = result.filter(item => item.workspace_id); 
    }

    if (nav.categoryType === "trash") {
        result = result.filter(item => item.is_deleted === true);
    } else {
      result = result.filter(item => !item.is_deleted);
      if (nav.categoryType === "pinned") {
          result = result.filter(item => item.is_pinned);
      } else if (nav.categoryType === "tag") {
          result = result.filter(item => item.tags?.includes(nav.category));
      } else if ((nav.categoryType as any) === "hashtags") {
          result = result.filter(item => item.tags && item.tags.length > 0);
      } else if (nav.categoryType === "type") {
          if (nav.category === "media") result = result.filter(item => item.type === "image" || item.type === "video");
          else if (nav.category === "notes") result = result.filter(item => item.type === "note" || !item.type);
          else if (nav.category === "links") result = result.filter(item => item.type === "link" || item.type === "document" || item.type === "audio");
      } else if (nav.categoryType === "folder") {
          result = result.filter(item => item.sections?.includes(nav.category) || item.section === nav.category);
      } else if (nav.categoryType === "list") {
          result = result.filter(item => item.list_name === nav.category);
      }
    }

    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      result = result.filter(item => `${item.title || ""} ${item.content || ""} ${(item.tags || []).join(" ")} ${item.ai_summary || ""}`.toLowerCase().includes(q));
    }
    
    return result.sort((a, b) => {
      // 1. Optimistic UI first - keeps newly created files pinned at top initially
      const aRecentIdx = recentIds.indexOf(a.id);
      const bRecentIdx = recentIds.indexOf(b.id);
      
      const aIsRecent = aRecentIdx !== -1;
      const bIsRecent = bRecentIdx !== -1;

      if (aIsRecent && !bIsRecent) return -1;
      if (!aIsRecent && bIsRecent) return 1;
      if (aIsRecent && bIsRecent) return aRecentIdx - bRecentIdx;
      
      // 2. Strict chronological fallback - ensures items stay at top when optimistic UI clears
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      
      const validA = isNaN(timeA) ? 0 : timeA;
      const validB = isNaN(timeB) ? 0 : timeB;
      
      return validB - validA;
    });
  }, [debouncedSearchQuery, nav.category, nav.categoryType, items, nav.workspace, recentIds]);

  const groupedData = useMemo(() => {
    if (nav.viewMode === 'grid' || nav.viewMode === 'calendar' || isSelectMode || debouncedSearchQuery) {
        return { "All Items": filteredData };
    }
    const groups: Record<string, BentoItem[]> = {
        "Today": [],
        "Yesterday": [],
        "This Week": [],
        "Older": []
    };
    filteredData.forEach(item => {
        const date = item.created_at ? new Date(item.created_at) : new Date();
        if (isToday(date)) groups["Today"].push(item);
        else if (isYesterday(date)) groups["Yesterday"].push(item);
        else if (isThisWeek(date)) groups["This Week"].push(item);
        else groups["Older"].push(item);
    });
    
    return Object.fromEntries(Object.entries(groups).filter(([_, items]) => items.length > 0));
  }, [filteredData, nav.viewMode, isSelectMode, debouncedSearchQuery]);

  const getEmptyState = () => {
    if (debouncedSearchQuery) return { icon: Search, title: "No results found.", desc: `No matches for "${debouncedSearchQuery}".` };
    if (nav.categoryType === "trash") return { icon: Trash2, title: "Trash is empty.", desc: "Nothing here." };
    if (nav.categoryType === "pinned") return { icon: Pin, title: "No pinned items.", desc: "Pin your favorites for quick access." };
    if (nav.categoryType === "tag") return { icon: Hash, title: `No items for #${nav.category}`, desc: "Drop something here to auto-tag it." };
    if (nav.categoryType === "list") return { icon: ListIcon, title: "List is empty.", desc: "Move items to this list." };
    return { icon: LayoutGrid, title: "A pristine canvas.", desc: "Drop a file anywhere, or press \"Ctrl+V\"." };
  };
  const emptyState = getEmptyState();
  const EmptyIcon = emptyState.icon;

  const smartTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach(item => {
       if (item.tags && !item.is_deleted && (!item.workspace_id === (nav.workspace === "personal"))) {
          item.tags.forEach((t: string) => tags.add(t));
       }
    });
    return Array.from(tags).sort();
  }, [items, nav.workspace]);

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

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; 
    
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a") || target.closest("input") || target.closest("textarea") || target.closest(".lasso-selectable")) {
        return;
    }

    setLasso({ active: true, startX: e.clientX, startY: e.clientY, currentX: e.clientX, currentY: e.clientY });
    setInitialSelection(e.shiftKey ? new Set(selectedItems) : new Set());

    const cards = document.querySelectorAll(".lasso-selectable");
    cardBoundsRef.current = Array.from(cards).map(card => ({
        id: card.getAttribute("data-id")!,
        rect: card.getBoundingClientRect()
    }));
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
        if (!lasso.active) return;
        e.preventDefault(); 

        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        rafRef.current = requestAnimationFrame(() => {
            setLasso(prev => ({ ...prev, currentX: e.clientX, currentY: e.clientY }));

            const minX = Math.min(lasso.startX, e.clientX);
            const maxX = Math.max(lasso.startX, e.clientX);
            const minY = Math.min(lasso.startY, e.clientY);
            const maxY = Math.max(lasso.startY, e.clientY);
            const newSelected = new Set(initialSelection);

            cardBoundsRef.current.forEach(({ id, rect }) => {
                if (minX < rect.right && maxX > rect.left && minY < rect.bottom && maxY > rect.top) {
                    newSelected.add(id);
                }
            });

            setSelectedItems(prev => {
                if (prev.size !== newSelected.size) return newSelected;
                let isEqual = true;
                for (let item of prev) {
                    if (!newSelected.has(item)) { isEqual = false; break; }
                }
                return isEqual ? prev : newSelected;
            });
        });
    };

    const handlePointerUp = () => { 
        if (lasso.active) setLasso(prev => ({ ...prev, active: false })); 
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    
    return () => { 
        window.removeEventListener("pointermove", handlePointerMove); 
        window.removeEventListener("pointerup", handlePointerUp); 
    };
  }, [lasso.active, lasso.startX, lasso.startY, initialSelection]);


  const handleOpenItem = useCallback((item: any) => {
      if (nav.categoryType === "trash") return; 
      
      const isExternalLink = item.url && !item.url.includes("supabase.co");
      
      if (isExternalLink) { 
          window.open(item.url, "_blank", "noopener,noreferrer"); 
      } else if (item.type === "image" || item.type === "video") { 
          updateMedia({ item }); 
      } else { 
          setEditingNote(item); 
      }
  }, [nav.categoryType, updateMedia, setEditingNote]);

  useEffect(() => {
     const down = (e: KeyboardEvent) => {
        if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) || (e.target as HTMLElement).isContentEditable) return;
        
        if (e.key === "k" && (e.metaKey || e.ctrlKey)) { 
            e.preventDefault(); 
            setCmdKOpen((open) => !open); 
            return; 
        }

        if (e.key === "ArrowRight" || e.key === "l") { 
            e.preventDefault(); 
            setActiveIndex(prev => Math.min(prev + 1, filteredData.length - 1)); 
        } else if (e.key === "ArrowLeft" || e.key === "h") { 
            e.preventDefault(); 
            setActiveIndex(prev => Math.max(prev - 1, 0)); 
        } else if (e.key === "ArrowDown" || e.key === "j") { 
            e.preventDefault(); 
            setActiveIndex(prev => Math.min(prev + (nav.viewMode === "grid" ? 4 : 1), filteredData.length - 1)); 
        } else if (e.key === "ArrowUp" || e.key === "k") { 
            e.preventDefault(); 
            setActiveIndex(prev => Math.max(prev - (nav.viewMode === "grid" ? 4 : 1), 0)); 
        } 
        
        else if (e.key === "Enter" && activeIndex >= 0) { 
            e.preventDefault(); 
            const item = filteredData[activeIndex]; 
            if (item) handleOpenItem(item); 
        } else if (e.key === "x" && activeIndex >= 0) { 
            e.preventDefault(); 
            const item = filteredData[activeIndex]; 
            if (item) handleToggleSelect(item.id, false); 
        } else if ((e.key === "Backspace" || e.key === "Delete") && activeIndex >= 0) { 
            e.preventDefault(); 
            const item = filteredData[activeIndex]; 
            if (item && nav.categoryType !== "trash") moveToTrash(item.id); 
        } else if (e.key === "Escape") { 
            e.preventDefault(); 
            setSelectedItems(new Set()); 
            setLastSelected(null); 
            setActiveIndex(-1); 
        }
     };
     document.addEventListener("keydown", down);
     return () => document.removeEventListener("keydown", down);
  }, [filteredData, activeIndex, nav.viewMode, handleOpenItem, handleToggleSelect, moveToTrash, nav.categoryType]);

  useEffect(() => {
      if (activeIndex >= 0) {
          const el = document.getElementById(`card-${filteredData[activeIndex]?.id}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
  }, [activeIndex, filteredData]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("brainboard-theme");
      if (storedTheme) setIsDark(storedTheme === "dark");
      else setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);

      const savedFolders = localStorage.getItem("bb-folder-order");
      const savedLists = localStorage.getItem("bb-list-order");
      if (savedFolders) setFolderOrder(JSON.parse(savedFolders));
      if (savedLists) setListOrder(JSON.parse(savedLists));
    }
  }, []);

  useEffect(() => {
    setFolderOrder(prev => {
        let updated = [...prev]; 
        customFolders.forEach(f => { 
            if (!updated.includes(f)) updated.push(f); 
        });
        updated = updated.filter(f => customFolders.includes(f)); 
        localStorage.setItem("bb-folder-order", JSON.stringify(updated)); 
        return updated;
    });
  }, [customFolders]);

  useEffect(() => {
    setListOrder(prev => {
        let updated = [...prev]; 
        customLists.forEach(l => { 
            if (!updated.includes(l)) updated.push(l); 
        });
        updated = updated.filter(l => customLists.includes(l)); 
        localStorage.setItem("bb-list-order", JSON.stringify(updated)); 
        return updated;
    });
  }, [customLists]);

  const toggleTheme = () => {
    const nextTheme = !isDark; 
    if (typeof window !== "undefined") {
        localStorage.setItem("brainboard-theme", nextTheme ? "dark" : "light");
    }
    setIsDark(nextTheme);
  };

  const theme = {
    bg: isDark ? "bg-[#000000]" : "bg-[#F3F3F1]", 
    text: isDark ? "text-zinc-100" : "text-zinc-900", 
    textMuted: isDark ? "text-zinc-500" : "text-zinc-500", 
    island: isDark ? "bg-[#0E0E10] border-white/[0.08]" : "bg-white border-black/[0.05] shadow-2xl",
    card: isDark ? "bg-[#141416] border-white/[0.04] shadow-[0_8px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]" : "bg-white border-black/[0.04] shadow-[0_4px_20px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.4)]",
    cardHover: isDark ? "hover:bg-[#1A1A1D] hover:border-teal-500/30 hover:shadow-[0_8px_40px_rgba(20,184,166,0.15)]" : "hover:border-teal-500/20 hover:shadow-[0_8px_30px_rgba(20,184,166,0.1)]",
    input: isDark ? "bg-[#1A1A1D] border-white/[0.05] text-white focus:border-teal-500/50 shadow-inner" : "bg-[#F9F9F8] border-black/[0.06] text-zinc-900 focus:border-teal-500/50 shadow-inner",
    btnPrimary: "bg-teal-500 text-white hover:bg-teal-400 shadow-[0_4px_14px_rgba(20,184,166,0.3)] active:scale-95 transition-all duration-200", 
    btnGhost: isDark ? "hover:bg-white/10 text-zinc-300 hover:text-zinc-100 active:scale-95 transition-all duration-200" : "hover:bg-black/5 text-zinc-600 hover:text-zinc-900 active:scale-95 transition-all duration-200"
  };

  const handleSecureLogout = useCallback(async () => {
    updateUi({ isAuthLoading: true, isAccountOpen: false, showLogoutConfirm: false }); 
    setItems([]); 
    await supabase.auth.signOut(); 
    setSession(null);
    if (typeof window !== "undefined") localStorage.clear();
    updateUi({ isAuthLoading: false }); 
  }, [updateUi, setItems]);

  useEffect(() => {
    const verifyUser = async () => {
      const { data: { user } } = await supabase.auth.getUser(); 
      if (user) {
        setSession({ user });
        const dName = user.user_metadata?.display_name || user.email?.split("@")[0] || "";
        const uName = user.user_metadata?.username || "";
        
        updateProfile({ 
            displayName: dName, 
            username: uName, 
            usernameChanged: user.user_metadata?.username_changed || false 
        });
        
        try { 
            await supabase.from("profiles").upsert({ 
                id: user.id, 
                display_name: dName, 
                username: uName, 
                avatar_url: user.user_metadata?.avatar_url || `https://api.dicebear.com/9.x/shapes/svg?seed=${user.email}`, 
                updated_at: new Date().toISOString() 
            }, { onConflict: "id" }); 
        } catch(e) {}
        
        fetchProfilesAndRole(user);
      } else { 
          setSession(null); 
          setItems([]); 
      }
      updateUi({ isAuthLoading: false });
    };
    verifyUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") { 
          setSession(null); 
          setItems([]); 
          updateUi({ isAccountOpen: false, showOnboarding: false, showLogoutConfirm: false }); 
      } else if (session?.user) { 
        setSession(session); 
        updateProfile({ 
            displayName: session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "", 
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

    let cleanUsername = profile.username.trim().toLowerCase();
    if (cleanUsername.startsWith("@")) {
        cleanUsername = cleanUsername.substring(1);
    }
    cleanUsername = cleanUsername.split("").filter(c => (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c === '_').join("");

    if (!cleanUsername || !profile.displayName.trim()) {
       updateProfile({ error: "Name and Username are required.", isSaving: false });
       return;
    }

    const currentUsername = (session.user.user_metadata?.username || "").toLowerCase();
    const isUsernameDifferent = cleanUsername !== currentUsername;

    if (isUsernameDifferent && session.user.user_metadata?.username_changed) {
       updateProfile({ error: "Username can only be changed once.", isSaving: false });
       return;
    }

    if (isUsernameDifferent) {
      const { data: existingUsers } = await supabase.from("profiles").select("id").eq("username", cleanUsername);
      if (existingUsers && existingUsers.length > 0) {
        const isMe = existingUsers.every(u => u.id === session.user.id);
        if (!isMe) {
          updateProfile({ error: "This username is already taken!", isSaving: false });
          return;
        }
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
        await supabase.from("profiles").upsert({ 
           id: session.user.id, 
           display_name: profile.displayName, 
           username: cleanUsername, 
           bio: profile.bio, 
           updated_at: new Date().toISOString() 
        }); 
        
        if (ui.showOnboarding) {
            await supabase.from("workspace_members").upsert({ 
                workspace_id: teamWorkspaceId, 
                user_id: session.user.id, 
                role: "editor" 
            }, { onConflict: "workspace_id, user_id" });
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
    const fileName = `avatar-${session.user.id}-${Date.now()}.${file.name.split(".").pop()}`;
    try {
       await supabase.storage.from("media").upload(fileName, file);
       const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(fileName);
       await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
       await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", session.user.id);
       setSession({ ...session, user: { ...session.user, user_metadata: { ...session.user.user_metadata, avatar_url: publicUrl } } });
       fetchProfilesAndRole(session.user);
       showToast("Profile picture updated!");
    } catch (err) {
       showToast("Failed to upload avatar", true);
    }
    updateUi({ isUploading: false });
  };

  const handleGoogleLogin = async () => {
    if (typeof window === "undefined") return;
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  };

  const handleChatTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setChatInput(val);
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursor);
    
    const lastAtIdx = textBeforeCursor.lastIndexOf("@");
    if (lastAtIdx !== -1 && nav.workspace === "team") {
       const possibleQuery = textBeforeCursor.substring(lastAtIdx + 1);
       if (!possibleQuery.includes(" ")) {
           setMentionQuery({ active: true, query: possibleQuery, target: "chat" });
       } else {
           setMentionQuery({ active: false, query: "", target: "chat" });
       }
    } else {
       setMentionQuery({ active: false, query: "", target: "chat" });
    }
  };

  const insertChatMention = (name: string) => {
    const currentText = chatInput;
    if (!chatInputRef.current) return;
    const cursor = chatInputRef.current.selectionStart;
    const textBeforeCursor = currentText.substring(0, cursor);
    const textAfterCursor = currentText.substring(cursor);
    
    const lastAtIdx = textBeforeCursor.lastIndexOf("@");
    const textWithoutQuery = lastAtIdx !== -1 ? textBeforeCursor.substring(0, lastAtIdx) : textBeforeCursor;
    const newText = textWithoutQuery + `@${name.split(" ").join("")} ` + textAfterCursor;
    
    setChatInput(newText);
    setMentionQuery({ active: false, query: "", target: "chat" });
    setTimeout(() => { if(chatInputRef.current) chatInputRef.current.focus(); }, 10);
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !session?.user?.id) return;
    const currentAvatar = session?.user?.user_metadata?.avatar_url || `https://api.dicebear.com/9.x/shapes/svg?seed=${session?.user?.email || "default"}`;
    const payload = {
       workspace_id: teamWorkspaceId,
       user_id: session.user.id,
       creator_name: profile.displayName,
       creator_avatar: currentAvatar,
       text: chatInput.trim(),
    };
    setChatInput("");
    setMentionQuery({ active: false, query: "", target: "chat" });
    try { 
        await supabase.from("team_messages").insert([payload]); 
    } catch(e) {
        console.error(e);
        showToast("Failed to send message", true);
    }
  };

  const handleClearChat = async () => {
    if (teamRole !== "admin") return;
    if (!window.confirm("Are you sure you want to completely clear the team chat?")) return;
    setChatMessages([]);
    await supabase.from("team_messages").delete().eq("workspace_id", teamWorkspaceId);
    showToast("Team chat cleared.");
  };

  const canModifyStructure = nav.workspace === "personal" || teamRole !== "viewer";
  const canCreate = nav.workspace === "personal" || teamRole !== "viewer";

  const handleNewNote = () => {
    if (!session?.user?.id) return;
    const newItem: BentoItem = {
      id: `temp-${Date.now()}`, 
      user_id: session.user.id, 
      workspace_id: nav.workspace === "team" ? teamWorkspaceId : undefined,
      creator: profile.displayName, 
      type: "note", 
      title: "", 
      content: "",
      sections: nav.categoryType === "folder" ? [nav.category] : ["Inbox"], 
      list_name: nav.categoryType === "list" ? nav.category : undefined,
      scheduled_for: nav.viewMode === "calendar" ? nav.currentDate.toISOString() : undefined,
      created_at: new Date().toISOString() 
    };
    setEditingNote(newItem);
  };

  const handleNewChecklist = () => {
    if (!session?.user?.id) return;
    const newItem: BentoItem = {
      id: `temp-${Date.now()}`, 
      user_id: session.user.id, 
      workspace_id: nav.workspace === "team" ? teamWorkspaceId : undefined,
      creator: profile.displayName, 
      type: "note", 
      title: "", 
      is_checklist: true, 
      checklist_items: [],
      sections: nav.categoryType === "folder" ? [nav.category] : ["Inbox"], 
      list_name: nav.categoryType === "list" ? nav.category : undefined,
      scheduled_for: nav.viewMode === "calendar" ? nav.currentDate.toISOString() : undefined,
      created_at: new Date().toISOString() 
    };
    setEditingNote(newItem);
  };

  const handleTogglePin = useCallback(async (id: string | number, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setItems((prev) => prev.map(i => i.id === id ? { ...i, is_pinned: newStatus } : i));
    if (!String(id).startsWith('temp-')) {
        await supabase.from('assets').update({ is_pinned: newStatus }).eq('id', id);
    }
    showToast(newStatus ? "Item pinned" : "Item unpinned");
  }, [setItems, showToast]);

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

  const handleRemoveFromContext = useCallback((itemId: string | number) => {
      const strId = String(itemId);
      const item = items.find(i => String(i.id) === strId);
      if (!item) return;

      if (nav.categoryType === 'folder') {
          const newSections = (item.sections || []).filter((s: string) => s !== nav.category);
          setItems(prev => prev.map(i => String(i.id) === strId ? { ...i, sections: newSections.length > 0 ? newSections : undefined, section: undefined } : i));
          if (!strId.startsWith('temp-')) {
              supabase.from('assets').update({ sections: newSections.length > 0 ? newSections : null, section: null }).eq('id', itemId).then(({error}) => {
                  if (error) {
                      supabase.from('assets').update({ sections: newSections.length > 0 ? newSections : null }).eq('id', itemId).then();
                  }
              });
          }
          showToast(`Removed from ${nav.category}`);
      } else if (nav.categoryType === 'list') {
          setItems(prev => prev.map(i => String(i.id) === strId ? { ...i, list_name: undefined } : i));
          if (!strId.startsWith('temp-')) {
              supabase.from('assets').update({ list_name: null }).eq('id', itemId).then();
          }
          showToast(`Removed from ${nav.category}`);
      } else if (nav.categoryType === 'pinned') {
          setItems(prev => prev.map(i => String(i.id) === strId ? { ...i, is_pinned: false } : i));
          if (!strId.startsWith('temp-')) {
              supabase.from('assets').update({ is_pinned: false }).eq('id', itemId).then();
          }
          showToast(`Unpinned item`);
      } else if (nav.categoryType === 'type') {
          setItems(prev => prev.map(i => String(i.id) === strId ? { ...i, type: 'uncategorized' } : i));
          if (!strId.startsWith('temp-')) {
              supabase.from('assets').update({ type: 'uncategorized' }).eq('id', itemId).then();
          }
          showToast(`Removed from ${nav.category}`);
      }
  }, [items, nav.categoryType, nav.category, setItems, showToast]);

  const processAndUploadFiles = async (files: File[], targetFolderOverride?: string) => {
    if (nav.workspace === "team" && teamRole === "viewer") return showToast("Permission denied.", true);
    if (!session?.user?.id || files.length === 0) return;

    updateUi({ isUploading: true });

    const targetFolder = targetFolderOverride || (nav.categoryType === "folder" ? nav.category : "Inbox");
    const targetList = targetFolderOverride ? null : (nav.categoryType === "list" ? nav.category : null);

    for (const file of files) {
        let type = "document";
        if (file.type.startsWith("image/")) type = "image";
        else if (file.type.startsWith("video/")) type = "video";
        else if (file.type.startsWith("audio/")) type = "audio";

        const fileName = `${Math.random()}.${file.name.split(".").pop()}`;
        
        try {
            const { error: storageError } = await supabase.storage.from("media").upload(fileName, file);
            if (storageError) throw storageError;

            const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(fileName);
            
            await insertItem({
              user_id: session.user.id, 
              workspace_id: nav.workspace === "team" ? teamWorkspaceId : undefined,
              creator: activeStateRef.current.userName, 
              type: type, 
              title: file.name, 
              thumbnail_url: publicUrl, 
              url: type !== "image" ? publicUrl : undefined, 
              sections: [targetFolder], 
              list_name: targetList || undefined,
              created_at: new Date().toISOString() 
            });
            showToast(`File added to ${targetFolder}!`);
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
    if (e.dataTransfer.types.includes("Files")) {
       updateUi({ isDragging: true }); 
    }
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    if (!mainContentRef.current?.contains(e.relatedTarget as Node)) {
        updateUi({ isDragging: false });
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    updateUi({ isDragging: false });
    if (e.dataTransfer.types.includes("Files") && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
       processAndUploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      
      const text = e.clipboardData?.getData("text");
      if (!text || !session?.user?.id) return;

      const { category, type: catType, folders, workspace, userName, role } = activeStateRef.current;
      if (workspace === "team" && role === "viewer") return; 

      let isYouTube = false;
      let youtubeId = null;
      if (text.includes("youtube.com") || text.includes("youtu.be")) {
         try {
             const urlObj = new URL(text);
             isYouTube = true;
             if (urlObj.hostname.includes("youtube.com")) {
                 youtubeId = urlObj.searchParams.get("v") || urlObj.pathname.split("/").pop();
             } else {
                 youtubeId = urlObj.pathname.slice(1);
             }
         } catch(err) {}
      }

      const isReel = text.includes("instagram.com/reel/") || text.includes("instagram.com/p/") || text.includes("instagram.com/tv/");
      const isLink = text.startsWith("http://") || text.startsWith("https://");
      
      if (isReel || isYouTube || isLink) {
         e.preventDefault();
         updateUi({ isAILoading: true });
         showToast(isReel ? "Capturing Reel..." : isYouTube ? "Capturing YouTube..." : "Capturing link...");
         
         const tempId = `temp-${Date.now()}`;
         const localCreationTime = new Date().toISOString(); 
         
         // 1. Assign `clientKey` to prevent Framer Motion from destroying/respawning the component when DB updates it
         let newItem: BentoItem = {
             id: tempId, 
             clientKey: tempId, 
             user_id: session.user.id, 
             workspace_id: workspace === "team" ? teamWorkspaceId : undefined,
             creator: userName, 
             type: isYouTube || isReel ? "social_video" : "link", 
             url: text, 
             title: isReel ? "Fetching Reel..." : isYouTube ? "Fetching YouTube..." : "Fetching Link...",
             ai_summary: undefined, 
             sections: catType === "folder" ? [category, isReel ? "Instagram" : isYouTube ? "YouTube" : "Links"] : ["Inbox", isReel ? "Instagram" : isYouTube ? "YouTube" : "Links"],
             list_name: catType === "list" ? category : undefined, 
             created_at: localCreationTime 
         };

         setRecentIds(prev => [tempId, ...prev]);
         setItems(prev => [newItem, ...prev]);

         if (isReel && !folders.includes("Instagram")) {
             setCustomFolders(p => [...new Set([...p, "Instagram"])]);
         }
         if (isYouTube && !folders.includes("YouTube")) {
             setCustomFolders(p => [...new Set([...p, "YouTube"])]);
         }

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
                 user_id: session.user.id, 
                 workspace_id: workspace === "team" ? teamWorkspaceId : undefined, 
                 creator: userName,
                 type: isYouTube || isReel ? "social_video" : "link", 
                 url: text, 
                 title: fetchedTitle, 
                 content: fetchedDescription || undefined, 
                 thumbnail_url: fetchedThumbnail || undefined,
                 sections: newItem.sections, 
                 list_name: newItem.list_name || undefined,
                 created_at: localCreationTime 
             };
             
             Object.keys(dbPayload).forEach(key => { 
                 if (dbPayload[key] === null || dbPayload[key] === undefined) {
                     delete dbPayload[key]; 
                 }
             });

             const { data: dbData, error } = await supabase.from("assets").insert([dbPayload]).select().single();
             
             if (dbData) {
                 // 2. Transfer the `clientKey` to the Database object so the React Key NEVER changes on screen
                 setItems(prev => prev.map(i => i.id === tempId ? { ...dbData, clientKey: tempId } : i));
                 setRecentIds(prev => prev.map(id => id === tempId ? dbData.id : id));
                 showToast(isReel ? "Reel captured!" : isYouTube ? "YouTube saved!" : "Link saved!");
             } else {
                 setItems(prev => prev.filter(i => i.id !== tempId));
                 setRecentIds(prev => prev.filter(id => id !== tempId));
                 showToast("Failed to save item.", true);
             }
         } catch (err) {
             const fallbackPayload = {
                 user_id: session.user.id, 
                 workspace_id: workspace === "team" ? teamWorkspaceId : undefined,
                 creator: userName, 
                 type: isYouTube || isReel ? "social_video" : "link", 
                 url: text, 
                 title: "Saved Link", 
                 sections: newItem.sections,
                 thumbnail_url: isYouTube && youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : undefined,
                 created_at: localCreationTime 
             };
             const { data: dbData } = await supabase.from("assets").insert([fallbackPayload]).select().single();
             if (dbData) {
                 // Transfer `clientKey` on fallback as well
                 setItems(prev => prev.map(i => i.id === tempId ? { ...dbData, clientKey: tempId } : i));
                 setRecentIds(prev => prev.map(id => id === tempId ? dbData.id : id));
             } else {
                 setItems(prev => prev.filter(i => i.id !== tempId));
                 setRecentIds(prev => prev.filter(id => id !== tempId));
             }
         } finally { 
             updateUi({ isAILoading: false }); 
         }
      }
    };
    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [session, teamWorkspaceId, updateUi, setItems, setRecentIds, setCustomFolders, showToast]);

  const monthStart = startOfMonth(nav.currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const currentAvatar = session?.user?.user_metadata?.avatar_url || `https://api.dicebear.com/9.x/shapes/svg?seed=${session?.user?.email || "default"}`;
  const userDisplayName = cleanName(session?.user?.user_metadata?.display_name || session?.user?.email);
  const userHandle = session?.user?.user_metadata?.username ? `@${session.user.user_metadata.username}` : cleanName(session?.user?.email);

  const getCategoryTitle = () => {
    if (nav.categoryType === "trash") return "Trash";
    if (nav.categoryType === "pinned") return "Pinned";
    if ((nav.categoryType as any) === "hashtags") return "Hashtags";
    if (nav.categoryType === "tag") return `#${nav.category}`;
    if (nav.category === "All") return "Everything";
    return nav.category.charAt(0).toUpperCase() + nav.category.slice(1);
  };

  // -------------------------------------------------------------
  // THE NEW, ULTRA-PREMIUM SAAS LANDING PAGE (Unauthenticated View)
  // -------------------------------------------------------------
  if (!session && !ui.isAuthLoading) {
      return (
        <div className={`relative min-h-screen w-full bg-[#050505] text-white overflow-hidden selection:bg-teal-500/30 flex flex-col ${inter.className}`}>
          
          {/* Animated Background Gradients & Grid */}
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-600/20 blur-[120px] pointer-events-none mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-600/20 blur-[120px] pointer-events-none mix-blend-screen animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
          
          {/* Beautifully faded masking on the background grid */}
          <div 
             className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ 
                 backgroundImage: "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)", 
                 backgroundSize: "40px 40px",
                 WebkitMaskImage: "radial-gradient(circle at center, black, transparent 80%)",
                 maskImage: "radial-gradient(circle at center, black, transparent 80%)"
             }} 
          />

          {/* Navigation */}
          <nav className="relative z-50 w-full flex justify-between items-center px-6 md:px-12 py-6">
            <div className="font-black text-xl tracking-tighter flex items-center gap-3">
              <div className="w-8 h-8 bg-linear-to-br from-teal-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Sparkles size={16} className="text-black" />
              </div>
              brainboard.
            </div>
            <button onClick={handleGoogleLogin} className="text-sm font-bold text-zinc-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-full border border-white/10">
              Sign In
            </button>
          </nav>

          {/* Main Hero */}
          <main className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-6 w-full max-w-6xl mx-auto pb-20">
            
            {/* Floating Mockup Cards (Background) */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex justify-center items-center opacity-30 md:opacity-60">
               {/* Card 1 - Top Left */}
               <motion.div animate={{ y: [0, -20, 0], rotate: [-2, 0, -2] }} transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }} className="absolute top-[10%] left-[5%] md:left-[10%] w-56 h-72 bg-[#111113] border border-white/10 rounded-3xl shadow-2xl p-4 hidden md:flex flex-col gap-3">
                  <div className="w-full h-32 bg-linear-to-br from-teal-500/20 to-emerald-500/5 rounded-xl border border-white/5"></div>
                  <div className="w-3/4 h-3 bg-white/20 rounded-full mt-2"></div>
                  <div className="w-1/2 h-3 bg-white/10 rounded-full"></div>
                  <div className="flex gap-2 mt-auto">
                     <div className="w-6 h-6 rounded-full bg-white/10"></div>
                     <div className="w-16 h-6 rounded-full bg-white/5"></div>
                  </div>
               </motion.div>
               {/* Card 2 - Bottom Right */}
               <motion.div animate={{ y: [0, 20, 0], rotate: [2, 4, 2] }} transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }} className="absolute bottom-[15%] right-[5%] md:right-[10%] w-64 h-56 bg-[#111113] border border-white/10 rounded-3xl shadow-2xl p-4 hidden md:flex flex-col gap-3">
                  <div className="w-full h-10 bg-white/5 rounded-xl border border-white/5 flex items-center px-3 gap-2">
                     <div className="w-4 h-4 rounded-full bg-emerald-500/40"></div>
                     <div className="w-1/2 h-2 bg-white/20 rounded-full"></div>
                  </div>
                  <div className="w-full h-3 bg-white/20 rounded-full mt-2"></div>
                  <div className="w-4/5 h-3 bg-white/10 rounded-full"></div>
                  <div className="w-full h-3 bg-white/10 rounded-full"></div>
                  <div className="mt-auto flex justify-between items-center">
                      <div className="w-12 h-4 bg-teal-500/20 rounded-full border border-teal-500/30"></div>
                      <div className="w-4 h-4 rounded-full bg-white/10"></div>
                  </div>
               </motion.div>
               {/* Card 3 - Top Right */}
               <motion.div animate={{ y: [0, -15, 0], rotate: [5, 2, 5] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }} className="absolute top-[20%] right-[15%] w-40 h-40 bg-[#111113] border border-white/10 rounded-3xl shadow-2xl p-5 hidden lg:flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                      <ImageIcon size={20} className="text-blue-400" />
                  </div>
                  <div className="w-2/3 h-2 bg-white/20 rounded-full mt-2"></div>
                  <div className="w-1/2 h-2 bg-white/10 rounded-full"></div>
               </motion.div>
            </div>

            {/* Content Foreground */}
            <div className="relative z-10 flex flex-col items-center -mt-10">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs font-bold text-teal-400 tracking-wide mb-8 shadow-[0_0_20px_rgba(20,184,166,0.2)]"
                >
                  <Sparkles size={14} /> Meet Brainboard 2.0
                </motion.div>

                <motion.h1 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }} 
                    className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[1.1] md:leading-[1.05] drop-shadow-2xl max-w-4xl"
                >
                    <span className="text-transparent bg-clip-text bg-linear-to-b from-white via-white to-white/60">Your </span>
                    <span className="text-transparent bg-clip-text bg-linear-to-r from-teal-400 via-cyan-400 to-emerald-400">second brain</span>
                    <span className="text-transparent bg-clip-text bg-linear-to-b from-white via-white to-white/60">, <br className="hidden md:block"/> beautifully curated.</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }} 
                  className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-12 leading-relaxed"
                >
                  The ultimate visual workspace for your chaotic thoughts. Save links, drop images, write notes, and connect ideas at the speed of thought.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }} 
                  className="flex flex-col sm:flex-row items-center gap-4"
                >
                  <button 
                      onClick={handleGoogleLogin} 
                      className="group relative flex items-center justify-center gap-3 bg-white text-black px-8 py-4 rounded-full text-base font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(20,184,166,0.3)] hover:shadow-[0_0_60px_rgba(20,184,166,0.5)] overflow-hidden"
                  >
                      {/* Shine effect on hover */}
                      <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-linear-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
                      
                      <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Continue with Google
                  </button>
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-sm font-bold text-zinc-400 hover:text-white transition-colors px-6 py-4">
                     Learn More
                  </a>
                </motion.div>

                <motion.div
                   initial={{ opacity: 0 }} 
                   animate={{ opacity: 1 }} 
                   transition={{ duration: 1, delay: 0.8 }} 
                   className="mt-16 flex flex-wrap justify-center items-center gap-8 text-zinc-500 text-sm font-medium pt-10 w-full max-w-3xl"
                >
                   <div className="flex flex-col items-center gap-2"><LayoutGrid size={24} className="text-teal-500/70"/> <span className="text-zinc-400">Masonry Canvas</span></div>
                   <div className="flex flex-col items-center gap-2"><Users size={24} className="text-emerald-500/70"/> <span className="text-zinc-400">Team Collab</span></div>
                   <div className="flex flex-col items-center gap-2"><Globe size={24} className="text-cyan-500/70"/> <span className="text-zinc-400">Auto-capture</span></div>
                   <div className="flex flex-col items-center gap-2"><Hash size={24} className="text-indigo-500/70"/> <span className="text-zinc-400">Smart Tags</span></div>
                </motion.div>
            </div>
          </main>
        </div>
      );
  }

  if (ui.isAuthLoading) {
      return (
          <div className={`flex h-screen w-full items-center justify-center ${theme.bg}`}>
              <Loader2 strokeWidth={1.5} className={`animate-spin ${theme.textMuted}`} />
          </div>
      );
  }

  // -------------------------------------------------------------
  // MAIN APP VIEW (Authenticated)
  // -------------------------------------------------------------
  return (
    <div className={`flex h-screen w-full p-0 md:p-3 lg:p-4 gap-4 relative overflow-hidden ${theme.bg} ${theme.text} selection:bg-teal-500/30 ${inter.className}`}>
      
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.02] mix-blend-overlay" style={{ backgroundImage: NOISE_BG }}></div>

      <Toaster theme={isDark ? "dark" : "light"} position="bottom-right" style={{ zIndex: 99999 }} />
      
      <AnimatePresence>
         {ui.isSaving && (
            <motion.div 
               initial={{ y: 20, opacity: 0 }} 
               animate={{ y: 0, opacity: 1 }} 
               exit={{ y: 20, opacity: 0 }} 
               style={{ zIndex: 9999 }}
               className={`fixed bottom-24 md:bottom-10 left-1/2 md:left-10 -translate-x-1/2 md:translate-x-0 flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl border backdrop-blur-3xl ${isDark ? "bg-[#0E0E12]/90 border-white/10" : "bg-white/90 border-stone-200"}`}
            >
               <span className="flex items-center gap-2 text-[10px] font-bold text-teal-500 uppercase tracking-widest">
                   <Loader2 size={14} strokeWidth={2} className="animate-spin"/> Saving
               </span>
            </motion.div>
         )}
      </AnimatePresence>

      <AnimatePresence>
         {showTrashConfirm && (
            <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowTrashConfirm(false)}>
               <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.95 }} 
                  transition={{ duration: 0.15 }} 
                  className={`w-full max-w-sm rounded-2xl shadow-2xl border p-6 ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`} 
                  onClick={e => e.stopPropagation()}
               >
                  <h3 className="text-xl font-bold mb-2 tracking-tight">Empty Trash?</h3>
                  <p className={`text-sm mb-6 ${theme.textMuted}`}>This action cannot be undone. All items in the trash will be permanently deleted.</p>
                  <div className="flex gap-3 justify-end">
                     <button onClick={() => setShowTrashConfirm(false)} className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${isDark ? "bg-zinc-800 hover:bg-zinc-700 text-white" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900"}`}>Cancel</button>
                     <button onClick={() => { emptyTrash(); setShowTrashConfirm(false); }} className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors">Empty Trash</button>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      <div style={{ zIndex: 99999 }} className="flex md:hidden fixed inset-0 bg-[#000000] text-white flex-col items-center justify-center p-8 text-center selection:bg-teal-500/30">
         <Monitor size={80} className="mb-8 text-teal-400 opacity-90" strokeWidth={1} />
         <h2 className="text-4xl font-black tracking-tight mb-4">Desktop Only</h2>
         <p className="text-white/60 text-lg max-w-sm leading-relaxed">
             Brainboard is a powerful, expansive canvas designed for larger screens. Switch to a computer for the optimal experience.
         </p>
      </div>

      <Command.Dialog 
          open={cmdKOpen} 
          onOpenChange={setCmdKOpen} 
          label="Global Command Menu" 
          className={`fixed top-[20%] left-1/2 transform -translate-x-1/2 w-[90%] md:w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden backdrop-blur-3xl border ${isDark ? "bg-[#0E0E12]/80 border-white/10" : "bg-white/80 border-black/5"}`} 
          style={{ zIndex: 9999 }}
      >
         <Command.Input placeholder="Type a command or search..." className="w-full p-6 bg-transparent outline-none text-xl font-medium text-zinc-900 dark:text-zinc-100 border-b border-black/5 dark:border-white/5" />
         <Command.List className="p-3 max-h-[50vh] overflow-y-auto custom-scrollbar">
            <Command.Empty className="p-6 text-center text-sm font-medium text-stone-500">No results found.</Command.Empty>
            <Command.Group heading="General Actions" className="text-[10px] font-bold uppercase tracking-widest text-stone-400 p-2">
               <Command.Item onSelect={() => { handleNewNote(); setCmdKOpen(false); }} className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 text-sm font-bold text-stone-800 dark:text-zinc-100 mb-1 transition-colors">
                   <Plus size={18} /> Create New Note
               </Command.Item>
               <Command.Item onSelect={() => { handleNewChecklist(); setCmdKOpen(false); }} className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 text-sm font-bold text-stone-800 dark:text-zinc-100 mb-1 transition-colors">
                   <CheckSquare size={18} /> Create New Checklist
               </Command.Item>
               <Command.Item onSelect={() => { fileInputRef.current?.click(); setCmdKOpen(false); }} className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 text-sm font-bold text-stone-800 dark:text-zinc-100 mb-1 transition-colors">
                   <UploadCloud size={18} /> Upload File / Media
               </Command.Item>
            </Command.Group>
            <Command.Group heading="Navigation" className="text-[10px] font-bold uppercase tracking-widest text-stone-400 p-2 mt-4">
               <Command.Item onSelect={() => { updateNav({ workspace: "personal" }); setCmdKOpen(false); }} className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 text-sm font-bold text-stone-800 dark:text-zinc-100 mb-1 transition-colors">
                   <Users size={18} /> Switch to Personal Workspace
               </Command.Item>
               <Command.Item onSelect={() => { updateNav({ workspace: "team" }); setCmdKOpen(false); }} className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 text-sm font-bold text-stone-800 dark:text-zinc-100 mb-1 transition-colors">
                   <Users size={18} /> Switch to Team Workspace
               </Command.Item>
               <Command.Item onSelect={() => { updateNav({ categoryType: "trash", category: "All" }); setCmdKOpen(false); }} className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 text-sm font-bold text-stone-800 dark:text-zinc-100 mb-1 transition-colors">
                   <Trash2 size={18} /> Go to Trash
               </Command.Item>
               <Command.Item onSelect={() => { toggleTheme(); setCmdKOpen(false); }} className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 text-sm font-bold text-stone-800 dark:text-zinc-100 mb-1 transition-colors">
                   {isDark ? <Sun size={18} /> : <Moon size={18} />} Toggle Theme
               </Command.Item>
            </Command.Group>
         </Command.List>
      </Command.Dialog>

      <input type="file" ref={fileInputRef} onChange={handleMediaUpload} accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.txt" multiple className="hidden" />
      <input type="file" ref={avatarInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />

      <OnboardingModal ui={ui} profile={profile} updateProfile={updateProfile} handleUpdateProfile={handleUpdateProfile} theme={theme} isDark={isDark} />
      <LogoutConfirmModal ui={ui} updateUi={updateUi} handleSecureLogout={handleSecureLogout} theme={theme} isDark={isDark} />
      
      <SettingsModal 
          ui={ui} 
          updateUi={updateUi} 
          profile={profile} 
          updateProfile={updateProfile} 
          handleUpdateProfile={handleUpdateProfile} 
          currentAvatar={currentAvatar} 
          userDisplayName={userDisplayName} 
          userHandle={userHandle} 
          avatarInputRef={avatarInputRef} 
          teamRole={teamRole} 
          teamMembers={teamMembers} 
          session={session} 
          handleUpdateMemberRole={handleUpdateMemberRole} 
          theme={theme} 
          isDark={isDark} 
      />
      
      <MediaViewerModal 
          media={media} 
          updateMedia={updateMedia} 
          closeMediaViewer={closeMediaViewer} 
          session={session} 
          teamRole={teamRole} 
          nav={nav} 
          setEditingNote={setEditingNote} 
          profile={profile} 
          teamWorkspaceId={teamWorkspaceId} 
          moveToTrash={moveToTrash} 
          toggleItemReaction={toggleItemReaction} 
          theme={theme} 
          isDark={isDark} 
          items={items} 
      />
      
      <NoteEditorModal 
          editingNote={editingNote} 
          updateLocalNoteState={updateLocalNoteState} 
          handleCloseAndSave={handleCloseAndSave} 
          moveToTrash={moveToTrash} 
          ui={ui} 
          updateUi={updateUi} 
          theme={theme} 
          isDark={isDark} 
          teamMembers={teamMembers} 
          mentionQuery={mentionQuery} 
          setMentionQuery={setMentionQuery} 
          nav={nav} 
          session={session} 
          teamRole={teamRole} 
          showToast={showToast} 
          toggleItemReaction={toggleItemReaction} 
          items={items} 
          profile={profile} 
      />

      <AnimatePresence>
        {playingYouTubeId && (
           <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               transition={{ duration: 0.15 }} 
               className="fixed inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl p-4 md:p-10" 
               style={{ zIndex: 99999 }} 
               onClick={() => setPlayingYouTubeId(null)}
           >
             <button onClick={() => setPlayingYouTubeId(null)} className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                 <X size={24} />
             </button>
             <motion.div 
                 initial={{ scale: 0.95, y: 20 }} 
                 animate={{ scale: 1, y: 0 }} 
                 transition={{ duration: 0.2, ease: "easeOut" }} 
                 className="w-full max-w-6xl aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black border border-white/10" 
                 onClick={e => e.stopPropagation()}
             >
                <iframe src={`https://www.youtube.com/embed/${playingYouTubeId}?autoplay=1&rel=0`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
             </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      <aside className={`hidden md:flex w-64 h-full shrink-0 flex-col relative z-50 rounded-3xl border shadow-xl ${theme.island}`}>
         <div className="p-6 pb-2 pt-8 flex justify-between items-center">
             <h1 className="font-bold text-2xl tracking-tighter flex items-center gap-2 drop-shadow-sm">
              <Sparkles className="text-teal-500" size={22} strokeWidth={1.5} /> brainboard
            </h1>
         </div>

         <div className="px-4 mb-4 mt-6">
            <div className={`relative flex items-center p-1 rounded-xl shadow-inner ${isDark ? "bg-[#000000] border border-white/5" : "bg-black/5 border border-black/5"}`}>
               <motion.div 
                   layoutId="workspace-pill-desktop" 
                   className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg shadow-sm border ${isDark ? "bg-zinc-800 border-white/5" : "bg-white border-[#e8e4dc]"}`} 
                   initial={false} 
                   animate={{ left: nav.workspace === "personal" ? "4px" : "calc(50%)" }} 
                   transition={{ duration: 0.2, ease: "easeOut" }} 
               />
               <button onClick={() => startTransition(() => { updateNav({ workspace: "personal", viewMode: "grid" }); updateUi({ isChatOpen: false }); fetchItems(1, false); })} className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-colors ${nav.workspace === "personal" ? "text-teal-600 dark:text-teal-400" : theme.textMuted}`}>
                   Personal
               </button>
               <button onClick={() => startTransition(() => { updateNav({ workspace: "team", viewMode: "grid" }); fetchItems(1, false); })} className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-colors ${nav.workspace === "team" ? "text-teal-600 dark:text-teal-400" : theme.textMuted}`}>
                   Team
               </button>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar space-y-8 flex flex-col">
            <div>
               <h4 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMuted} px-3 mb-2 opacity-70`}>Overview</h4>
               <div className="space-y-0.5">
                 <SidebarItem 
                     icon={<Compass size={16} strokeWidth={1.5}/>} 
                     label="Everything" 
                     active={nav.categoryType === "all"} 
                     onClick={() => updateNav({ categoryType: "all", category: "All" })} 
                     theme={theme} 
                     isDark={isDark} 
                     onDropFiles={(files: File[]) => processAndUploadFiles(files, "Inbox")} 
                 />
                 <SidebarItem 
                     icon={<Pin size={16} strokeWidth={1.5}/>} 
                     label="Pinned" 
                     active={nav.categoryType === "pinned"} 
                     onClick={() => updateNav({ categoryType: "pinned", category: "All" })} 
                     theme={theme} 
                     isDark={isDark} 
                     onDropItem={(id: string) => bulkPinItems([id])}
                     onDropItems={(ids: string[]) => { bulkPinItems(ids); setSelectedItems(new Set()); }}
                     onDropFiles={(files: File[]) => processAndUploadFiles(files, "Inbox")}
                 />
               </div>
            </div>

            <div>
               <h4 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMuted} px-3 mb-2 opacity-70`}>Content</h4>
               <div className="space-y-0.5">
                 <SidebarItem 
                     icon={<FileText size={16} strokeWidth={1.5}/>} 
                     label="Notes" 
                     active={nav.categoryType === "type" && nav.category === "notes"} 
                     onClick={() => updateNav({ categoryType: "type", category: "notes" })} 
                     theme={theme} 
                     isDark={isDark} 
                     onDropItem={(id: string) => bulkChangeType([id], 'note')}
                     onDropItems={(ids: string[]) => { bulkChangeType(ids, 'note'); setSelectedItems(new Set()); }}
                     onDropFiles={(files: File[]) => processAndUploadFiles(files, "Inbox")}
                 />
                 <SidebarItem 
                     icon={<Globe size={16} strokeWidth={1.5}/>} 
                     label="Links &amp; Docs" 
                     active={nav.categoryType === "type" && nav.category === "links"} 
                     onClick={() => updateNav({ categoryType: "type", category: "links" })} 
                     theme={theme} 
                     isDark={isDark} 
                     onDropItem={(id: string) => bulkChangeType([id], 'link')}
                     onDropItems={(ids: string[]) => { bulkChangeType(ids, 'link'); setSelectedItems(new Set()); }}
                     onDropFiles={(files: File[]) => processAndUploadFiles(files, "Inbox")}
                 />
                 <SidebarItem 
                     icon={<ImageIcon size={16} strokeWidth={1.5}/>} 
                     label="Media" 
                     active={nav.categoryType === "type" && nav.category === "media"} 
                     onClick={() => updateNav({ categoryType: "type", category: "media" })} 
                     theme={theme} 
                     isDark={isDark} 
                     onDropItem={(id: string) => bulkChangeType([id], 'image')}
                     onDropItems={(ids: string[]) => { bulkChangeType(ids, 'image'); setSelectedItems(new Set()); }}
                     onDropFiles={(files: File[]) => processAndUploadFiles(files, "Inbox")}
                 />
                 <SidebarItem 
                     icon={<Hash size={16} strokeWidth={1.5}/>} 
                     label="Hashtags" 
                     active={(nav.categoryType as any) === "hashtags" || nav.categoryType === "tag"} 
                     onClick={() => updateNav({ categoryType: "hashtags" as any, category: "All" })} 
                     theme={theme} 
                     isDark={isDark} 
                 />
               </div>
            </div>

            {/* Folders Moved Under Content */}
            <div>
               <div className="flex items-center justify-between px-3 mb-2 group">
                 <h4 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMuted} opacity-70`}>Folders</h4>
                 {canModifyStructure && (
                     <button aria-label="Create Folder" onClick={() => updateSidebar({ isCreatingFolder: true })} className={`opacity-0 group-hover:opacity-100 transition-opacity ${theme.textMuted} hover:${theme.text}`}>
                         <Plus size={14} strokeWidth={1.5}/>
                     </button>
                 )}
               </div>
               <div className="space-y-0.5">
                  {sidebar.isCreatingFolder && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className={`flex items-center gap-3 px-3 py-2 rounded-2xl border ${theme.card}`}>
                      <Folder size={14} strokeWidth={1.5} className="text-teal-500" />
                      <input 
                          autoFocus 
                          type="text" 
                          value={sidebar.newFolderName} 
                          onChange={e => updateSidebar({ newFolderName: e.target.value })} 
                          onKeyDown={e => { 
                              if (e.key === "Enter") { setCustomFolders(p => [...p, sidebar.newFolderName]); updateSidebar({ isCreatingFolder: false, newFolderName: "" }); } 
                              if (e.key === "Escape") updateSidebar({ isCreatingFolder: false }); 
                          }} 
                          onBlur={() => { 
                              if (sidebar.newFolderName) setCustomFolders(p => [...p, sidebar.newFolderName]); 
                              updateSidebar({ isCreatingFolder: false, newFolderName: "" }); 
                          }} 
                          className={`bg-transparent border-none outline-none text-sm font-bold w-full ${theme.text}`} 
                          placeholder="Folder name..." 
                      />
                    </motion.div>
                  )}
                  {folderOrder.map((folder, index) => (
                     <SidebarEditableItem 
                         key={folder} 
                         icon={<Folder size={16} strokeWidth={1.5}/>} 
                         label={folder} 
                         active={nav.categoryType === "folder" && nav.category === folder} 
                         theme={theme} 
                         isDark={isDark} 
                         canModify={canModifyStructure} 
                         onClick={() => updateNav({ categoryType: "folder", category: folder })} 
                         onRename={(oldN: string, newN: string) => handleRenameFolder(oldN, newN)} 
                         onDelete={() => handleDeleteFolder(folder)} 
                         onMoveUp={() => setFolderOrder(prev => moveArrayItem(prev, index, -1))} 
                         onMoveDown={() => setFolderOrder(prev => moveArrayItem(prev, index, 1))} 
                         onDropItem={(itemId: string | number) => moveItemToFolder(itemId, folder)} 
                         onDropItems={(itemIds: (string | number)[]) => { bulkMoveToFolder(itemIds, folder); setSelectedItems(new Set()); }}
                         onDropFiles={(files: File[]) => processAndUploadFiles(files, folder)}
                     />
                  ))}
               </div>
            </div>

            <div>
               <div className="flex items-center justify-between px-3 mb-2 group">
                 <h4 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMuted} opacity-70`}>My Lists</h4>
                 {canModifyStructure && (
                     <button aria-label="Create List" onClick={() => updateSidebar({ isCreatingList: true })} className={`opacity-0 group-hover:opacity-100 transition-opacity ${theme.textMuted} hover:${theme.text}`}>
                         <Plus size={14} strokeWidth={1.5}/>
                     </button>
                 )}
               </div>
               <div className="space-y-0.5">
                  {sidebar.isCreatingList && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className={`flex items-center gap-3 px-3 py-2 rounded-2xl border ${theme.card}`}>
                      <ListIcon size={14} strokeWidth={1.5} className="text-teal-500" />
                      <input 
                          autoFocus 
                          type="text" 
                          value={sidebar.newListName} 
                          onChange={e => updateSidebar({ newListName: e.target.value })} 
                          onKeyDown={e => { 
                              if (e.key === "Enter") { setCustomLists(p => [...p, sidebar.newListName]); updateSidebar({ isCreatingList: false, newListName: "" }); } 
                              if (e.key === "Escape") updateSidebar({ isCreatingList: false }); 
                          }} 
                          onBlur={() => { 
                              if (sidebar.newListName) setCustomLists(p => [...p, sidebar.newListName]); 
                              updateSidebar({ isCreatingList: false, newListName: "" }); 
                          }} 
                          className={`bg-transparent border-none outline-none text-sm font-bold w-full ${theme.text}`} 
                          placeholder="List name..." 
                      />
                    </motion.div>
                  )}
                  {listOrder.map((list, index) => (
                     <SidebarEditableItem 
                         key={list} 
                         icon={<ListIcon size={16} strokeWidth={1.5}/>} 
                         label={list} 
                         active={nav.categoryType === "list" && nav.category === list} 
                         theme={theme} 
                         isDark={isDark} 
                         canModify={canModifyStructure} 
                         onClick={() => updateNav({ categoryType: "list", category: list })} 
                         onRename={(oldN: string, newN: string) => handleRenameList(oldN, newN)} 
                         onDelete={() => handleDeleteList(list)} 
                         onMoveUp={() => setListOrder(prev => moveArrayItem(prev, index, -1))} 
                         onMoveDown={() => setListOrder(prev => moveArrayItem(prev, index, 1))} 
                         onDropItem={(itemId: string | number) => moveItemToList(itemId, list)} 
                         onDropItems={(itemIds: (string | number)[]) => { bulkMoveToList(itemIds, list); setSelectedItems(new Set()); }}
                     />
                  ))}
               </div>
            </div>

            <div className="mt-auto pt-4 pb-2">
               <div className={`w-full h-px mb-4 ${isDark ? 'bg-white/5' : 'bg-black/5'}`} />
               <SidebarItem 
                   icon={<Trash2 size={16} strokeWidth={1.5}/>} 
                   label="Trash" 
                   active={nav.categoryType === "trash"} 
                   onClick={() => updateNav({ categoryType: "trash", category: "All" })} 
                   theme={theme} 
                   isDark={isDark} 
                   onDropItem={(id: string) => bulkMoveToTrash([id])}
                   onDropItems={(ids: string[]) => { bulkMoveToTrash(ids); setSelectedItems(new Set()); }}
               />
            </div>
         </div>

         <div className="p-4 border-t border-white/5">
           <button onClick={() => updateUi({ isAccountOpen: true })} className={`flex items-center gap-3 w-full text-left px-3 py-3 rounded-2xl transition-all cursor-pointer active:scale-95 ${isDark ? "hover:bg-white/5" : "hover:bg-black/5"}`}>
             <img src={currentAvatar} className={`w-7 h-7 rounded-full object-cover shadow-sm ring-1 ${isDark ? "ring-white/20" : "ring-black/10"}`} alt="Avatar" />
             <div className="flex-1 min-w-0">
               <h3 className={`font-bold text-[10px] uppercase tracking-widest truncate leading-tight ${isDark ? 'text-zinc-400' : 'text-stone-500'}`}>{userDisplayName}</h3>
             </div>
             <Settings size={14} strokeWidth={2} className={theme.textMuted}/>
           </button>
         </div>
      </aside>

      <main 
        ref={mainContentRef}
        className={`flex-1 rounded-3xl flex flex-col relative w-full overflow-hidden shadow-2xl border ${theme.island}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        tabIndex={0} 
      >
        {lasso.active && (Math.abs(lasso.currentX - lasso.startX) > 2 || Math.abs(lasso.currentY - lasso.startY) > 2) && (
          <div
            className="fixed border border-teal-500/50 bg-teal-500/10 transition-none pointer-events-none rounded-lg backdrop-blur-sm"
            style={{ 
                zIndex: 9999,
                display: lasso.active ? "block" : "none",
                left: Math.min(lasso.startX, lasso.currentX), 
                top: Math.min(lasso.startY, lasso.currentY), 
                width: Math.abs(lasso.currentX - lasso.startX), 
                height: Math.abs(lasso.currentY - lasso.startY) 
            }}
          />
        )}

        <AnimatePresence>
           {isSelectMode && (
              <motion.div 
                 initial={{ y: 50, opacity: 0, x: "-50%", scale: 0.95 }} 
                 animate={{ y: 0, opacity: 1, x: "-50%", scale: 1 }} 
                 exit={{ y: 50, opacity: 0, x: "-50%", scale: 0.95 }}
                 transition={{ duration: 0.15, ease: "easeOut" }}
                 className={`fixed bottom-8 left-1/2 flex items-center h-12 px-3 rounded-xl shadow-2xl border backdrop-blur-xl z-9999 ${isDark ? 'bg-[#18181B]/95 border-white/10 shadow-black/50' : 'bg-white/95 border-zinc-200 shadow-zinc-200/50'}`}
              >
                 <div className={`flex items-center gap-3 pr-3 border-r ${isDark ? 'border-white/10' : 'border-zinc-200'} shrink-0`}>
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-teal-500/10 text-teal-500 text-xs font-bold">{selectedItems.size}</div>
                    <span className="text-sm font-semibold hidden sm:inline">Selected</span>
                    <button onClick={handleSelectAll} className="text-xs text-zinc-400 hover:text-teal-500 font-medium transition-colors">
                       {selectedItems.size === filteredData.length ? "Clear" : "Select All"}
                    </button>
                 </div>

                 <div className="flex items-center gap-1 pl-3">
                   {nav.categoryType === "trash" ? (
                      <>
                         <button onClick={() => { bulkRestoreFromTrash(Array.from(selectedItems)); setSelectedItems(new Set()); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}>
                            <RotateCcw size={14} /> <span className="hidden sm:inline">Restore</span>
                         </button>
                         <button onClick={() => { if(window.confirm("Delete these items forever?")) { bulkHardDelete(Array.from(selectedItems)); setSelectedItems(new Set()); } }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 transition-colors ${isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}>
                            <Trash2 size={14} /> <span className="hidden sm:inline">Delete</span>
                         </button>
                      </>
                   ) : (
                      <>
                         <div className="relative group">
                            <select defaultValue="" onChange={(e) => { bulkMoveToFolder(Array.from(selectedItems), e.target.value); setSelectedItems(new Set()); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                               <option value="" disabled>Folder</option>
                               {customFolders.map((f: string) => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}>
                                <Folder size={14} className={isDark ? "text-zinc-400" : "text-zinc-500"} /> <span className="hidden sm:inline">Move</span>
                            </button>
                         </div>
                         <div className="relative group">
                            <select defaultValue="" onChange={(e) => { bulkMoveToList(Array.from(selectedItems), e.target.value); setSelectedItems(new Set()); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                               <option value="" disabled>List</option>
                               {customLists.map((l: string) => <option key={l} value={l}>{l}</option>)}
                            </select>
                            <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}`}>
                                <ListIcon size={14} className={isDark ? "text-zinc-400" : "text-zinc-500"} /> <span className="hidden sm:inline">Add to List</span>
                            </button>
                         </div>
                         {(nav.categoryType === 'folder' || nav.categoryType === 'list' || nav.categoryType === 'pinned' || nav.categoryType === 'type') && (
                            <button onClick={() => { 
                               Array.from(selectedItems).forEach(id => handleRemoveFromContext(id)); 
                               setSelectedItems(new Set()); 
                            }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-orange-500 transition-colors ${isDark ? 'hover:bg-orange-500/10' : 'hover:bg-orange-50'}`}>
                                <MinusCircle size={14} className="text-orange-500" /> <span className="hidden sm:inline">Remove</span>
                            </button>
                         )}
                         <button onClick={() => { bulkMoveToTrash(Array.from(selectedItems)); setSelectedItems(new Set()); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 transition-colors ${isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}>
                             <Trash2 size={14} /> <span className="hidden sm:inline">Trash</span>
                         </button>
                      </>
                   )}
                   <div className={`border-l ml-1 pl-2 ${isDark ? 'border-white/10' : 'border-zinc-200'}`}>
                       <button onClick={() => setSelectedItems(new Set())} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}>
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
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="absolute inset-0 z-50 bg-teal-500/10 backdrop-blur-md border-4 border-teal-500/50 border-dashed m-6 flex items-center justify-center pointer-events-none rounded-3xl"
            >
              <div className="bg-white dark:bg-zinc-900 px-10 py-8 shadow-2xl flex flex-col items-center gap-4 border border-stone-200 dark:border-zinc-800 rounded-3xl">
                <UploadCloud size={48} strokeWidth={1.5} className="text-teal-500 animate-bounce" />
                <h2 className="text-2xl font-bold tracking-tight">Drop files to upload</h2>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 検 UPGRADE: Dynamic Frost Sticky Header */}
        <header className={`sticky top-0 w-full px-6 md:px-12 pt-6 pb-4 shrink-0 flex items-center justify-between gap-6 z-50 transition-all duration-300 ${isDark ? 'bg-[#0E0E10]/80 border-b border-white/5 backdrop-blur-2xl' : 'bg-white/80 border-b border-black/5 backdrop-blur-2xl'}`}>
          <div className="flex-1 max-w-2xl flex items-center gap-4">
            
            <div className="relative group flex-1">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${theme.textMuted} group-focus-within:text-teal-500`} />
              <input type="text" placeholder="Search your mind..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full py-3 pl-12 pr-12 text-sm font-medium outline-none transition-all rounded-2xl ${theme.input} leading-normal`} />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 opacity-50">
                  <CmdIcon size={12} /><span className="text-[10px] font-bold font-mono">K</span>
              </div>
            </div>

            <div className={`hidden md:flex items-center p-1 border shadow-sm rounded-xl ${isDark ? "bg-[#18181B] border-white/5" : "bg-white border-black/5"}`}>
               <div className="relative group/tooltip flex items-center justify-center">
                 <button aria-label="Masonry Grid" onClick={() => startTransition(() => updateNav({ viewMode: "grid" }))} className={`p-2.5 transition-all active:scale-95 rounded-lg ${nav.viewMode === "grid" ? (isDark ? "bg-white/10 text-teal-400 shadow-sm" : "bg-black/5 text-teal-600 shadow-sm") : theme.textMuted}`}>
                     <Columns size={18} strokeWidth={1.5} />
                 </button>
                 <div className="absolute top-full mt-2 px-2.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-bold opacity-0 translate-y-2 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 transition-all pointer-events-none whitespace-nowrap shadow-xl z-50 rounded-lg">
                     Masonry Grid
                 </div>
               </div>
               
               <div className="relative group/tooltip flex items-center justify-center">
                 <button aria-label="Uniform Cards" onClick={() => startTransition(() => updateNav({ viewMode: "card" }))} className={`p-2.5 transition-all active:scale-95 rounded-lg ${nav.viewMode === "card" ? (isDark ? "bg-white/10 text-teal-400 shadow-sm" : "bg-black/5 text-teal-600 shadow-sm") : theme.textMuted}`}>
                     <LayoutGrid size={18} strokeWidth={1.5} />
                 </button>
                 <div className="absolute top-full mt-2 px-2.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-bold opacity-0 translate-y-2 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 transition-all pointer-events-none whitespace-nowrap shadow-xl z-50 rounded-lg">
                     Uniform Cards
                 </div>
               </div>
               
               <div className="relative group/tooltip flex items-center justify-center">
                 <button aria-label="List View" onClick={() => startTransition(() => updateNav({ viewMode: "list" }))} className={`p-2.5 transition-all active:scale-95 rounded-lg ${nav.viewMode === "list" ? (isDark ? "bg-white/10 text-teal-400 shadow-sm" : "bg-black/5 text-teal-600 shadow-sm") : theme.textMuted}`}>
                     <AlignJustify size={18} strokeWidth={1.5} />
                 </button>
                 <div className="absolute top-full mt-2 px-2.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-bold opacity-0 translate-y-2 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 transition-all pointer-events-none whitespace-nowrap shadow-xl z-50 rounded-lg">
                     List View
                 </div>
               </div>
               
               <div className="relative group/tooltip flex items-center justify-center">
                 <button aria-label="Calendar View" onClick={() => startTransition(() => updateNav({ viewMode: "calendar" }))} className={`p-2.5 transition-all active:scale-95 rounded-lg ${nav.viewMode === "calendar" ? (isDark ? "bg-white/10 text-teal-400 shadow-sm" : "bg-black/5 text-teal-600 shadow-sm") : theme.textMuted}`}>
                     <CalendarIcon size={18} strokeWidth={1.5} />
                 </button>
                 <div className="absolute top-full mt-2 px-2.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-bold opacity-0 translate-y-2 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 transition-all pointer-events-none whitespace-nowrap shadow-xl z-50 rounded-lg">
                     Calendar View
                 </div>
               </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0 z-50">
            <div className="relative group/tooltip flex items-center justify-center">
               <button aria-label="Manual Sync" onClick={() => fetchItems(1, false)} className={`p-3 transition-all active:scale-95 shadow-sm rounded-xl ${isDark ? "bg-[#18181B] border border-white/5 text-teal-400 hover:bg-white/10" : "bg-white border border-black/5 text-teal-600 hover:bg-black/5"}`}>
                  <RefreshCw size={18} strokeWidth={2} className={ui.isSyncing ? "animate-spin" : ""} />
               </button>
               <div className="absolute top-full mt-2 px-2.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-bold opacity-0 translate-y-2 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 transition-all pointer-events-none whitespace-nowrap shadow-xl z-50 rounded-lg">
                   Manual Sync
               </div>
            </div>

            <ThemeToggle isDark={isDark} toggle={toggleTheme} />

            <AnimatePresence>
               {nav.workspace === "team" && (
                 <>
                   <div className="relative group/tooltip hidden md:flex items-center justify-center">
                      <button aria-label="Team Chat" onClick={() => updateUi({ isChatOpen: !ui.isChatOpen })} className={`p-3 shadow-sm transition-all active:scale-95 rounded-xl ${ui.isChatOpen ? "bg-teal-500 text-white border border-teal-600" : (isDark ? "bg-[#18181B] border border-white/5 hover:bg-zinc-800" : "bg-white border border-black/5 hover:bg-black/5")}`}>
                         <MessageSquare size={18} strokeWidth={ui.isChatOpen ? 2 : 1.5} className={ui.isChatOpen ? "text-white" : theme.textMuted} />
                      </button>
                      <div className="absolute top-full mt-2 px-2.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-bold opacity-0 translate-y-2 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 transition-all pointer-events-none whitespace-nowrap shadow-xl z-50 rounded-lg">
                          Team Chat
                      </div>
                   </div>

                   <div className="relative">
                      <button aria-label="Notifications" onClick={() => updateUi({ showNotifications: !ui.showNotifications })} className={`p-3 shadow-sm transition-all active:scale-95 rounded-xl ${isDark ? "bg-[#18181B] border border-white/5 hover:bg-zinc-800" : "bg-white border border-black/5 hover:bg-black/5"}`}>
                         <Bell size={18} strokeWidth={1.5} className={theme.textMuted} />
                         {notifications.some(n => !n.read) && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[#18181B] dark:border-zinc-900" />}
                      </button>
                      <AnimatePresence>
                         {ui.showNotifications && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => updateUi({ showNotifications: false })} />
                              <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }} className={`absolute right-0 top-full mt-3 w-72 md:w-80 z-50 shadow-2xl border backdrop-blur-3xl p-2 rounded-3xl ${isDark ? "bg-zinc-900/95 border-zinc-800" : "bg-white/95 border-[#e8e4dc]"}`}>
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
                                       <div key={n.id} onClick={() => handleMarkAsRead(n.id)} className={`p-4 transition-colors cursor-pointer group rounded-2xl ${n.read ? "opacity-60" : (isDark ? "bg-white/5" : "bg-black/5")} hover:bg-teal-500/10 relative`}>
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
                      <button aria-label="Team Presence" onClick={() => updateUi({ showTeamPresence: !ui.showTeamPresence })} className={`flex items-center p-1.5 shadow-md cursor-pointer active:scale-95 hover:shadow-lg transition-all border rounded-xl ${isDark ? "bg-[#18181B] border-white/5" : "bg-white border-black/5"}`}>
                        <div className="flex -space-x-2 pl-1.5">
                          {teamMembers.filter(m => m.inWorkspace).slice(0, 3).map((member, i) => (
                             <img key={i} className={`inline-block h-8 w-8 rounded-full ring-2 object-cover ${isDark ? "ring-[#18181B]" : "ring-white"}`} src={member.avatar} alt=""/>
                          ))}
                        </div>
                        <div className="px-4 flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase tracking-widest"><Users size={14} strokeWidth={2}/> Team</div>
                      </button>
                      <AnimatePresence>
                         {ui.showTeamPresence && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => updateUi({ showTeamPresence: false })} />
                              <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }} className={`absolute right-0 top-full mt-3 w-80 z-50 shadow-2xl border backdrop-blur-3xl flex flex-col overflow-hidden rounded-3xl ${isDark ? "bg-zinc-900/95 border-zinc-800" : "bg-white/95 border-[#e8e4dc]"}`}>
                                 <div className="flex flex-col gap-1 max-h-80 overflow-y-auto p-2">
                                    
                                    <div className="px-3 pt-3 pb-2">
                                       <h4 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMuted}`}>Online Now</h4>
                                    </div>
                                    <div className="flex flex-col gap-1 px-1">
                                       {teamMembers.filter(m => m.inWorkspace && m.status === "online").length === 0 ? (
                                          <div className="px-3 py-2 text-sm text-stone-500 font-medium">No one online.</div>
                                       ) : (
                                          teamMembers.filter(m => m.inWorkspace && m.status === "online").map(member => (
                                             <div key={member.id} className="flex items-center justify-between gap-3 w-full px-3 py-2 bg-black/5 dark:bg-white/5 rounded-2xl">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <img src={member.avatar} className="w-8 h-8 rounded-full object-cover shadow-sm shrink-0" alt="avatar" />
                                                   <span className={`text-sm font-bold truncate ${theme.text}`}>{cleanName(member.name)}</span>
                                                </div>
                                                <Circle size={10} className="fill-emerald-500 text-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] rounded-full shrink-0" />
                                             </div>
                                          ))
                                       )}
                                    </div>

                                    <div className={`mt-2 mb-1 border-t mx-3 ${isDark ? "border-white/10" : "border-black/5"}`} />

                                    <div className="px-3 pt-2 pb-2">
                                       <h4 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMuted}`}>Offline</h4>
                                    </div>
                                    <div className="flex flex-col gap-1 px-1 pb-2">
                                       {teamMembers.filter(m => m.inWorkspace && m.status === "offline").map(member => (
                                          <div key={member.id} className="flex items-center justify-between gap-3 w-full px-3 py-2 opacity-60 rounded-2xl">
                                             <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <img src={member.avatar} className="w-8 h-8 rounded-full object-cover grayscale shrink-0" alt="avatar" />
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
            
            {/* Trash Button */}
            {nav.categoryType === "trash" ? (
              <button key="btn-trash" aria-label="Empty Trash" onClick={() => setShowTrashConfirm(true)} className={`px-6 py-3 text-sm font-bold transition-all active:scale-95 flex items-center gap-2 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white rounded-xl`}>
                <Trash2 size={16} strokeWidth={2} /> <span className="hidden md:inline">Empty Trash</span>
              </button>
            ) : (
              <div className="flex gap-3">
                {canCreate && (
                   <>
                      <div className="relative group/tooltip flex items-center justify-center">
                         <button aria-label="Upload Files" onClick={() => fileInputRef.current?.click()} disabled={ui.isUploading} className={`w-11 h-11 flex items-center justify-center transition-all active:scale-95 shadow-sm rounded-[14px] border ${isDark ? "bg-[#18181B] border-white/5 hover:bg-white/10" : "bg-white border-black/5 hover:bg-black/5"}`}>
                            <ImageIcon size={18} strokeWidth={1.5} className={isDark ? "text-zinc-400" : "text-zinc-600"} />
                         </button>
                         <div className="absolute top-full mt-2 px-2.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-bold opacity-0 translate-y-2 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 transition-all pointer-events-none whitespace-nowrap shadow-xl z-50 rounded-lg">
                             Upload File
                         </div>
                      </div>
                      
                      <div className="relative group/tooltip flex items-center justify-center">
                         <button aria-label="New Checklist" onClick={handleNewChecklist} className={`w-11 h-11 flex items-center justify-center transition-all active:scale-95 shadow-sm rounded-[14px] border ${isDark ? "bg-[#18181B] border-white/5 hover:bg-white/10" : "bg-white border-black/5 hover:bg-black/5"}`}>
                            <CheckSquare size={18} strokeWidth={1.5} className={isDark ? "text-zinc-400" : "text-zinc-600"} />
                         </button>
                         <div className="absolute top-full mt-2 px-2.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-bold opacity-0 translate-y-2 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 transition-all pointer-events-none whitespace-nowrap shadow-xl z-50 rounded-lg">
                             New Checklist
                         </div>
                      </div>

                      <button aria-label="New Note" onClick={handleNewNote} className={`h-11 px-6 text-sm font-bold flex items-center gap-2 rounded-[14px] transition-colors shadow-sm ${theme.btnPrimary}`}>
                         <Plus size={18} strokeWidth={2.5} /> <span className="hidden md:inline">New Note</span>
                      </button>
                   </>
                )}
              </div>
            )}
          </div>
        </header>

        <div className="px-6 md:px-12 pb-4 pt-4 flex flex-col relative z-30 bg-transparent shrink-0">
           <div className="flex items-end justify-between">
             {nav.viewMode === "grid" || nav.viewMode === "card" || nav.viewMode === "list" ? (
                <>
                 <div>
                   <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight drop-shadow-sm">
                     {getCategoryTitle()}
                   </h2>
                   <p className={`mt-2 text-xs font-bold flex items-center gap-2 uppercase tracking-widest opacity-80 ${theme.textMuted}`}>
                      {filteredData.length} {filteredData.length === 1 ? 'item' : 'items'} curated
                   </p>
                 </div>
                </>
             ) : (
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
                  <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight drop-shadow-sm">{format(nav.currentDate, "MMMM yyyy")}</h2>
                  <div className={`flex items-center gap-1 border p-1 shadow-md backdrop-blur-md rounded-full ${isDark ? "bg-zinc-900/50 border-zinc-800/80" : "bg-white border-stone-200"}`}>
                     <button aria-label="Previous Month" onClick={() => updateNav({ currentDate: subMonths(nav.currentDate, 1) })} className={`p-2.5 transition-colors active:scale-95 rounded-full ${isDark ? "hover:bg-zinc-800 text-zinc-100" : "hover:bg-black/5 text-stone-900"}`}>
                         <ChevronLeft size={18} strokeWidth={1.5}/>
                     </button>
                     <button onClick={() => updateNav({ currentDate: new Date() })} className={`px-5 py-2 text-sm font-bold transition-colors active:scale-95 rounded-full ${isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-black/5 text-stone-500"}`}>
                         Today
                     </button>
                     <button aria-label="Next Month" onClick={() => updateNav({ currentDate: addMonths(nav.currentDate, 1) })} className={`p-2.5 transition-colors active:scale-95 rounded-full ${isDark ? "hover:bg-zinc-800 text-zinc-100" : "hover:bg-black/5 text-stone-900"}`}>
                         <ChevronRightIcon size={18} strokeWidth={1.5}/>
                     </button>
                  </div>
                </div>
             )}
           </div>

           <AnimatePresence>
              {((nav.categoryType as any) === "hashtags" || nav.categoryType === "tag") && (
                 <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: "auto" }} 
                    exit={{ opacity: 0, height: 0 }}
                    className={`flex flex-col gap-4 mt-6 pt-4 border-t w-full relative z-30 ${isDark ? "border-white/5" : "border-black/5"}`}
                 >
                    <div className={`relative flex items-center w-full max-w-md overflow-hidden border focus-within:border-teal-500 transition-colors shadow-md rounded-2xl ${isDark ? "bg-[#18181B] border-white/5" : "bg-white border-black/5"}`}>
                       <Search size={16} className={`absolute left-4 ${theme.textMuted}`} />
                       <input type="text" placeholder="Search tags..." value={tagSearchQuery} onChange={e => setTagSearchQuery(e.target.value)} className={`w-full bg-transparent border-none py-3 pl-11 pr-4 text-sm font-medium outline-none ${theme.text}`} />
                    </div>
                    
                    <div className="w-full flex flex-wrap gap-2 pt-1 pb-2">
                       <button onClick={() => updateNav({ categoryType: "hashtags" as any, category: "All" })} className={`px-4 py-2 text-xs font-bold transition-all border shrink-0 rounded-full ${(nav.categoryType as any) === "hashtags" ? "bg-teal-500 text-white border-teal-600 shadow-md" : (isDark ? "bg-white/5 text-zinc-300 border-white/5 hover:bg-white/10" : "bg-white text-stone-700 border-black/5 hover:bg-black/5")}`}>
                           All Hashtags
                       </button>
                       {smartTags.filter((t: string) => t.toLowerCase().includes(tagSearchQuery.toLowerCase())).map((tag: string) => (
                          <button key={tag} onClick={() => updateNav({ categoryType: "tag", category: tag })} className={`px-4 py-2 text-xs font-bold transition-all border shrink-0 rounded-full ${nav.categoryType === "tag" && nav.category === tag ? "bg-teal-500 text-white border-teal-600 shadow-md" : (isDark ? "bg-white/5 text-zinc-300 border-white/5 hover:bg-white/10" : "bg-white text-stone-700 border-black/5 hover:bg-black/5")}`}>
                              #{tag}
                          </button>
                       ))}
                    </div>
                 </motion.div>
              )}
           </AnimatePresence>
        </div>

        <div 
           className="flex-1 overflow-y-auto px-6 md:px-12 pt-6 pb-24 md:pb-20 custom-scrollbar relative z-10 w-full cursor-crosshair"
           onPointerDown={handlePointerDown}
        >
           <div className="relative z-10 cursor-auto min-h-full">
               
               {/* 検 UPGRADE: Masonry Skeleton Loaders */}
               {isLoading && page === 1 ? (
                  <div className={nav.viewMode === "list" ? "flex flex-col gap-4 w-full pointer-events-none" : "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 items-start w-full pointer-events-none"}>
                     {[150, 250, 300, 200, 280, 180, 320, 220, 260, 190, 310, 170, 290, 210, 240].slice(0, nav.viewMode === 'list' ? 8 : 15).map((height, i) => (
                        <motion.div 
                           key={i}
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: i * 0.02 }}
                           className={`w-full rounded-3xl relative overflow-hidden border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
                           style={{ height: nav.viewMode === 'list' ? '72px' : `${height}px` }}
                        >
                           <div className={`absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-linear-to-r from-transparent ${isDark ? "via-white/10" : "via-black/5"} to-transparent`} />
                        </motion.div>
                     ))}
                  </div>

               ) : filteredData.length === 0 && nav.viewMode !== "calendar" ? (
                  
                  <div className="flex-1 w-full flex flex-col items-center mt-20 text-center opacity-50 px-4 pointer-events-none">
                     {/* 検 UPGRADE: Contextual Empty States */}
                     <div className={`w-full max-w-lg border border-dashed p-16 flex flex-col items-center justify-center transition-colors shadow-sm rounded-3xl ${isDark ? "border-white/20 bg-white/5" : "border-black/20 bg-black/5"}`}>
                       <EmptyIcon size={64} strokeWidth={1} className={`mb-6 ${theme.textMuted}`} />
                       <h3 className="text-3xl font-black tracking-tight mb-2">{emptyState.title}</h3>
                       <p className={`text-base font-medium ${theme.textMuted}`}>{emptyState.desc}</p>
                     </div>
                  </div>
                  
               ) : nav.viewMode !== "calendar" ? (
                  <AnimatePresence mode="wait">
                    <motion.div 
                        key={nav.viewMode}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className={`pointer-events-auto pb-10 w-full ${
                            nav.viewMode === "list" ? "flex flex-col gap-4" : 
                            nav.viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 items-start" : 
                            "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
                        }`}
                    >
                          {/* 検 UPGRADE: Time-Based Grouping (List & Card View) */}
                          {Object.entries(groupedData).map(([groupName, items]) => (
                              <React.Fragment key={groupName}>
                                  {groupName !== "All Items" && (
                                      <motion.div layout={false} className="col-span-full w-full pt-6 pb-2">
                                          <h4 className={`text-xs font-bold uppercase tracking-widest ${theme.textMuted}`}>{groupName}</h4>
                                      </motion.div>
                                  )}
                                  {items.map((item, index) => (
                                      <motion.div 
                                          key={item.clientKey || item.id} 
                                          layout={false} 
                                          initial={{ opacity: 0, y: 20 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          className={`lasso-selectable relative z-0 hover:z-50 ${nav.viewMode === 'grid' ? 'w-full' : 'h-full w-full'}`}
                                          data-id={item.id}
                                          transition={{ duration: 0.3, ease: "easeOut", delay: Math.min(index * 0.02, 0.1) }}
                                      >
                                          <MemoizedMasonryCard 
                                              customFolders={customFolders} 
                                              customLists={customLists} 
                                              onMoveToFolder={moveItemToFolder} 
                                              onMoveToList={moveItemToList} 
                                              onUpdateTags={updateItemTags} 
                                              onTagClick={(tag: string) => updateNav({ categoryType: "tag", category: tag, viewMode: "grid" })} 
                                              viewMode={nav.viewMode} 
                                              item={item} 
                                              theme={theme} 
                                              isDark={isDark} 
                                              inTrash={nav.categoryType === "trash"} 
                                              activeWorkspace={nav.workspace} 
                                              currentUserId={session?.user?.id} 
                                              teamRole={teamRole} 
                                              teamMembers={teamMembers} 
                                              onRestore={restoreFromTrash} 
                                              onHardDelete={hardDelete} 
                                              onDelete={moveToTrash} 
                                              onUpdateSticky={updateStickyNote} 
                                              toggleItemReaction={toggleItemReaction} 
                                              toggleChecklistItem={toggleChecklistItem} 
                                              isSelected={selectedItems.has(item.id)} 
                                              selectedItems={Array.from(selectedItems)}
                                              onToggleSelect={handleToggleSelect} 
                                              isSelectMode={isSelectMode} 
                                              isActiveKeyboard={activeIndex === index} 
                                              onPlayYouTube={(id: string) => setPlayingYouTubeId(id)} 
                                              onClick={(e: any) => handleOpenItem(item)} 
                                              currentCategoryType={nav.categoryType}
                                              currentCategory={nav.category}
                                              onRemoveFromContext={handleRemoveFromContext}
                                              onTogglePin={handleTogglePin} 
                                          />
                                      </motion.div>
                                  ))}
                              </React.Fragment>
                          ))}
                    </motion.div>
                  </AnimatePresence>

               ) : (
                 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, ease: "easeOut" }} className={`w-full overflow-hidden flex flex-col shadow-2xl border mb-10 rounded-3xl ${isDark ? "bg-[#0E0E12] border-white/5" : "bg-white border-black/5"} pointer-events-auto`}>
                    <div className={`grid grid-cols-7 border-b shrink-0 ${isDark ? "border-white/5 bg-white/5" : "border-black/5 bg-black/5"}`}>
                       {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                          <div key={day} className={`p-3 md:p-5 text-center text-[10px] md:text-xs font-bold uppercase tracking-widest ${theme.textMuted}`}>{day.slice(0, 3)}</div>
                       ))}
                    </div>
                    <div className={`grid grid-cols-7 auto-rows-fr gap-px ${isDark ? "bg-white/5" : "bg-black/5"}`}>
                       {calendarDays.map((day, idx) => {
                          const dayItems = filteredData.filter(item => {
                              const targetDate = item.scheduled_for ? new Date(item.scheduled_for) : new Date(item.created_at || new Date());
                              return isSameDay(targetDate, day);
                          });
                          const isCurrentMonth = isSameMonth(day, monthStart);
                          const isToday = isSameDay(day, new Date());

                          return (
                            <div key={day.toString()} className={`h-32 md:h-48 p-2 md:p-4 flex flex-col gap-2 md:gap-3 transition-colors ${isCurrentMonth ? (isDark ? "bg-[#0A0A0C]" : "bg-white") : (isDark ? "bg-[#0A0A0C]/50 opacity-40" : "bg-[#faf8f5] opacity-50")}`}>
                               <div className={`text-xs md:text-sm font-black w-6 h-6 md:w-10 h-10 flex items-center justify-center shrink-0 rounded-full ${isToday ? "bg-teal-500 text-white shadow-lg shadow-teal-900/20" : theme.textMuted}`}>{format(day, "d")}</div>
                               <div className="flex-1 flex flex-col gap-1 md:gap-2 overflow-y-auto custom-scrollbar pr-1">
                                  {dayItems.map(item => {
                                     let isYouTube = false;
                                     if (item.url && (item.url.includes("youtube.com") || item.url.includes("youtu.be"))) {
                                         isYouTube = true;
                                     }

                                     const isVideo = item.url && (item.url.includes("instagram.com") || isYouTube);
                                     const chipColor = isVideo 
                                        ? (isDark ? "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20" : "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200") 
                                        : item.type === "note" 
                                        ? (isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-100 text-emerald-700 border-emerald-200")
                                        : (isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-100 text-blue-700 border-blue-200");
                                     const Icon = isVideo ? Play : item.type === "note" ? FileText : Globe;
                                     
                                     return (
                                        <button 
                                           key={item.id} 
                                           onClick={() => handleOpenItem(item)}
                                           className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-bold border cursor-pointer shadow-sm truncate hover:scale-105 active:scale-95 transition-all rounded-xl ${chipColor}`}
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

               {hasMore && !debouncedSearchQuery && !isSelectMode && (
                   <div ref={loadMoreRef} className="w-full flex justify-center mt-12 mb-10 pointer-events-auto h-10">
                      {isLoading && <Loader2 size={24} className={`animate-spin ${theme.textMuted}`} />}
                   </div>
               )}
           </div>
         </div>
      </main>
      
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
    </div>
  );
}