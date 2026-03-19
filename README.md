🧠 Brainboard
Curate your mind. The impossibly clean, highly visual workspace designed for teams and individuals. Drop links, write notes, organize media, and collaborate in real-time on a unified canvas.

✨ Key Features
Brainboard bridges the gap between a standard web app and a native desktop experience, featuring fluid animations and complex state management.

🎨 Desktop-Class UX
Dynamic Views: Instantly toggle between Masonry Grid, Uniform Cards, Detailed List, and Calendar views.

Advanced Multi-Selection: Standard OS-level Shift + Click gesture support for bulk selection.

Floating Action Bar: Context-aware bulk actions (Move to Folder, Add to List, Trash, Restore) that appear only when needed.

Drag & Drop Architecture: Native file dropping for instant uploads, and drag-to-folder organization for cards.

Context Menus: Right-click anywhere on a card to instantly access organization and editing tools.

Keyboard Shortcuts: Press k (Cmd/Ctrl) for the global command palette, Esc to clear selections, and Delete/Backspace for instant bulk-trashing.

📝 Rich Content & Media
Smart Link Extraction: Paste Instagram Reels or YouTube URLs to automatically extract titles, channel names, and high-quality thumbnails (bypassing CORS via Noembed).

Multimedia Support: Upload and preview Images, Videos, Audio files, and Documents.

Note Engine: Create rich-text notes with Markdown-style hotkeys (bold, italic, strikethrough, blockquotes, code blocks) and floating sticky-note summaries.

Interactive Checklists: Inline, clickable to-do lists directly on the dashboard cards.

Native Reactions: Apple-style emoji reaction engine with real-time user attribution tooltips.

🤝 Team Collaboration
Workspaces: Seamlessly toggle between "Personal" and "Team" environments.

Real-Time Presence: Live indicators showing who is currently online or when they were last seen.

Team Chat Drawer: A built-in, slide-out communication hub with @mention support.

Notification Center: Real-time activity feed to track team updates.

🛠 Tech Stack
Framework: Next.js (React)

Styling: Tailwind CSS

Animations: Framer Motion (Spring physics, layout transitions, AnimatePresence)

Backend as a Service: Supabase (PostgreSQL, Auth, Storage buckets)

State Management: Zustand (useAppStore)

Icons: Lucide React

Date Parsing: date-fns

Command Palette: cmdk

🚀 Getting Started
Follow these steps to set up Brainboard locally.

Prerequisites
Node.js (v18 or higher)

npm, pnpm, or yarn

A Supabase account with configured Database and Storage Buckets

1. Clone the repository
Bash
git clone https://github.com/yourusername/brainboard.git
cd brainboard
2. Install dependencies
Bash
npm install
# or
yarn install
3. Environment Setup
Create a .env.local file in the root of your project and add your Supabase credentials:

Code snippet
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
4. Database Setup (Supabase)
Ensure your Supabase project has the following tables configured:

profiles (id, display_name, username, avatar_url, bio, updated_at)

assets (id, user_id, workspace_id, creator, type, title, content, url, thumbnail_url, video_url, img, is_pinned, sections, list_name, ai_summary, is_checklist, checklist_items, tags, likes, scheduled_for, is_deleted)

team_messages (id, workspace_id, user_id, creator_name, creator_avatar, text, created_at)

Storage Bucket: Create a public bucket named media for avatar and file uploads.

5. Run the development server
Bash
npm run dev
# or
yarn dev
Open http://localhost:3000 with your browser to see the result. Note: Brainboard is optimized for Desktop displays.

📂 Project Structure Overview
Plaintext
brainboard/
├── app/
│   ├── page.tsx               # Main Dashboard & Layout logic
│   └── types.ts               # Global TypeScript interfaces
├── components/
│   ├── board/
│   │   ├── MemoizedMasonryCard.tsx # Core card UI, menus, and drag-and-drop
│   │   └── ReactionBar.tsx    # Emoji reaction engine
│   ├── chat/
│   │   └── TeamChatDrawer.tsx # Slide-out team communication
│   ├── layout/
│   │   └── SidebarEditableItem.tsx # Sidebar navigation & drop zones
│   ├── modals/
│   │   ├── NoteEditorModal.tsx # Fullscreen rich text editor
│   │   └── ...                 # Settings, Media Viewer, Auth modals
│   └── ui/
│       └── RobustTextareaEditor.tsx # Expanding textarea component
├── hooks/
│   ├── useBrainboardData.ts   # Supabase CRUD & Bulk Action logic
│   └── useTeamSpace.ts        # Real-time presence & chat logic
├── lib/
│   ├── supabase.ts            # Supabase client initialization
│   └── utils.ts               # Framer Motion spring configs & string formatters
└── store/
    └── useAppStore.ts         # Zustand global UI state