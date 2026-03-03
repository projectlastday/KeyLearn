# KeyLearn Project Guide

## Overview
KeyLearn is a highly advanced, AI-integrated Single Page Application (SPA). Unlike previous traditional layouts, KeyLearn prioritizes a deeply interactive, seamless, and visually stunning user experience. It leverages modern frontend framworks alongside a robust backend capable of handling intensive AI operations, Retrieval-Augmented Generation (RAG), and Mixture of Agents (MoA) orchestration.

## Current Architecture
*   **Backend Framework:** Laravel (API & AI Service Orchestration).
*   **Frontend Framework:** React with Inertia.js (for a seamless SPA experience without abandoning Laravel's routing).
*   **AI Engine:** Integration with Gemini Flash, OpenAI, and other LLMs via API, alongside a Vector Database routing layer for RAG.
*   **Styling:** Tailwind CSS, utilizing a premium, highly modern aesthetic (glassmorphism, dark/light modes, micro-animations).

## UI & Layout Structure
The application relies on a premium, distraction-free global shell tailored for deep focus and study.
*   **Layout Files:**
    *   `AppLayout.jsx` — Universal layout for all pages. Handles both guest and authenticated states seamlessly by checking the `auth.user` prop implicitly. Contains sidebar, header, and content area.
    *   `AuthenticatedLayout.jsx` — **DELETED.** Was deprecated Laravel Breeze boilerplate, fully superseded by `AppLayout.jsx`. Removed during dead code cleanup.
*   **Sidebar (`.app-sidebar`)**: Contains the brand logo, navigation links (Beranda, Ruang Kerja), a dedicated "Tong Sampah" (Trashcan) link placed just above the user profile section, and a guest user indicator. Must be collapsible and visually sleek.
    *   Sidebar open/closed state is persisted via `localStorage` (`keylearn.sidebar.open`) and defaults to closed.
    *   Clicking the brand logo routes home but does not force the sidebar to expand.
    *   If sidebar is collapsed and user clicks the `Ruang Kerja` nav icon, sidebar expands and routes to `/workspaces`.
    *   `Semua` is intentionally removed from the `Ruang Kerja` submenu to avoid redundant navigation.
*   **Header (`.app-header`)**: Contains the hamburger toggle and page title. User dropdown removed temporarily (no auth).
*   **Content Container (`.app-container`)**: The main split-pane view. Typically divided into a Document Viewer (left/right) and the Smart Chat interface.

## Deep Dive Component Nuances
The KeyLearn architecture requires sophisticated interactive components:
*   **Layout Handling:** 
    *   `AppLayout.jsx` accepts an `isChatLayout={true}` prop to conditionally convert its main content container into a strict `flex-col flex-1 overflow-hidden` wrapper. This removes generalized padding and enables chat input bars to adhere cleanly to the bottom of the viewport without triggering standard outer page scrolls.
*   **Data Handling (Database-Backed):** 
    *   All Topics, Workspaces, Chat Sessions, and Messages are persisted in MySQL via Eloquent models.
    *   **Deletions:** Removing items inside the "Ruang Kerja" view performs an Eloquent Soft Delete (setting a `deleted_at` timestamp). Soft-deleted items vanish from the main view and reappear within the "Tong Sampah" (Trashcan) page. Deleting them from the Trashcan initiates a permanent, destructive Hardware Delete, while restoring them clears the `deleted_at` timestamp and returns them to the main workspace.
    *   Frontend creates entities via `axios.post/put/delete` to dedicated API endpoints and updates local React state with server responses.
    *   Inertia pages receive pre-loaded data as props from controllers (e.g., `WorkspaceController@index` passes all workspaces and topics).
    *   For consistent sidebar rendering across all pages (including pages that do not pass `topics` directly), global shared prop `sidebarTopics` is provided by `HandleInertiaRequests`.
    *   Chat messages are loaded from DB on page render and survive refresh.
    *   **Message Error Handling & Retry:** The `handleSend` function delegates to a reusable `sendMessage(content, fileToSend, retryMsgId)` async function. On API failure, instead of injecting a fake AI error message, the original user message in React state is updated with an `error` property containing the localized error string. The message also preserves a `_file` reference to the original `File` object for retry. A `handleRetry(msg)` function re-invokes `sendMessage` with the same content, file, and message ID, clearing the error state and re-attempting the API call. This architecture keeps error handling on the user's own bubble rather than polluting the conversation with fake assistant messages.
    *   **Conversational Memory:** The `MessageController` fetches the last 20 messages from the active `ChatSession` and includes them as multi-turn `contents` in the Gemini API payload. This gives the AI full conversational context, enabling follow-up questions, clarifications, and coherent multi-turn dialogues without losing thread.
    *   Dynamic rendering of chat messages with markdown parsing and syntax highlighting.
    *   Virtualization for long document scrolling and large chat histories.
*   **Modals & Dialogs:** 
    *   Premium, animated dialogs (e.g., Framer Motion or Headless UI tailored modals) for Workspace creation and Persona selection.
*   **Interactive UI Elements:**
    *   **PDF Viewer:** A highly robust PDF rendering component with text-highlighting capabilities linked to chat citations.
    *   **Chat Input:** A dynamic textarea that grows with content, supporting file drop zones for rapid ingestion.
    *   **Consensus UI:** Visual indicators (skeletons/spinners) showing real-time asynchronous querying of multiple LLMs before the final aggregator response.
*   **Homepage for Logged-In Users:**
    *   The previous "Fitur Utama" card section on `Beranda` is replaced with `Obrolan terakhir`.
    *   Shows up to 3 most recently opened chats, each linking directly to its chat route.
    *   Opening a chat updates that session timestamp (`updated_at`) to keep "recently opened" ordering accurate.
*   **External JS Libraries Identified:** React-Markdown, Framer Motion (for premium micro-animations), PDF.js (or wrapper).

## Authentication Flow
*   **Dual Authentication Strategy**: The application uses **Laravel Breeze** (for standard email/password authentication using Inertia) and **Laravel Socialite** (for Google OAuth 2.0 login). Both are fully installed and configured.
*   **Standard Login/Register**: Utilizes Inertia's `useForm` hook to submit credentials to Laravel Breeze endpoints. Handles validation errors seamlessly without page reloads and uses secure HttpOnly session cookies.
*   **Google OAuth Flow**: Initiated via a standard `<a>` tag to `/auth/google/redirect`, which redirects to Google. The callback endpoint (`/auth/google/callback`) exchanges the token, creates or links the user (leaving `password` null if entirely new), and securely authenticates the session before redirecting to `/workspaces`.
*   **Account Linking Logic**: If a user with the same email already exists, the Google `google_id` and `avatar` are linked to the existing record. If the user is new, a new account is created with a `null` password.
*   **Frontend Impact**: The login/register UI features a prominent "Lanjutkan dengan Google" button alongside the standard form. Both pages use a standalone centered card layout (no `AppLayout` wrapper). The sidebar in `AppLayout.jsx` is auth-aware: it shows the user's avatar, name, email, and a logout button when authenticated, or a "Masuk" login link for guests.
*   **Key Backend Files**: `GoogleAuthController.php` (handles redirect/callback), `config/services.php` (Google credentials from `.env`), migration `2026_02_25_143700_add_google_fields_to_users_table.php`.
*   **Environment Variables Required**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` must be set in `.env`.
*   **Google Cloud Console Config Note**: Ensure "Authorized JavaScript origins" is strictly `http://localhost:8000` (no trailing slash) and "Authorized redirect URIs" is strictly `http://localhost:8000/auth/google/callback`.

## High-Level Migration & Build Goals
*   **Phase 1 (Foundation):** Setup Laravel-Inertia-React bridge. Build the premium global shell and authentication views. Establish the design system (animations, glassmorphism) from day one.
*   **Phase 2 (Workspaces & Knowledge):** Implement CRUD for Workspaces. Build the PDF upload, parsing, and chunking pipeline to the Vector DB.
*   **Phase 3 (Smart Chat):** Build the real-time contextual chat interface bounded by Workspace data.
*   **Phase 4 (Consensus Mode):** Implement the complex Mixture of Agents asynchronous routing pipeline.

## Design Constraints
*   **Localization:** MUST be strictly in Indonesian (Bahasa Indonesia).
*   **Aesthetics:** Must be visually stunning. Utilize modern web design (vibrant gradients, dark modes, glassmorphism, dynamic animations). Avoid basic or generic layouts. The design must feel state-of-the-art and highly premium.
*   **Performance:** UI must remain 60fps even during complex document parsing or waiting for AI responses. Ensure smooth, no-page-reload user experiences.
