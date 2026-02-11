

## AI Assistant SaaS — Implementation Plan

### Phase 1: Authentication & Layout
- Set up Supabase Auth with email/password login and signup
- Create a dark-mode-first app shell with a collapsible sidebar and main chat area
- Build responsive layout that works on mobile and desktop
- Add user profile storage (display name, preferences)

### Phase 2: Streaming Chat Core
- Create a Supabase Edge Function that connects to the Lovable AI Gateway with streaming SSE responses
- Build the chat interface with real-time token-by-token message rendering
- Support markdown and code block formatting in AI responses
- Add typing animation, copy-to-clipboard button, and loading states
- Implement model selection (Gemini Pro / Flash) and tone selector (Professional, Friendly, Mentor)

### Phase 3: Conversation Management
- Store all conversations and messages in Supabase with per-user RLS policies
- Sidebar listing all conversations with search, rename, and delete
- "New Chat" button to start fresh conversations
- Edit a sent message and regenerate the AI response
- Auto-title conversations based on the first message (using AI)

### Phase 4: Memory System
- Short-term memory: send the last 10-15 messages as context
- Long-term memory: store user preferences and facts in a dedicated table
- Auto-summarize older messages when context gets too long
- Conversation tagging for organization

### Phase 5: Voice Support
- Add a microphone button using the browser's Web Speech API for speech-to-text
- Add text-to-speech playback for AI responses using the SpeechSynthesis API
- Auto-send message after voice input is complete
- Visual indicators for recording state

### Phase 6: Polish & UX
- Dark mode toggle (dark by default)
- Smooth animations and transitions
- Loading skeletons while data fetches
- Toast notifications for errors and actions
- Mobile-responsive sidebar (sheet/drawer on small screens)
- Token usage display per conversation

