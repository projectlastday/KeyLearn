# Implementation Plan: Database Persistence for Topics, Folders & Chats

## Current State (The Problem)

Everything lives in React `useState` only. On page refresh, all topics, folders (workspaces), and chat messages disappear. The `database.md` has a full schema blueprint, but zero migrations, models, or controllers exist for these tables.

**What exists today:**
- `users` table (with Google OAuth fields) — ✅ Migrated & working
- Routes use inline closures with hardcoded/query-string mock data
- Frontend creates entities with `Date.now()` IDs and stores them in component state
- Chat API (`/api/chat/message`) sends prompts to Gemini and returns the reply, but never saves anything

---

## Scope of This Plan

This plan covers **only the 3 core entities** needed to make the app survive a refresh:

1. **Topics** — category labels (e.g., "Sains", "Sosial")
2. **Workspaces** (Folders) — study folders under a topic
3. **Chat Sessions & Messages** — conversations and their message history

Document/PDF and RAG-related tables (`documents`, `document_chunks`, `message_citations`, `message_proposals`) are **out of scope** for now.

---

## Phase A: Database Layer (Migrations)

### A1. Create `topics` migration

| Column | Type | Notes |
|---|---|---|
| `id` | bigIncrements (PK) | |
| `user_id` | foreignId → users.id | CASCADE on delete |
| `name` | string(100) | |
| `color_code` | string(20), nullable | For future UI styling |
| `created_at`, `updated_at` | timestamps | |

**Unique constraint:** `(user_id, name)` — a user cannot have two topics with the same name.

### A2. Create `workspaces` migration

| Column | Type | Notes |
|---|---|---|
| `id` | bigIncrements (PK) | |
| `user_id` | foreignId → users.id | CASCADE on delete |
| `topic_id` | foreignId → topics.id | CASCADE on delete |
| `title` | string(100) | |
| `description` | text, nullable | For future use |
| `created_at`, `updated_at` | timestamps | |

**Note:** `topic_id` is NOT nullable. Every workspace must belong to a topic. This matches the current UI flow where a topic is always required when creating a folder.

### A3. Create `chat_sessions` migration

| Column | Type | Notes |
|---|---|---|
| `id` | bigIncrements (PK) | |
| `workspace_id` | foreignId → workspaces.id | CASCADE on delete |
| `title` | string(100) | Defaults to "Obrolan Baru" |
| `selected_ai_model` | string(50), nullable | e.g., "gemini-2.5-flash" |
| `active_persona` | string(50), nullable | For future persona feature |
| `created_at`, `updated_at` | timestamps | |

### A4. Create `messages` migration

| Column | Type | Notes |
|---|---|---|
| `id` | bigIncrements (PK) | |
| `chat_session_id` | foreignId → chat_sessions.id | CASCADE on delete |
| `role` | string(20) | 'user' or 'assistant' |
| `content` | longText | The message body |
| `ai_model_used` | string(50), nullable | Which model answered |
| `prompt_tokens` | integer, nullable | For future cost tracking |
| `completion_tokens` | integer, nullable | For future cost tracking |
| `created_at`, `updated_at` | timestamps | |

**Why not enum for `role`?** String is more flexible and avoids migration headaches when adding new roles (e.g., 'system') later.

### Migration Execution Order
```
1. create_topics_table
2. create_workspaces_table       (depends on topics)
3. create_chat_sessions_table    (depends on workspaces)
4. create_messages_table         (depends on chat_sessions)
```

---

## Phase B: Eloquent Models & Relationships

### B1. `Topic` model
- **belongsTo:** `User`
- **hasMany:** `Workspace`

### B2. `Workspace` model
- **belongsTo:** `User`, `Topic`
- **hasMany:** `ChatSession`

### B3. `ChatSession` model
- **belongsTo:** `Workspace`
- **hasMany:** `Message`
- Accessor to get `workspace.user_id` for authorization

### B4. `Message` model
- **belongsTo:** `ChatSession`

### Cascade Delete Chain
Deleting a User → cascades to Topics → cascades to Workspaces → cascades to ChatSessions → cascades to Messages. All handled at the database level via foreign key constraints.

---

## Phase C: Controllers (API Endpoints)

All controllers will be placed in `app/Http/Controllers/` and return JSON or Inertia responses as appropriate.

### C1. `TopicController`

| Method | Route | Action | Returns |
|---|---|---|---|
| `index` | GET `/api/topics` | List all topics for auth user | JSON array |
| `store` | POST `/api/topics` | Create new topic | JSON (new topic) |
| `update` | PUT `/api/topics/{topic}` | Rename topic | JSON (updated topic) |
| `destroy` | DELETE `/api/topics/{topic}` | Delete topic + cascade | 204 No Content |

**Validation on `store`:**
- `name`: required, string, max:100, unique for the user

### C2. `WorkspaceController`

| Method | Route | Action | Returns |
|---|---|---|---|
| `index` | GET `/workspaces` | Inertia page with all workspaces + topics | Inertia::render |
| `store` | POST `/api/workspaces` | Create new workspace | JSON (new workspace with topic) |
| `update` | PUT `/api/workspaces/{workspace}` | Rename workspace | JSON (updated workspace) |
| `destroy` | DELETE `/api/workspaces/{workspace}` | Delete workspace + cascade | 204 No Content |

**Key behavior on `index`:**
- Query all topics for the authenticated user
- Query all workspaces for the authenticated user (eager load `topic`)
- Pass both as Inertia props: `initialWorkspaces` and `initialTopics`
- This replaces the current empty closure that renders `Workspaces/Index` with no data

### C3. `ChatSessionController`

| Method | Route | Action | Returns |
|---|---|---|---|
| `show` | GET `/workspaces/{workspace}/chat/{chatSession}` | Inertia page with chat + messages | Inertia::render |
| `store` | POST `/api/workspaces/{workspace}/chat` | Create new chat session | JSON (redirect URL or new session) |
| `update` | PUT `/api/chat-sessions/{chatSession}` | Rename chat title | JSON (updated session) |
| `destroy` | DELETE `/api/chat-sessions/{chatSession}` | Delete chat session + messages | 204 No Content |

**Key behavior on `show`:**
- Load the workspace (with topic name)
- Load the chat session with all its messages (ordered by `created_at`)
- Load all user topics for sidebar
- Pass as Inertia props: `workspace`, `chat`, `allTopics`
- This replaces the current inline closure that builds mock data from URL query strings

### C4. `MessageController` (modify existing chat endpoint)

| Method | Route | Action | Returns |
|---|---|---|---|
| `store` | POST `/api/chat/{chatSession}/message` | Save user message, call Gemini, save AI reply | JSON (both messages) |

**Key behavior:**
1. Validate input (message text and/or file)
2. Save the **user message** to `messages` table (role: 'user')
3. Call Gemini API (existing logic)
4. Save the **AI reply** to `messages` table (role: 'assistant', record `ai_model_used`)
5. Return both message records as JSON

---

## Phase D: Route Restructuring

### Current `routes/web.php` problems:
- All logic is in inline closures (no controllers)
- Data comes from URL query strings instead of the database
- The chat API endpoint doesn't save anything

### New route structure:

```
// Public
GET  /                              → Welcome page (no change)

// Auth-protected (Inertia pages)
GET  /workspaces                    → WorkspaceController@index
GET  /workspaces/{workspace}/chat/{chatSession} → ChatSessionController@show

// Auth-protected (JSON APIs)
GET    /api/topics                  → TopicController@index
POST   /api/topics                  → TopicController@store
PUT    /api/topics/{topic}          → TopicController@update
DELETE /api/topics/{topic}          → TopicController@destroy

POST   /api/workspaces              → WorkspaceController@store
PUT    /api/workspaces/{workspace}  → WorkspaceController@update
DELETE /api/workspaces/{workspace}  → WorkspaceController@destroy

POST   /api/workspaces/{workspace}/chat          → ChatSessionController@store
PUT    /api/chat-sessions/{chatSession}           → ChatSessionController@update
DELETE /api/chat-sessions/{chatSession}           → ChatSessionController@destroy

POST   /api/chat/{chatSession}/message            → MessageController@store
```

---

## Phase E: Frontend Wiring Changes

### E1. `Workspaces/Index.jsx`

**What changes:**
- Receives `initialWorkspaces` and `initialTopics` as real Inertia props from the server (instead of empty defaults)
- `handleCreateTopic` → calls `axios.post('/api/topics', { name })`, then updates local state with the server response (real ID, not just a string)
- `handleCreateWorkspace` → calls `axios.post('/api/workspaces', { title, topic_id })`, then updates local state
- `handleSaveTitle` → calls `axios.put('/api/workspaces/{id}', { title })`
- Topics and workspaces in state now have real integer IDs from the database
- `handleCreateChat` → calls `axios.post('/api/workspaces/{id}/chat')`, gets back a real `chatSession.id`, then navigates with `router.visit`

**What stays the same:**
- All visual UI / layout / modals / animations — no CSS changes
- Search and filter logic stays client-side (filtering the server-loaded list)

### E2. `Workspaces/Chat/Index.jsx`

**What changes:**
- Receives `chat.messages` as a pre-populated array from the server (currently always `[]`)
- `handleSend` → calls `axios.post('/api/chat/{chatSession.id}/message')` instead of `/api/chat/message`
- On success, appends the **server-returned** message objects (with real IDs) to state
- `handleTitleSave` → calls `axios.put('/api/chat-sessions/{id}', { title })`

**What stays the same:**
- All visual UI — bubbles, model selector, file upload, loading dots
- File upload still sends via FormData (same mechanism)

### E3. `AppLayout.jsx`

**What changes:**
- Sidebar "Ruang Kerja" children now come from real server data
- The `topics` prop already flows correctly; it will just contain DB-backed topics now

---

## Phase F: Authorization & Security

Every controller action must verify ownership:

- **TopicController:** `$topic->user_id === auth()->id()`
- **WorkspaceController:** `$workspace->user_id === auth()->id()`
- **ChatSessionController:** `$chatSession->workspace->user_id === auth()->id()`
- **MessageController:** same as ChatSession (through the relationship)

Implementation approach: Use Laravel **Policy** classes or simple inline `abort_unless()` checks. Policies are preferred for maintainability.

---

## Execution Order (Step by Step)

| Step | Action | Files Created/Modified |
|---|---|---|
| 1 | Run `php artisan make:migration` ×4 | `database/migrations/` |
| 2 | Run `php artisan migrate` | Database |
| 3 | Create 4 Eloquent Models | `app/Models/Topic.php`, `Workspace.php`, `ChatSession.php`, `Message.php` |
| 4 | Create 4 Controllers | `app/Http/Controllers/TopicController.php`, etc. |
| 5 | Rewrite `routes/web.php` | `routes/web.php` |
| 6 | Update `Workspaces/Index.jsx` | Replace `useState`-only flow with API calls |
| 7 | Update `Workspaces/Chat/Index.jsx` | Wire `handleSend` and title edit to real endpoints |
| 8 | Test full flow | Create topic → create folder → create chat → send message → refresh → data persists |
| 9 | Update `database.md` and `roadmap.md` | Mark tasks complete |

---

## What This Plan Does NOT Cover (Future Phases)

- `documents` and `document_chunks` tables (PDF/RAG pipeline)
- `message_citations` and `message_proposals` tables (Consensus Mode)
- `flashcards` and `quizzes` tables (Auto-Study Tools)
- Delete UI for topics/workspaces/chats (can be added after persistence works)
- Chat session listing within a workspace (currently only "create new" exists, a list view will need the DB data)
