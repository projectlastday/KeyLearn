# Database Schema & Models

*Updated after implementing persistence for Topics, Workspaces, Chat Sessions, and Messages.*

## 1. `users`
Standard authentication table, updated to support Google OAuth.
*   `id` (PK)
*   `name` (string)
*   `email` (string, unique)
*   `password` (string, nullable) - Nullable to support users returning exclusively via Google login.
*   `google_id` (string, nullable, unique) - Unique identifier from Google.
*   `avatar` (string, nullable) - Stores the Google profile picture URL.
*   `created_at`, `updated_at`
*   **Relationships:** `hasMany(Topic)`, `hasMany(Workspace)`

## 2. `topics` ✅ MIGRATED & ACTIVE
Organizes workspaces by categories/subjects, matching the Topic Management UI.
*   `id` (PK, bigIncrements)
*   `user_id` (FK -> users.id, CASCADE on delete)
*   `name` (string, max:100) - e.g., "Sosial"
*   `color_code` (string, max:20, nullable) - For UI styling purposes based on style.md
*   `created_at`, `updated_at`, `deleted_at` (SoftDeletes)
*   **Unique constraint:** `(user_id, name, deleted_at)` — prevents duplicate active topic names per user, while allowing soft-deleted ones.
*   **Model:** `App\Models\Topic` — `belongsTo(User)`, `hasMany(Workspace)`
*   **Controller:** `TopicController` — Full CRUD via `/api/topics`

## 3. `workspaces` ✅ MIGRATED & ACTIVE
Represents a subject/folder created by a user.
*   `id` (PK, bigIncrements)
*   `user_id` (FK -> users.id, CASCADE on delete)
*   `topic_id` (FK -> topics.id, CASCADE on delete) - NOT nullable, every workspace must belong to a topic.
*   `title` (string, max:100) - e.g., "Fisika Dasar"
*   `description` (text, nullable)
*   `created_at`, `updated_at`, `deleted_at` (SoftDeletes)
*   **Model:** `App\Models\Workspace` — `belongsTo(User)`, `belongsTo(Topic)`, `hasMany(ChatSession)`
*   **Controller:** `WorkspaceController` — `index` (Inertia page), `store`/`update`/`destroy` (JSON API)

## 4. `documents`
Represents the physical files (PDFs) uploaded into a workspace.
*   `id` (PK)
*   `workspace_id` (FK -> workspaces.id)
*   `filename` (string) - Original file name
*   `file_path` (string) - Storage path
*   `file_hash` (string) - MD5/SHA256 reference to prevent duplicate ingestion
*   `file_size` (integer) - Size in bytes
*   `mime_type` (string)
*   `status` (enum: 'pending', 'processing', 'completed', 'failed') - RAG ingestion status
*   `created_at`, `updated_at`, `deleted_at` (SoftDeletes)

## 5. `document_chunks`
Stores the extracted text blocks for the Vector Database (if using relational DB pgvector, or acts as a reference for external vector DB like Pinecone/Qdrant).
*   `id` (PK)
*   `document_id` (FK -> documents.id)
*   `content` (text) - The actual chunked text
*   `embedding` (vector/json) - The vector representation
*   `page_number` (integer) - For citations
*   `created_at`, `updated_at`

## 6. `chat_sessions` ✅ MIGRATED & ACTIVE
Groups messages within a workspace.
*   `id` (PK, bigIncrements)
*   `workspace_id` (FK -> workspaces.id, CASCADE on delete)
*   `title` (string, max:100, default: 'Obrolan Baru') - Auto-generated based on first prompt
*   `active_persona` (string, max:50, nullable) - Reserved for future persona persistence.
*   `selected_ai_model` (string, max:50, nullable) - Stores the selected AI model
*   `created_at`, `updated_at`, `deleted_at` (SoftDeletes)
*   **Model:** `App\Models\ChatSession` — `belongsTo(Workspace)`, `hasMany(Message)`
*   **Implementation note:** `active_persona` is currently not written/read by active controllers and has been removed from model `$fillable` to avoid accidental mass assignment until the feature is implemented.
*   **Controller:** `ChatSessionController` — `show` (Inertia page with messages), `store`/`update`/`destroy` (JSON API)

## 7. `messages` ✅ MIGRATED & ACTIVE
Individual messages inside a chat session.
*   `id` (PK, bigIncrements)
*   `chat_session_id` (FK -> chat_sessions.id, CASCADE on delete)
*   `role` (string, max:20) - 'user' or 'assistant'
*   `content` (longText)
*   `ai_model_used` (string, max:50, nullable) - Specific model used for generation
*   `prompt_tokens` (integer, nullable) - Reserved for future token/cost tracking.
*   `completion_tokens` (integer, nullable) - Reserved for future token/cost tracking.
*   `created_at`, `updated_at`
*   **Model:** `App\Models\Message` — `belongsTo(ChatSession)`
*   **Implementation note:** `prompt_tokens` and `completion_tokens` are currently not persisted by `MessageController` and were removed from model `$fillable` until usage tracking is implemented.
*   **Controller:** `MessageController` — `store` via `POST /api/chat/{chatSession}/message` (saves user msg, calls Gemini, saves AI reply)

## 8. `message_citations` (Pivot) — Future
Links an AI message to the specific document chunks it used as reference.
*   `id` (PK)
*   `message_id` (FK -> messages.id)
*   `document_chunk_id` (FK -> document_chunks.id)

## 9. `message_proposals` (Consensus Mode Audit) — Future
Stores individual proposer responses before aggregation during Consensus Mode.
*   `id` (PK)
*   `message_id` (FK -> messages.id)
*   `proposer_model` (string) - The specific agent (e.g., 'claude-3-haiku')
*   `content` (text) - Raw answer from this agent
*   `created_at`, `updated_at`

## 10. Future Implementations (Auto-Study Tools)
*   **`flashcards`**: `id`, `workspace_id`, `front_text`, `back_text`, `next_review_date`
*   **`quizzes`**: `id`, `workspace_id`, `score`

## Cascade Delete Chain
`User` → `Topics` → `Workspaces` → `ChatSessions` → `Messages`
All handled at the database level via foreign key `CASCADE ON DELETE` constraints. Additionally, Topics, Workspaces, and ChatSessions utilize Eloquent `SoftDeletes` behavior, allowing them to be sent to a UI "Tong Sampah" (Trashcan) where they can be either permanently destroyed or explicitly restored.
