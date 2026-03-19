import { create } from 'zustand';

export interface AppState {
  ui: {
    isAuthLoading: boolean; isSaving: boolean; showOnboarding: boolean; isAccountOpen: boolean;
    settingsTab: 'account' | 'team'; showTeamPresence: boolean; showNotifications: boolean;
    isChatOpen: boolean; isUploading: boolean; isDragging: boolean; isAILoading: boolean;
    showLogoutConfirm: boolean; isSyncing: boolean;
  };
  nav: {
    category: string; categoryType: 'all' | 'folder' | 'list' | 'type' | 'trash' | 'pinned' | 'tag'; // Added 'tag'
    workspace: 'personal' | 'team'; viewMode: 'grid' | 'card' | 'list' | 'calendar';
    currentDate: Date;
  };
  profile: { displayName: string; username: string; bio: string; error: string; isSaving: boolean; usernameChanged: boolean; };
  sidebar: { isCreatingFolder: boolean; newFolderName: string; isCreatingList: boolean; newListName: string; };
  media: { item: any | null; isScrollMode: boolean; zoom: number; speed: number; };
  
  updateUi: (updates: Partial<AppState['ui']>) => void;
  updateNav: (updates: Partial<AppState['nav']>) => void;
  updateProfile: (updates: Partial<AppState['profile']>) => void;
  updateSidebar: (updates: Partial<AppState['sidebar']>) => void;
  updateMedia: (updates: Partial<AppState['media']>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  ui: { isAuthLoading: true, isSaving: false, showOnboarding: false, isAccountOpen: false, settingsTab: 'account', showTeamPresence: false, showNotifications: false, isChatOpen: false, isUploading: false, isDragging: false, isAILoading: false, showLogoutConfirm: false, isSyncing: false },
  nav: { category: "All", categoryType: 'all', workspace: 'team', viewMode: 'grid', currentDate: new Date() },
  profile: { displayName: "", username: "", bio: "", error: "", isSaving: false, usernameChanged: false },
  sidebar: { isCreatingFolder: false, newFolderName: "", isCreatingList: false, newListName: "" },
  media: { item: null, isScrollMode: false, zoom: 1, speed: 1 },
  
  updateUi: (updates) => set((state) => ({ ui: { ...state.ui, ...updates } })),
  updateNav: (updates) => set((state) => ({ nav: { ...state.nav, ...updates } })),
  updateProfile: (updates) => set((state) => ({ profile: { ...state.profile, ...updates } })),
  updateSidebar: (updates) => set((state) => ({ sidebar: { ...state.sidebar, ...updates } })),
  updateMedia: (updates) => set((state) => ({ media: { ...state.media, ...updates } })),
}));