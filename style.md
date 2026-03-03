# UI/UX & Design System

## 1. Design Philosophy
KeyLearn leverages a **Simplistic, Flat Material-Like UI**. Inspired by interfaces like Claude, the design is incredibly soft, minimal, and highly functional. It relies on subtle color grading (gray, beige, soft amber/brown) to differentiate interactive elements rather than harsh shadows or heavy borders.

## 2. Core Visual Principles
*   **Soft & Flat:** Remove all dropshadows, glassmorphism, or brutalist hard lines. Use a very flat and calming interface.
*   **Rounded & Approachable:** Use distinct rounded corners (e.g., `rounded-2xl` or `rounded-3xl` for main cards and folders).
*   **Typography:** Soft, highly legible sans-serif with a focus on dark-gray (instead of stark black) text for reduced eye strain.
*   **Calm Palette:** The platform must use a very soft, light-mode dominant palette. 

## 3. Color Palette
*   **Backgrounds:** A soft, neutral light gray/beige (e.g., `bg-gray-200` or a custom `#e0e0e0` / `#dcdcdc`).
*   **Surface/Folders:** Pure white or very pale gray (`bg-white` or `bg-gray-50`) inside the folders.
*   **Accents (The "Folder" Look):** Soft, fleshy oranges/ambers and light browns (e.g., `border-[#f4c88e]` or `border-amber-300`) to represent folders and accents without being overly vibrant.
*   **Text:** Charcoal and soft grays (`text-gray-700`, `text-gray-500`) for a gentle reading experience.

## 4. Component Structures

### UI Elements (Inputs & Dropdowns)
*   **Forms & Inputs:** Inputs should have generous padding (`py-3` minimum) for a comfortable tap target.
*   **Active States:** Provide clear visual feedback with distinct border colors and focus rings (e.g., `focus:ring-[#c4a882]`) to confirm interactivity.
*   **Validation States:** Explicitly disable action buttons (e.g., `disabled:opacity-40`) until a form is fully valid (text limits satisfied, dropdowns legitimately selected).
*   **Dropdowns:** Utilize clean, native HTML `<select>` elements. Apply `bg-none` to override default Tailwind form chevrons, and overlay a custom color-matched SVG icon inside a relative parent wrapper for a premium, unified look.
*   **Custom Scrollbars:** Scrollable areas (like chat histories) must utilize custom Tailwind scrollbar modifiers (`[&::-webkit-scrollbar]`) to blend with the soft amber theme rather than using harsh browser defaults. Always ensure the scrollbar is pushed to the absolute right edge of the screen, not floating in the middle.
*   **Floating Menus & Modals:** Popups (like the AI Model Selector) must adhere to the light/soft theme. Use white or soft-beige backgrounds (`bg-[#f5f0ea]`) with subtle amber borders, completely avoiding harsh dark modes or heavy black backgrounds.

### Folder / Workspace Grid
*   **The Folder Card:** Square-ish or rectangular blocks, white background, thick rounded borders in a soft amber/brown to denote a folder.
*   **Layout:** Display folders primarily in a spacious grid format, acting as literal folders on a desk.

### Breadcrumbs Navigation
*   **Visuals:** Small, subtle text (e.g., `text-sm` or `text-xs`) to avoid distraction.
*   **Colors:** Soft gray (`text-gray-500`) for parent links (clickable), and darker gray (`text-gray-800`, font-medium) for the current active page.
*   **Separators:** Use a very small, soft-gray SVG chevron (`<svg>`) rather than forward slashes to match the premium feel.
*   **Interactivity:** Parent links should change color slightly on hover (`hover:text-gray-900`) with a smooth transition.
*   **Inline Editing:** Last-child breadcrumbs (like chat titles) can be editable inline. The UI must smoothly switch from a `<span title={...}>` (equipped with a hover-visible edit pen `<svg>`) to an active, unstyled `<input>` auto-focused on click, with `onBlur` and `Enter` key handlers to save seamlessly.

### Chat Interface
*   **User Bubbles:** Subtle soft-gray rounded blocks (e.g., `bg-[#f2efe8]`).
*   **AI Bubbles:** Completely flat interface (e.g., `bg-white`), integrating seamlessly with the background. Includes a "Copy to Clipboard" feature:
    *   **Copy Action:** On hover, a small clipboard icon button (`bg-white`, border themed) appears at the bottom-right of the bubble (`group-hover:opacity-100`).
    *   **Success Feedback:** Upon clicking, the icon switches to a green checkmark (`text-[#22c55e]`) for 2 seconds before reverting.
*   **Chat Input Bar:** A modern, auto-expanding textarea.
    *   **Behavior:** Starts as a single line (`min-h-[44px]`) and automatically grows as the user types, up to a maximum height (`max-h-[200px]`).
    *   **No Manual Resize:** The manual resize handle is removed (`resize-none`) to maintain a clean, controlled UI.
    *   **Keyboard logic:** `Enter` sends the message, `Shift + Enter` inserts a new line. The height resets automatically upon sending.
*   **Loading State:** Simple, minimal fading text or soft pulsing loaders (e.g., 3 bouncing, themed dots).
*   **Failed Message Indicator:** When a user message fails to send, the bubble receives a subtle red border (`border-[#ef4444]/40`). 
    *   **Self-Cleaning logic:** Failed messages are **automatically removed from the UI after 10 seconds** to keep the history clean. They also disappear on page refresh (as they are not persisted to the DB).
    *   **Manual Controls:** To the left of the bubble, a vertical stack provides:
        1. A red exclamation SVG that shows the error in a tooltip on hover.
        2. A circular-arrow retry icon (`text-[#8c7a66]`) to attempt resending.
        3. A trash bin "Hapus" icon for immediate manual removal.
*   **File Attachments (Input):** Modern, floating chip design for queued files. Must include a distinct file icon container (e.g., light red `bg-[#fef2f2]` for PDFs), file name / size metadata, and a positioned circular 'X' removal button that only appears on hover (`group-hover:opacity-100`).
*   **File Attachments (Sent Bubbles):** Rendered elegantly inside the user bubble. Features a bold, uppercase truncated filename and a custom pill-shaped metadata tag displaying the file type badge (e.g., RED `bg-[#ef4444]` for PDF) along with the file size.

### Validation & Text Truncation limits
*   **Max Length (Logic):** Forms should enforce logical limits (e.g., 50 characters for titles/topics). Show a red border and a small red helper text (`text-red-500`, `text-sm`) below the input immediately upon attempting to save invalid lengths. 
*   **Visual Truncation (UI):** Rendered lists (like sidebar navigation, topic grids, and folder titles) MUST NOT break their bounds. If a string exceeds ~20 characters, it should be clamped (e.g., `str.substring(0, 20) + '...'`).
*   **Tooltips (Native):** Whenever visual truncation is applied with an ellipsis, ALWAYS assign the full, raw string to the element's native HTML `title` attribute so the user can hover to read the expanded string cleanly.

### Auth Pages (Login / Register)
*   **Layout:** Standalone full-screen centered card (no `AppLayout` wrapper). Background is a warm muted beige (`bg-[#e8e4df]`).
*   **Card:** `bg-white`, `rounded-3xl`, with a subtle amber border (`border-[#f4c88e]/40`) and `shadow-sm`.
*   **Inputs:** Full-width, `rounded-2xl`, generous padding (`px-4 py-3`), `border-gray-200`. Focus state uses `focus:ring-[#c4a882]/50` and `focus:border-[#c4a882]`. Error state swaps to `border-red-400` with a `text-red-500` helper below.
*   **Primary Button:** `bg-[#a67c52]`, `rounded-2xl`, white text, `hover:bg-[#8a6642]`. Disabled state uses `disabled:opacity-40`.
*   **Google OAuth Button:** White background, `rounded-2xl`, `border-gray-200`, with the official multi-color Google SVG icon. Hover applies `hover:border-[#c4a882]`.
*   **Divider:** A horizontal line with a centered "atau" label (`text-xs text-gray-400`) separating the Google button from the standard form.
*   **Branding (Logo):** Uses the custom `ApplicationLogo` component (a modern geometric star/crown SVG). The SVG uses a fixed gold fill (`#CD9B58`) with `currentColor` responsive strokes so it seamlessly matches its parent container's text color.
*   **Typography:** Book icon + wordmark centered above the card, with a soft gray subtitle in Indonesian.

### Homepage (Logged-In)
*   **Section Replacement:** For authenticated users on `Beranda`, replace the "Fitur Utama" block with an "Obrolan terakhir" block.
*   **Data Rules:** Show up to 3 most recently opened chats, ordered by latest activity/open time (`updated_at`).
*   **Card Style:** Reuse the soft folder-card language: `bg-[#fdfbf8]`, `rounded-2xl`, `border-2 border-[#d4b896]`, subtle hover border darkening + `hover:shadow-md`.
*   **Card Content:** Each card should include a chat icon, chat title (truncated when long), workspace label, and a muted date label.
*   **Navigation:** Entire card is clickable and routes directly to `/workspaces/{workspace_id}/chat/{chat_id}`.
*   **Empty State:** If no chat exists yet, render a single full-width soft card with explanatory Indonesian copy.

### Sidebar (State & Navigation)
*   **Persisted Collapse State:** Sidebar open/closed state must persist across page navigation using local storage key `keylearn.sidebar.open`.
*   **Default State:** First-load default is collapsed (closed).
*   **Logo Behavior:** Clicking logo should navigate home without implicitly forcing sidebar re-expand.
*   **Ruang Kerja Icon Behavior (Collapsed):** Clicking `Ruang Kerja` while collapsed should expand sidebar and navigate to `/workspaces`.
*   **Ruang Kerja Submenu:** Remove `Semua` child item from sidebar submenu to avoid duplicate navigation paths.
*   **Topic Source Fallback:** If page-level `topics` prop is absent, sidebar must use globally shared `sidebarTopics` prop so topic list remains consistent on all pages.
*   **Empty Submenu UX:** When topic list is genuinely empty, render a clear placeholder text (`Belum ada topik`) instead of an empty block.

### Model Selector Labels
*   **Display Label Cleanup:** In chat model dropdown, keep model values unchanged but sanitize labels for UI clarity:
    *   remove emojis,
    *   remove `(Groq)` wording,
    *   remove `Free` wording.

### Topic Selection (Dropdown Pattern)
*   **Dropdown Filter:** Topic selection on the Workspaces page uses a custom dropdown button (`Topik: [name]`) with a tag icon and animated chevron, replacing the old horizontal pill buttons.
*   **Dropdown Menu:** Floating popover lists all topics vertically with a checkmark on the active selection. Delete icon appears on hover per item. `+ Topik Baru` button sits at the bottom, separated by a divider.
*   **Grouped Grid View:** When "Semua" is selected, workspaces are grouped by topic with uppercase section headers, divider lines, and folder counts.
*   **Click-Outside-to-Close:** Dropdown dismisses when clicking anywhere outside via `mousedown` event listener on `document`.

### Micro-Interaction Fixes
*   **Topic Delete Icon:** Delete action is now safely inside the dropdown menu (hover-reveal trash icon per item), preventing accidental deletions from the old pill `X` button.

## 5. Localization Enforcement
*   All placeholder text (e.g., "Ketik pertanyaan Anda di sini...").
*   All button labels (e.g., "Unggah Dokumen", "Mulai Konsensus").
*   All empty states (e.g., "Belum ada ruang kerja.").
Must be in impeccable Bahasa Indonesia.
