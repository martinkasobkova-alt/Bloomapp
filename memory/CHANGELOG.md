# CHANGELOG

## 2026-03-08 — Rich Text Editor (Completed)
- Upgraded `RichTextEditor.jsx` with full toolbar: H1, H2, H3, P, Bold, Italic, Bullet List, Link, Table (with row/col picker popup)
- Editor uses contentEditable + document.execCommand; outputs and accepts HTML string
- Both Admin Aktuality tab and LegalPage (create/edit article) use the editor
- Backend `sanitize_html()` in `utils.py` uses bleach 6.3.0 with whitelist (h1/h2/h3/p/strong/em/ul/li/a/table...); called in create_news, create_article, update_article
- LegalPage article rendering updated: HTML content uses `dangerouslySetInnerHTML`, plain text falls back to split-by-newline (backward compat)
- News card previews strip HTML tags before showing text excerpt
- CSS in App.css extended: `.article-content` and `.rich-editor` styles for h1/h2/h3/ul/table
- bleach==6.3.0 added to requirements.txt

## 2026-03-08 — Notification Preferences (Completed)
- Added `notification_prefs: {messages, services, news}` field to user profile (default: all true)
- New endpoint `PUT /api/auth/notification-prefs` saves preferences per user
- `send_push_notification` checks recipient's messages pref before sending DM push
- `send_broadcast_push_notification` queries users with disabled prefs and filters them out before broadcast
- Profile page: new "Nastavení oznámení" card in Profile tab with 3 Switch toggles + save button
- All 19 tests passed (100%)

## 2026-03-08 — MVP Maintenance Fixes

### Fix 1: MongoDB indexes (12 custom indexes added)
- `users`: indexes on `id`, `email`, `username`
- `messages`: compound `(to_user_id, read)`, `from_user_id`
- `services`: `user_id`, compound `(service_status, expires_at)`
- `notifications`: compound `(user_id, read)`
- `push_subscriptions`: `user_id`, `endpoint`
- `password_resets`: `token`, `expires_at` (TTL)
- Added in `server.py` startup with try/except (non-fatal on failure)

### Fix 2: Removed dead endpoint
- Deleted `GET /api/users/search_old_unused` from `routes/users.py` (returned None, no callers)

### Fix 3: Shared API constant
- Created `src/lib/api.js` as single source of truth for `API` base URL
- Updated 18 frontend files (pages, hooks, contexts, Layout, admin/shared)
- `admin/shared.js` re-exports from `lib/api.js` to preserve admin component imports

### Fix 4: TTL index on password_resets
- Changed `expires_at` field in `password_resets` from ISO string to Python `datetime` object
- MongoDB TTL index (`expireAfterSeconds=0`) now auto-deletes expired tokens
- Backward-compatible: reset flow handles both datetime and legacy string format

### Fix 5: Password validation centralized
- Added `validate_password_strength()` to `auth_helpers.py` (single definition)
- `reset_password` endpoint now uses the shared helper instead of 10 lines of inline regex
- `UserCreate` Pydantic model already had `@field_validator('password')` — registration was already validated

### Fix 6: Email HTML helper
- Added `bloom_email_html(body_html)` to `utils.py`
- Replaced 4 copy-pasted gradient wrapper HTML blocks in `auth.py` (3×) and `messages.py` (1×)
- Gradient color / Bloom branding now changed in one place

## 2026-03-08 — Push Notifications (Completed)
- DM → push to recipient with sender name + preview
- New service/offer → broadcast to all subscribers (excluding author)
- Admin news → broadcast to all subscribers (not community stories)
- Service worker updated with type-specific tags (bloom-dm, bloom-service, bloom-news)
- Added `send_broadcast_push_notification()` to `utils.py`
- All 23 automated tests passed

## Previously completed (earlier sessions)
- Backend refactor: `server.py` → modular `routes/` directory (133 endpoints)
- Frontend refactor: `AdminPage.js` → 10 sub-components in `components/admin/`
- Critical bug fixes: location filter, admin panel propagation, gender-neutral text
