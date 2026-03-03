# Roadmap & Task Tracker

## Phase 1: Foundation & UI Shell
- [x] Initialize Laravel + React/Inertia.js project.
- [ ] Setup Tailwind CSS, Framer Motion, and global aesthetic tokens.
- [x] Integrate custom branding (Geometric SVG ApplicationLogo).
- [x] Build global Sidebar, Header, and layout wrapper (`AppLayout.jsx`).
- [ ] Implement responsive Dark/Light mode toggle.
- [x] Install and configure Laravel Breeze & Laravel Socialite (Google OAuth).
- [x] Update `users` table migration (nullable `password`, add `google_id`).
- [x] Build User Authentication views (Login/Register & Google Auth) tailored to the premium UI.
- [x] Configure MySQL database.
- [x] Create KeyLearn landing page (Beranda) with hero section and feature cards.
- [x] Removed auth middleware temporarily for visual testing, then strictly re-enabled it for all `/workspaces` and `/api` routes.
- [x] Removed stale Laravel Breeze `/dashboard` route; standard auth now redirects directly to `/workspaces`.
- [x] Dead code cleanup: Removed unused Laravel Breeze boilerplate (`ProfileController`, `ProfileUpdateRequest`, `Dashboard.jsx`, `Profile/` directory, `AuthenticatedLayout.jsx`, `Checkbox.jsx`, `DangerButton.jsx`, `SecondaryButton.jsx`).
- [x] Dead code cleanup (Auth + UI): Removed unused `Dropdown.jsx`, `Modal.jsx`, email verification and password confirmation flows (`VerifyEmail.jsx`, `ConfirmPassword.jsx`, related auth controllers/routes/tests), and stale `ProfileTest.php`.

## Phase 2: Workspaces & Document Management
- [x] Create `topics` table, Eloquent Model, and TopicController (Full CRUD API).
- [x] Create `workspaces` table, Eloquent Model, and WorkspaceController (Inertia index + CRUD API).
- [x] Build Workspace dashboard (List/Grid view of subjects).
- [x] Implement Topic Management, Topic Filters, and Search functionality.
- [x] De-hardcode Workspace data (server-side real data via Inertia props from database).
- [x] Wire frontend Topic creation to `POST /api/topics` (persisted to DB).
- [x] Wire frontend Workspace creation to `POST /api/workspaces` (persisted to DB).
- [x] Wire frontend Workspace rename to `PUT /api/workspaces/{id}` (persisted to DB).
- [x] Implement Soft Deletes (`deleted_at`) migration mapping for Topics, Workspaces, and Chat Sessions.
- [x] Build the "Tong Sampah" (Trashcan) UI within the sidebar and link it to a dedicated restore/hard-delete Controller.
- [x] Implement Delete Confirmation Popups across Topics, Workspaces, and Chats.
- [x] Conduct comprehensive UI/UX Audit to verify strict design system alignment.
- [x] Fix critical UI/UX Audit bugs (Auth redirect 404, React rendering crashes).
- [ ] Create `documents` and `document_chunks` tables.
- [ ] Implement PDF upload interface with drag-and-drop.
- [ ] Build backend PDF parsing and text chunking logic.
- [ ] Integrate Vector Embedding generation and storage.

## Phase 3: Contextual Smart Chat
- [x] Create `chat_sessions` and `messages` tables, Eloquent Models, and Controllers.
- [x] Build the Chat Interface UI (Messages, Input Area, Loading Skeletons).
- [x] Establish basic LLM API connection (Gemini 2.5 Flash endpoint).
- [x] Wire chat session creation to `POST /api/workspaces/{id}/chat` (persisted to DB).
- [x] Wire message sending to `POST /api/chat/{chatSession}/message` (both user msg and AI reply saved to DB).
- [x] Wire chat title rename to `PUT /api/chat-sessions/{id}` (persisted to DB).
- [x] Load existing chat messages from DB on page load (survives refresh).
- [x] Implement multi-turn conversational memory (last 20 messages sent as context to Gemini API).
- [x] Implement failed message error indicator (red icon + tooltip on user bubble) with one-click retry functionality.
- [x] AI response copy option
- [x] Auto-expanding textarea chat input
- [ ] Implement standard RAG query endpoint (Retrieve chunks -> Inject to Prompt -> Call LLM).
- [ ] Implement dynamic Markdown & Code highlighting in chat bubbles.
- [ ] Implement Persona Toggles (Socrates, ELI5, Penilai Kritis) in the UI and backend logic.

## Phase 4: Consensus Mode (Mixture of Agents)
- [ ] Design the UI for Consensus Mode toggle and real-time loading feedback.
- [ ] Build the asynchronous API architecture to call Multiple Proposer LLMs.
- [ ] Build the Aggregator Prompts (Gemini Flash).
- [ ] Handle response streaming and aggregation display in the frontend.
