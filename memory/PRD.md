# Bloom Community Platform — PRD

## Original Problem Statement
Build a Czech-language trans community platform with user profiles, Q&A, news, support exchange, specialists directory, stories, admin tools, verification system, and more.

## Core Architecture
- **Frontend:** React + Shadcn UI + Tailwind CSS
- **Backend:** FastAPI + MongoDB
- **Auth:** JWT + Emergent Google Auth
- **Email:** Resend
- **Notifications:** PyVAPID (web push)
- **Rich Text:** Tiptap
- **Sanitization:** Bleach

## What's Been Implemented

### Previous Sessions (1-52)
- Full auth system (JWT + Google)
- User profiles with galleries, WhatsApp links
- Q&A sections (Legal, Specialists)
- News/Articles system with categories, media upload
- Support exchange (offers/requests)
- Specialists directory with reviews
- "Zkušenosti komunity" article section with comments
- Admin panel: content editing, verification system, section management
- Navigation layout fixes
- Homepage widgets: stats, featured items, recent questions

### Session 53 (2026-03-10) — Universal Profile Linking + Admin Improvements
- **Universal Profile Links:** All user avatars/usernames clickable across all pages
- **Q&A Header Cleanup:** Removed duplicate "Dotazy a odpovědi" heading
- **Stories Author Fix:** Shows real author_name instead of "komunita"
- **Q&A Author Display:** Avatar + clickable author username on every question
- **Admin Sorting:** Backend default sort + UI sort controls (name A-Z/Z-A, date newest/oldest) in all admin sections
- **Admin Verification Overhaul:** Role selector, always-visible approve/reject, decision change support
- **Admin Clickable Users:** All user names in reports, verification, bug reports, reviews are now profile links
- **Mobile Chat UX:** visualViewport keyboard tracking, smart auto-scroll, textarea auto-grow, fixed composer layout
- **Zoom Prevention:** viewport meta tag, 16px font-size on mobile inputs, touch-action: manipulation
- **DB Query Optimization:** Fixed N+1 queries in conversations, added field projections

## Pending / Backlog

### P1
- Content Moderation (Phase 2): Add status field (pending/approved/rejected) + admin UI
- Homepage top margin fix (excessive empty space below nav)

### P2
- Facebook Login integration
- Stripe Payment Gateway
- Fork to English version

## Key Routes
- `/users/:userId` — User profile page
- `/legal` — Legal Q&A
- `/specialists` — Specialists directory + Q&A
- `/zkusenosti` — Community stories
- `/news` — News articles
- `/support` — Support exchange
- `/profile` — Own profile settings
- `/admin` — Admin panel
- `/messages` — Private messaging

## Test Credentials
- Admin: test1@bloom.cz / test123
- Community password: Transfortrans
