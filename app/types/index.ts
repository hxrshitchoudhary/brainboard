import { Session } from '@supabase/supabase-js';

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
  workspace_id?: string | null;
  type?: string; 
  title?: string;
  content?: string | null;
  url?: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  img?: string | null; 
  is_pinned?: boolean;
  tags?: string[] | null;
  section?: string;        
  sections?: string[] | null;   
  list_name?: string | null;    
  ai_summary?: string | null;   
  color?: string | null;
  is_checklist?: boolean;
  checklist_items?: { id: string, text: string, checked: boolean }[];
  creator?: string;
  creator_avatar?: string;
  likes?: string | null; 
  comments?: string | null; 
  is_deleted?: boolean;
  scheduled_for?: string | null;
  updated_at?: string;
  created_at?: string;
  client_timestamp?: number; // Safely added to prevent TypeScript errors
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