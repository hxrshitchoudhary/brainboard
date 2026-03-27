// filepath: hooks/useTeamSpace.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from '@/lib/supabase';
import { BentoItem, NotificationItem, ChatMessage } from "@/app/types";
import { cleanName } from "@/lib/utils";

export function useTeamSpace(
  session: any, 
  teamWorkspaceId: string, 
  isChatOpen: boolean, 
  navWorkspace: string, 
  showToast: (msg: string, isError?: boolean) => void,
  setItems: React.Dispatch<React.SetStateAction<BentoItem[]>>,
  updateUi: Function,
  chatScrollRef: React.RefObject<HTMLDivElement | null>
) {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [teamRole, setTeamRole] = useState<string>('viewer'); // Changed back to secure default
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  const isChatOpenRef = useRef(isChatOpen);
  const navWorkspaceRef = useRef(navWorkspace);
  const onlineUsersRef = useRef<string[]>([]);

  useEffect(() => { isChatOpenRef.current = isChatOpen; }, [isChatOpen]);
  useEffect(() => { navWorkspaceRef.current = navWorkspace; }, [navWorkspace]);
  useEffect(() => { onlineUsersRef.current = onlineUsers; }, [onlineUsers]);

  // Load notifications from local storage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && session?.user?.id) {
       const saved = localStorage.getItem(`bb-notifications-${session.user.id}`);
       if (saved) {
           try {
               setNotifications(JSON.parse(saved).map((n: any) => ({ ...n, time: new Date(n.time) })));
           } catch (e) {}
       }
    }
  }, [session?.user?.id]);

  // Persist notifications to local storage
  useEffect(() => {
    if (typeof window !== 'undefined' && session?.user?.id) {
        localStorage.setItem(`bb-notifications-${session.user.id}`, JSON.stringify(notifications.slice(0, 50)));
    }
  }, [notifications, session?.user?.id]);

  const fetchProfilesAndRole = useCallback(async (currentUser: any) => {
    try {
      const { data: workspaceData } = await supabase.from('workspace_members').select('*').eq('workspace_id', teamWorkspaceId);
      const { data: profilesData } = await supabase.from('profiles').select('*');
      
      let currentWorkspaceData = workspaceData || [];

      // Check if user is in workspace.
      if (currentUser && !currentWorkspaceData.find(w => w.user_id === currentUser.id)) {
          const isFirstUser = currentWorkspaceData.length === 0;
          const assignedRole = isFirstUser ? 'admin' : 'viewer'; // Only the very first user gets admin
          
          const { error } = await supabase.from('workspace_members').insert({
              workspace_id: teamWorkspaceId,
              user_id: currentUser.id,
              role: assignedRole
          });
          
          if (!error) {
             currentWorkspaceData.push({ workspace_id: teamWorkspaceId, user_id: currentUser.id, role: assignedRole });
          }
      }

      if (profilesData) {
          const profileMap = new Map();

          profilesData.forEach(p => {
              const memberInfo = currentWorkspaceData.find(w => w.user_id === p.id);
              const isInWorkspace = (!!memberInfo && memberInfo.role !== 'none') || p.id === currentUser?.id;
              let r = memberInfo ? memberInfo.role : 'viewer'; 

              profileMap.set(p.id, {
                id: p.id, 
                name: cleanName(p.display_name) || p.username || 'Authenticated User',
                username: p.username || '',
                bio: p.bio || '',
                avatar: p.avatar_url || `https://api.dicebear.com/9.x/shapes/svg?seed=${p.id}`,
                status: (p.id === currentUser?.id || onlineUsersRef.current.includes(p.id)) ? 'online' : 'offline', 
                lastSeen: new Date(p.updated_at || Date.now()),
                role: r,
                inWorkspace: isInWorkspace
              });
          });
          
          if (!profileMap.has(currentUser?.id) && currentUser) {
              const myMemberInfo = currentWorkspaceData.find(w => w.user_id === currentUser.id);
              profileMap.set(currentUser.id, {
                  id: currentUser.id, 
                  name: cleanName(currentUser.user_metadata?.display_name || currentUser.email) || "You",
                  username: currentUser.user_metadata?.username || "",
                  avatar: currentUser.user_metadata?.avatar_url || `https://api.dicebear.com/9.x/shapes/svg?seed=${currentUser.email}`,
                  status: 'online', 
                  lastSeen: new Date(),
                  role: myMemberInfo ? myMemberInfo.role : 'viewer',
                  inWorkspace: true
              });
          }
          
          const mappedArray = Array.from(profileMap.values());
          setTeamMembers(mappedArray);

          const myProfile = mappedArray.find(m => m.id === currentUser?.id);
          if (!myProfile || !myProfile.username || !myProfile.name || myProfile.name === 'Authenticated User') {
              updateUi({ showOnboarding: true });
          } else {
              // Simply set the role to whatever the database says. No auto-upgrading!
              setTeamRole(myProfile.role || 'viewer');
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

    const presenceChannel = supabase.channel('team_presence', {
        config: { presence: { key: session.user.id } }
    });

    presenceChannel.on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const activeIds = Object.keys(state);
        setOnlineUsers(activeIds);
        
        setTeamMembers(prev => prev.map(m => ({
            ...m,
            status: activeIds.includes(m.id) ? 'online' : 'offline'
        })));
    })
    .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await presenceChannel.track({ online_at: new Date().toISOString() });
        }
    });

    const profilesWatcher = supabase.channel('profiles_watcher')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
            fetchProfilesAndRole(session.user);
        }).subscribe();

    const workspaceWatcher = supabase.channel('workspace_watcher')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_members', filter: `workspace_id=eq.${teamWorkspaceId}` }, () => {
            fetchProfilesAndRole(session.user);
        }).subscribe();

    const uniqueAssetChannel = `realtime_assets_${Math.random().toString(36).substring(7)}`;
    const uniqueChatChannel = `realtime_messages_${Math.random().toString(36).substring(7)}`;

    const assetChannel = supabase.channel(uniqueAssetChannel)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets', filter: `workspace_id=eq.${teamWorkspaceId}` }, (payload) => {
         if (payload.eventType === 'INSERT') {
             if (payload.new.user_id !== session.user.id) {
                const creatorName = cleanName(payload.new.creator) || 'A team member';
                const itemType = payload.new.type === 'video' ? (payload.new.url?.includes('instagram') ? 'Reel' : 'Video') : (payload.new.type || 'item');
                setNotifications(prev => [{ id: payload.new.id, text: `${creatorName} added a new ${itemType}.`, time: new Date(payload.new.created_at || new Date()), read: false }, ...prev]);
                setItems(prev => [payload.new as BentoItem, ...prev]);
                
                if (navWorkspaceRef.current === 'personal') showToast(`🏢 Team: ${creatorName} shared a new ${itemType}!`);
                else showToast(`${creatorName} shared a new ${itemType}!`);
             }
         } else if (payload.eventType === 'UPDATE') {
             setItems(prev => prev.map(item => item.id === payload.new.id ? payload.new as BentoItem : item));
         } else if (payload.eventType === 'DELETE') {
             setItems(prev => prev.filter(item => item.id !== payload.old.id));
         }
      }).subscribe();

    const chatChannel = supabase.channel(uniqueChatChannel)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages', filter: `workspace_id=eq.${teamWorkspaceId}` }, (payload) => {
         setChatMessages(prev => [...prev, payload.new as ChatMessage]);
         setTimeout(() => { if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; }, 100);
         if (payload.new.user_id !== session.user.id && !isChatOpenRef.current) {
            setNotifications(prev => [{ id: `msg-${payload.new.id}`, text: `New message from ${cleanName(payload.new.creator_name)}`, time: new Date(payload.new.created_at || new Date()), read: false }, ...prev]);
            
            if (navWorkspaceRef.current === 'personal') showToast(`💬 Team Chat: New message from ${cleanName(payload.new.creator_name)}`);
            else showToast(`New message from ${cleanName(payload.new.creator_name)}`);
         }
      }).subscribe();

    return () => { 
        supabase.removeChannel(presenceChannel);
        supabase.removeChannel(profilesWatcher);
        supabase.removeChannel(workspaceWatcher);
        supabase.removeChannel(assetChannel); 
        supabase.removeChannel(chatChannel); 
    }
  }, [session?.user?.id, teamWorkspaceId, setItems, showToast, chatScrollRef, fetchProfilesAndRole]);

  const handleUpdateMemberRole = async (targetUserId: string, newRole: string) => {
     // Optimistic UI Update
     setTeamMembers(prev => prev.map(m => m.id === targetUserId ? { ...m, role: newRole, inWorkspace: newRole !== 'none' } : m));

     try {
         if (newRole === 'none') {
             const { error } = await supabase.from('workspace_members')
                 .delete()
                 .eq('workspace_id', teamWorkspaceId)
                 .eq('user_id', targetUserId);
             if (error) throw error;
         } else {
             const { data: existing } = await supabase.from('workspace_members')
                 .select('user_id')
                 .eq('workspace_id', teamWorkspaceId)
                 .eq('user_id', targetUserId)
                 .maybeSingle();

             if (existing) {
                 const { error } = await supabase.from('workspace_members')
                     .update({ role: newRole })
                     .eq('workspace_id', teamWorkspaceId)
                     .eq('user_id', targetUserId);
                 if (error) throw error;
             } else {
                 const { error } = await supabase.from('workspace_members')
                     .insert({ workspace_id: teamWorkspaceId, user_id: targetUserId, role: newRole });
                 if (error) throw error;
             }
         }
         
         showToast(newRole === 'none' ? "Removed from team." : `Role updated to ${newRole}.`);
         fetchProfilesAndRole(session.user);
     } catch (e: any) {
         showToast(e.message || "Failed to update role", true);
         console.error("Role Update Error:", e);
         // Revert the optimistic update on failure
         fetchProfilesAndRole(session.user);
     }
  };

  const handleMarkAsRead = (id: string | number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };
  
  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return {
    teamMembers, notifications, chatMessages, setChatMessages, teamRole,
    fetchProfilesAndRole, handleUpdateMemberRole, handleMarkAsRead, handleMarkAllAsRead
  };
}