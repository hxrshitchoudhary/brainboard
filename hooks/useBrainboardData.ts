// filepath: hooks/useBrainboardData.ts
import { useState, useCallback } from "react";
import { supabase } from '@/lib/supabase'; 
import { BentoItem } from "@/app/types";
import { Session } from '@supabase/supabase-js';

export function useBrainboardData(
  session: Session | null, 
  teamWorkspaceId: string, 
  activeWorkspace: string, 
  displayName: string, 
  showToast: (msg: string, isError?: boolean) => void,
  updateUi: Function
) {
  const [items, setItems] = useState<BentoItem[]>([]);
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [customLists, setCustomLists] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // BULLETPROOF SORTING: Tracks recently added items to manually lock them to the top of the grid
  const [recentIds, setRecentIds] = useState<(string | number)[]>([]);

  const fetchItems = useCallback(async (pageNum = 1, isLoadMore = false) => {
    if (!session?.user?.id) return;
    
    // CRITICAL FIX: Always enforce loading lock to prevent infinite IntersectionObserver loops
    setIsLoading(true); 
    updateUi({ isSyncing: true });
    
    try {
      const PAGE_SIZE = 10000; // Load all at once
      const from = (pageNum - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .or(`user_id.eq.${session.user.id},workspace_id.eq.${teamWorkspaceId}`)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Supabase Sync Error:", error);
        showToast("Failed to sync items.", true);
        setHasMore(false); // Stops the infinite loading loop
      } else if (data) {
        if (isLoadMore) {
           setItems(prev => {
              const newItems = (data as BentoItem[]).filter(d => !prev.some(p => String(p.id) === String(d.id)));
              return [...prev, ...newItems];
           });
        } else {
           setItems(data as BentoItem[]);
           setPage(1);
        }
        
        setHasMore(data.length === PAGE_SIZE);

        const allSections = (data as BentoItem[]).flatMap(item => item.sections || (item.section ? [item.section] : []));
        const folders = Array.from(new Set(allSections)).filter(Boolean) as string[];
        const lists = Array.from(new Set((data as BentoItem[]).map(i => i.list_name).filter(Boolean))) as string[];
        
        setCustomFolders(prev => Array.from(new Set([...prev, ...folders.filter(f => !["Inbox", "Archive"].includes(f))])));
        setCustomLists(prev => Array.from(new Set([...prev, ...lists])));
      }
    } catch (err) {
      console.error("Unexpected fetch error:", err);
      setHasMore(false); // Stops the infinite loading loop on catch as well
    } finally {
      setIsLoading(false);
      updateUi({ isSyncing: false });
    }
  }, [session?.user?.id, teamWorkspaceId, showToast, updateUi]);

  const saveNote = async (noteToSave: BentoItem) => {
    const isTemp = String(noteToSave.id).startsWith('temp-');
    let newSections = noteToSave.sections || [];
    if (noteToSave.section) newSections = Array.from(new Set([...newSections, noteToSave.section]));

    const payload: any = {
      user_id: session?.user?.id, workspace_id: noteToSave.workspace_id || (activeWorkspace === 'team' ? teamWorkspaceId : null),
      creator: noteToSave.creator || displayName, type: noteToSave.type || 'note', title: noteToSave.title || null,
      content: noteToSave.content || null, url: noteToSave.url || null, thumbnail_url: noteToSave.thumbnail_url || null,
      video_url: noteToSave.video_url || null, img: noteToSave.img || null, is_pinned: noteToSave.is_pinned || false,
      sections: newSections.length > 0 ? newSections : null, list_name: noteToSave.list_name || null,
      ai_summary: noteToSave.ai_summary || null, color: noteToSave.color || null, 
      is_checklist: noteToSave.is_checklist || false, checklist_items: noteToSave.checklist_items || [], 
      tags: noteToSave.tags || null,
      likes: noteToSave.likes || null, comments: noteToSave.comments || null,
      scheduled_for: noteToSave.scheduled_for || null, updated_at: new Date().toISOString()
    };

    Object.keys(payload).forEach(key => { if (payload[key] === null || payload[key] === undefined) delete payload[key]; });
    
    const itemBeforeUpdate = items.find(i => String(i.id) === String(noteToSave.id));

    try {
        if (isTemp) {
            const { data, error } = await supabase.from('assets').insert([payload]).select().single();
            if (error) {
               console.error("Insert Note Error:", error);
               showToast("Database Error: Failed to save note.", true);
            }
            if (data) {
                setRecentIds(prev => [data.id, ...prev]); // Lock to Top
                setItems(prev => [data, ...prev.filter(i => String(i.id) !== String(noteToSave.id))]);
                showToast("Saved successfully!");
            }
        } else {
            setItems(prev => prev.map(item => String(item.id) === String(noteToSave.id) ? { ...item, ...payload } : item));
            const { error } = await supabase.from('assets').update(payload).eq('id', noteToSave.id);
            
            if (error) {
                console.error("Update Note Error:", error);
                if (itemBeforeUpdate) setItems(prev => prev.map(i => String(i.id) === String(noteToSave.id) ? itemBeforeUpdate : i));
                showToast("Database Error: Failed to update item. Reverting...", true);
            } else {
                showToast("Updated successfully!");
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
        console.error("Save Note Catch Error:", e);
        if (itemBeforeUpdate) setItems(prev => prev.map(i => String(i.id) === String(noteToSave.id) ? itemBeforeUpdate : i));
        showToast("Network Error: Failed to save. Reverting...", true);
    }
  };

  const insertItem = async (payload: any) => {
    try {
      const { data, error } = await supabase.from('assets').insert([payload]).select().single();
      if (error) {
         console.error("Insert Item Error:", error);
         showToast(`Database Error: ${error.message}`, true);
      }
      if (data) {
          setRecentIds(prev => [data.id, ...prev]); // Lock to Top
          setItems(prev => [data, ...prev]);
      }
      return data;
    } catch (e) {
      console.error("Insert Item Catch Error:", e);
      showToast("Network Error: Failed to insert.", true);
    }
  };

  const updateItemTags = async (id: string | number, newTags: string[]) => {
    const strId = String(id);
    const oldItem = items.find(i => String(i.id) === strId);
    setItems(prev => prev.map(item => String(item.id) === strId ? { ...item, tags: newTags.length > 0 ? newTags : undefined } : item));
    if (!strId.startsWith('temp-')) {
        const { error } = await supabase.from('assets').update({ tags: newTags.length > 0 ? newTags : null }).eq('id', id);
        if (error) { 
            console.error("Update Tags Error:", error);
            if (oldItem) setItems(prev => prev.map(item => String(item.id) === strId ? oldItem : item));
            showToast("Failed to update tags.", true); 
        }
    }
  };

  const moveItemToFolder = async (itemId: string | number, folderName: string) => {
    const strId = String(itemId);
    const oldItem = items.find(i => String(i.id) === strId);
    
    setItems(prev => prev.map(item => String(item.id) === strId ? { ...item, sections: [folderName], section: undefined } : item));
    showToast(`Moved to ${folderName}`);
    
    if (!strId.startsWith('temp-')) {
        const { error } = await supabase.from('assets').update({ sections: [folderName] }).eq('id', itemId);
        if (error) { 
            console.error("Move Folder Error:", error);
            if (oldItem) setItems(prev => prev.map(item => String(item.id) === strId ? oldItem : item));
            showToast("Failed to move item. Reverting...", true); 
        }
    }
  };

  const moveItemToList = async (itemId: string | number, listName: string) => {
    const strId = String(itemId);
    const oldItem = items.find(i => String(i.id) === strId);
    setItems(prev => prev.map(item => String(item.id) === strId ? { ...item, list_name: listName } : item));
    showToast(`Added to list ${listName}`);
    if (!strId.startsWith('temp-')) {
        const { error } = await supabase.from('assets').update({ list_name: listName }).eq('id', itemId);
        if (error) { 
            console.error("Move List Error:", error);
            if (oldItem) setItems(prev => prev.map(item => String(item.id) === strId ? oldItem : item));
            showToast("Failed to add to list. Reverting...", true); 
        }
    }
  };

  const bulkMoveToFolder = async (ids: (string | number)[], folderName: string) => {
    const strIds = ids.map(String);
    const oldItems = items.filter(i => strIds.includes(String(i.id)));
    
    setItems(prev => prev.map(item => strIds.includes(String(item.id)) ? { ...item, sections: [folderName], section: undefined } : item));
    showToast(`Moved ${ids.length} items to ${folderName}`);
    
    const realIds = ids.filter(id => !String(id).startsWith('temp-'));
    if (realIds.length > 0) {
        const { error } = await supabase.from('assets').update({ sections: [folderName] }).in('id', realIds);
        if (error) {
            console.error("Bulk Move Folder Error:", error);
            setItems(prev => prev.map(item => {
                const old = oldItems.find(o => String(o.id) === String(item.id));
                return old ? old : item;
            }));
            showToast("Bulk move failed. Reverting...", true); 
        }
    }
  };

  const bulkMoveToList = async (ids: (string | number)[], listName: string) => {
    const strIds = ids.map(String);
    const oldItems = items.filter(i => strIds.includes(String(i.id)));
    
    setItems(prev => prev.map(item => strIds.includes(String(item.id)) ? { ...item, list_name: listName } : item));
    showToast(`Added ${ids.length} items to ${listName}`);
    
    const realIds = ids.filter(id => !String(id).startsWith('temp-'));
    if (realIds.length > 0) {
        const { error } = await supabase.from('assets').update({ list_name: listName }).in('id', realIds);
        if (error) {
            console.error("Bulk Move List Error:", error);
            setItems(prev => prev.map(item => {
                const old = oldItems.find(o => String(o.id) === String(item.id));
                return old ? old : item;
            }));
            showToast("Bulk add failed. Reverting...", true); 
        }
    }
  };

  const bulkMoveToTrash = async (ids: (string | number)[]) => {
    const strIds = ids.map(String);
    const oldItems = items.filter(i => strIds.includes(String(i.id)));
    
    setItems(prev => prev.map(item => strIds.includes(String(item.id)) ? { ...item, is_deleted: true } : item));
    showToast(`Moved ${ids.length} items to Trash`);
    
    const realIds = ids.filter(id => !String(id).startsWith('temp-'));
    if (realIds.length > 0) {
        const { error } = await supabase.from('assets').update({ is_deleted: true }).in('id', realIds);
        if (error) {
            console.error("Bulk Trash Error:", error);
            setItems(prev => prev.map(item => {
                const old = oldItems.find(o => String(o.id) === String(item.id));
                return old ? old : item;
            }));
            showToast("Bulk delete failed. Reverting...", true); 
        }
    }
  };

  const bulkRestoreFromTrash = async (ids: (string | number)[]) => {
    const strIds = ids.map(String);
    const oldItems = items.filter(i => strIds.includes(String(i.id)));
    
    setItems(prev => prev.map(item => strIds.includes(String(item.id)) ? { ...item, is_deleted: false } : item));
    showToast(`Restored ${ids.length} items`);
    
    const realIds = ids.filter(id => !String(id).startsWith('temp-'));
    if (realIds.length > 0) {
        const { error } = await supabase.from('assets').update({ is_deleted: false }).in('id', realIds);
        if (error) {
            console.error("Bulk Restore Error:", error);
            setItems(prev => prev.map(item => {
                const old = oldItems.find(o => String(o.id) === String(item.id));
                return old ? old : item;
            }));
            showToast("Bulk restore failed.", true); 
        }
    }
  };

  const bulkHardDelete = async (ids: (string | number)[]) => {
    const strIds = ids.map(String);
    setItems(prev => prev.filter(item => !strIds.includes(String(item.id))));
    showToast(`Permanently deleted ${ids.length} items`);
    
    const realIds = ids.filter(id => !String(id).startsWith('temp-'));
    if (realIds.length > 0) {
        const { error } = await supabase.from('assets').delete().in('id', realIds);
        if (error) {
            console.error("Bulk Hard Delete Error:", error);
            showToast("Bulk hard delete failed.", true); 
        }
    }
  };

  const bulkPinItems = async (ids: (string | number)[]) => {
    const strIds = ids.map(String);
    const oldItems = items.filter(i => strIds.includes(String(i.id)));
    
    setItems(prev => prev.map(item => strIds.includes(String(item.id)) ? { ...item, is_pinned: true } : item));
    showToast(`Pinned ${ids.length} items`);
    
    const realIds = ids.filter(id => !String(id).startsWith('temp-'));
    if (realIds.length > 0) {
        const { error } = await supabase.from('assets').update({ is_pinned: true }).in('id', realIds);
        if (error) {
            console.error("Bulk Pin Error:", error);
            setItems(prev => prev.map(item => {
                const old = oldItems.find(o => String(o.id) === String(item.id));
                return old ? old : item;
            }));
            showToast("Failed to pin items. Reverting...", true); 
        }
    }
  };

  const bulkChangeType = async (ids: (string | number)[], type: string) => {
    const strIds = ids.map(String);
    const oldItems = items.filter(i => strIds.includes(String(i.id)));
    
    setItems(prev => prev.map(item => strIds.includes(String(item.id)) ? { ...item, type } : item));
    showToast(`Changed type for ${ids.length} items`);
    
    const realIds = ids.filter(id => !String(id).startsWith('temp-'));
    if (realIds.length > 0) {
        const { error } = await supabase.from('assets').update({ type }).in('id', realIds);
        if (error) {
            console.error("Bulk Type Change Error:", error);
            setItems(prev => prev.map(item => {
                const old = oldItems.find(o => String(o.id) === String(item.id));
                return old ? old : item;
            }));
            showToast("Failed to change type.", true); 
        }
    }
  };

  const toggleItemReaction = async (item: BentoItem, emoji: string, userId: string) => {
     let currentReactions: Record<string, string[]> = {};
     try { currentReactions = item.likes ? JSON.parse(item.likes) : {}; } catch {}

     const reactions = { ...currentReactions };
     if (!reactions[emoji]) reactions[emoji] = [];

     if (reactions[emoji].includes(userId)) {
        reactions[emoji] = reactions[emoji].filter(id => id !== userId);
        if (reactions[emoji].length === 0) delete reactions[emoji];
     } else {
        reactions[emoji].push(userId);
     }

     const reactionsString = Object.keys(reactions).length > 0 ? JSON.stringify(reactions) : null;
     setItems(prev => prev.map(i => String(i.id) === String(item.id) ? { ...i, likes: reactionsString as any } : i));
     
     if (!String(item.id).startsWith('temp-')) {
        try {
           const { error } = await supabase.from('assets').update({ likes: reactionsString }).eq('id', item.id);
           if (error) throw error;
        } catch (e) { 
           console.error("Toggle Reaction Error:", e);
           showToast("Failed to save reaction", true); 
           setItems(prev => prev.map(i => String(i.id) === String(item.id) ? { ...i, likes: item.likes } : i));
        }
     }
  };

  const toggleChecklistItem = async (item: BentoItem, clItemId: string) => {
     if (!item.checklist_items) return;
     const newItems = item.checklist_items.map((ci: any) => ci.id === clItemId ? { ...ci, checked: !ci.checked } : ci );
     setItems(prev => prev.map(i => String(i.id) === String(item.id) ? { ...i, checklist_items: newItems } : i));
     
     if (!String(item.id).startsWith('temp-')) {
         try { 
             const { error } = await supabase.from('assets').update({ checklist_items: newItems }).eq('id', item.id); 
             if (error) throw error;
         } catch (e) { 
             console.error("Toggle Checklist Error:", e);
             setItems(prev => prev.map(i => String(i.id) === String(item.id) ? { ...i, checklist_items: item.checklist_items } : i));
             showToast("Failed to update checklist", true); 
         }
     }
  };

  const updateStickyNote = async (id: string | number, newSummary: string) => {
    const strId = String(id);
    const oldItem = items.find(i => String(i.id) === strId);
    setItems(prev => prev.map(item => String(item.id) === strId ? { ...item, ai_summary: newSummary } : item));
    if (!strId.startsWith('temp-')) {
        const { error } = await supabase.from('assets').update({ ai_summary: newSummary }).eq('id', id);
        if (error) { 
            console.error("Sticky Note Update Error:", error);
            if (oldItem) setItems(prev => prev.map(item => String(item.id) === strId ? oldItem : item));
            showToast("Failed to save note.", true); 
        }
    }
  };

  const moveToTrash = async (id: string | number) => { bulkMoveToTrash([id]); };
  const restoreFromTrash = async (id: string | number) => { bulkRestoreFromTrash([id]); };
  const hardDelete = async (id: string | number) => { bulkHardDelete([id]); };

  const emptyTrash = async () => {
    setItems(prev => prev.filter(item => !item.is_deleted));
    showToast("Trash Emptied");
    const { error } = await supabase.from('assets').delete().eq('is_deleted', true);
    if (error) { 
       console.error("Empty Trash Error:", error);
       showToast("Failed to empty trash. Refresh to sync.", true); 
    }
  };

  const renameFolder = async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    setItems(prev => prev.map(item => ({ ...item, sections: item.sections?.map(s => s === oldName ? trimmed : s) })));
    const itemsToUpdate = items.filter(i => i.sections?.includes(oldName));
    try {
        for(const item of itemsToUpdate) {
            const newSecs = item.sections?.map(s => s === oldName ? trimmed : s) || [];
            await supabase.from('assets').update({ sections: newSecs }).eq('id', item.id);
        }
    } catch (e) { 
       console.error("Rename Folder Error:", e);
       showToast("Failed to rename folder.", true); 
    }
  };

  const deleteFolder = async (folderName: string) => {
    setItems(prev => prev.map(item => ({ ...item, sections: item.sections?.filter(s => s !== folderName) })));
    const itemsToUpdate = items.filter(i => i.sections?.includes(folderName));
    try {
        for(const item of itemsToUpdate) {
            const newSecs = item.sections?.filter(s => s !== folderName) || [];
            await supabase.from('assets').update({ sections: newSecs.length ? newSecs : null }).eq('id', item.id);
        }
    } catch (e) { 
       console.error("Delete Folder Error:", e);
       showToast("Failed to delete folder.", true); 
    }
  };

  const renameList = async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    setItems(prev => prev.map(item => item.list_name === oldName ? { ...item, list_name: trimmed } : item));
    const itemsToUpdate = items.filter(i => i.list_name === oldName);
    try {
        for(const item of itemsToUpdate) {
           await supabase.from('assets').update({ list_name: trimmed }).eq('id', item.id);
        }
    } catch (e) { 
       console.error("Rename List Error:", e);
       showToast("Failed to rename list.", true); 
    }
  };

  const deleteList = async (listName: string) => {
    setItems(prev => prev.map(item => item.list_name === listName ? { ...item, list_name: undefined } : item));
    const itemsToUpdate = items.filter(i => i.list_name === listName);
    try {
        for(const item of itemsToUpdate) {
            await supabase.from('assets').update({ list_name: null }).eq('id', item.id);
        }
    } catch (e) { 
       console.error("Delete List Error:", e);
       showToast("Failed to delete list.", true); 
    }
  };

  return {
    items, setItems, customFolders, setCustomFolders, customLists, setCustomLists,
    isLoading, page, setPage, hasMore, fetchItems, saveNote, insertItem, updateItemTags, moveItemToFolder, moveItemToList, updateStickyNote, toggleItemReaction, toggleChecklistItem,
    moveToTrash, restoreFromTrash, hardDelete, emptyTrash, renameFolder, deleteFolder, renameList, deleteList,
    bulkMoveToFolder, bulkMoveToList, bulkMoveToTrash, bulkRestoreFromTrash, bulkHardDelete,
    bulkPinItems, bulkChangeType,
    recentIds, setRecentIds
  };
}