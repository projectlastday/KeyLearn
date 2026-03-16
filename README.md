# KeyLearn

KeyLearn is a Laravel + Inertia + React study workspace app for Indonesian users. It combines folder-based learning spaces with productivity widgets and an AI chat surface.

## Current Product Scope

- Topic and workspace management
- Statistik page with monthly filter
- Trash with restore, force delete, and empty-trash action
- Workspace board with widgets:
  - `note`
  - `chat`
  - `reminder`
  - `todo`
  - `timer`
  - `whiteboard`
  - `pdf`
  - `youtube`
- Recent folders on Beranda from `workspaces.last_opened_at`
- Stats tracking for workspace opens and timer sessions
- Phone verification flow with environment toggle for local bypass

## Notable Current Behavior

- Restoring a topic or workspace now restores its descendant workspaces, widgets, and chats.
- Sidebar now includes a top-level `Statistik` page at `/statistik`.
- Statistik shows topic, ruang kerja, widget, pesan, and timer summary metrics with `?month=YYYY-MM`.
- Monthly timer statistics are calculated from tracked `widget_timer_sessions`.
- Trash has a `Kosongkan Tong Sampah` action for permanent bulk cleanup.
- Topics can be renamed from the workspace topic dropdown.
- Widget title and reminder edit inputs auto-select existing text so typing replaces instead of appending.
- YouTube link modal no longer shows the false `Widget YouTube tidak ditemukan` fallback during close/save transitions.

## Local Setup

1. Install dependencies:

```bash
composer install
npm install
```

2. Create env and app key:

```bash
cp .env.example .env
php artisan key:generate
```

3. Configure database in `.env`, then run:

```bash
php artisan migrate
```

4. Start the app:

```bash
php artisan serve
npm run dev
```

## Phone Verification Toggle

Phone verification is controlled by `PHONE_VERIFICATION_ENABLED`.

- `true`: registration/login can require WhatsApp OTP verification
- `false`: local development can bypass phone verification

After changing it, clear config:

```bash
php artisan config:clear
```

## Useful Commands

```bash
php artisan test
php artisan test tests/Feature/TrashRestoreTest.php
php artisan test tests/Feature/StatisticsPageTest.php
npm run build
php artisan app:process-due-reminders
```

## Reference Docs

- [guide.md](guide.md)
- [database.md](database.md)
- [widget.md](widget.md)
- [context.md](context.md)
- [roadmap.md](roadmap.md)
