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