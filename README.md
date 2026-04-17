# 🔗 Kova — B2B Relationship Intelligence PWA

A mobile-first progressive web app for capturing, organizing, and understanding B2B relationship intelligence. Built with Next.js 15, TypeScript, and Tailwind CSS.

**Live Demo:** https://kova-chi-two.vercel.app

---

## Overview

Kova is a relationship intelligence tool designed for B2B sales professionals to:
- **Capture** new contacts via voice, text, photos, or card scans
- **Organize** information in AI-generated markdown sections (Profile, Company, Outreach, Follow-up, Research)
- **Understand** relationships through AI-generated insights (score, topics, suggested next steps)
- **Follow up** systematically with smart suggestions based on interaction history

### Key Architecture

- **Append-only interactions** as the source of truth — immutable, offline-synced
- **AI-regenerated sections** — markdown views of contact intelligence derived from interactions
- **Full queryable metadata** — 25+ contact fields across 5 categories for filtering/sorting
- **Markdown-section data model** — flexible, AI-organized representation instead of rigid forms

---

## Features

### 📱 Mobile-First PWA
- Installs as a native app on iOS/Android
- Offline-capable with IndexedDB sync (Phase 2)
- Safe-area padding, gesture-optimized UI
- Dynamic viewport, no overscroll

### 👥 Contact Management
- **Full metadata**: Identity, Pipeline Stage, Company Intelligence, Deal Tracking, AI Insights
- **Smart search** by name, company, title
- **Pipeline filters**: All, High Priority, Engaged, Negotiating
- **Importance & stage tags** for quick visual scanning

### 💬 Interaction Timeline
- **10 interaction types**: voice memo, text note, photo, meeting note, email snippet, AI research, follow-up done/skipped, card scan, import
- **Chronological log** newest-first with icons, timestamps, truncation
- **AI-generated badge** for auto-captured insights

### 🧠 AI Insights Panel
- **Relationship score** (0–100, color-coded)
- **AI summary** of the contact relationship
- **Key topics** extracted from interactions
- **Suggested next step** for follow-up

### 🏠 Screens
1. **Home** — Today's follow-up suggestions + quick capture via ChatInputBar
2. **Clients** — Searchable, filterable contact list with full pipeline view
3. **Contact Detail** — Full profile with tabbed Info (sections) and Notes (timeline)
4. **Leads** — AI-powered lead discovery search + relevance scoring
5. **Me/Profile** — User account, settings, sign out

---

## Tech Stack

### Frontend
- **Next.js 15** with App Router, Turbopack
- **TypeScript** for full type safety
- **Tailwind CSS** with design tokens (semantic colors, typography)
- **Lucide React** for icons
- **react-markdown + remark-gfm** for section rendering

### Data & Storage (Phase 1: Mock; Phase 2: Supabase)
- **Mock data** (7 contacts, 35 sections, 20 interactions)
- **Zustand** state management (planned: Phase 2)
- **Dexie.js** offline IndexedDB cache (planned: Phase 2)

### Deployment
- **Vercel** (auto-deployed, edge optimized)

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm/pnpm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd kova

# Install dependencies
npm install

# Run development server
npm run dev
```

Open http://localhost:3000 in your browser (or scan QR code on mobile).

### Build for Production

```bash
npm run build
npm start
```

### Deploy to Vercel

```bash
vercel --prod
```

---

## Project Structure

```
kova/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Root → /home redirect
│   │   └── (main)/             # Route group for authenticated screens
│   │
│   ├── components/
│   │   ├── ui/                 # Atoms (StatusBar, TabBar, Avatar, etc.)
│   │   └── contacts/           # Domains (SectionRenderer, InteractionTimeline)
│   │
│   ├── lib/
│   │   ├── mock-data.ts        # 7 contacts with full metadata
│   │   └── utils/              # Date formatting, cn() utility
│   │
│   ├── types/                  # Contact, Interaction, Section types
│   └── styles/                 # Global CSS
│
├── public/
│   ├── manifest.json           # PWA manifest
│   └── icons/                  # PWA icons
│
└── README.md                   # This file
```

---

## Development Phases

### Phase 0 ✅ Complete
- [x] Next.js + design tokens
- [x] TypeScript types
- [x] 8 UI atom components
- [x] SectionRenderer + InteractionTimeline
- [x] Main layout with TabBar

### Phase 1 ✅ Complete
- [x] 7 mock contacts (full metadata)
- [x] 35 sections (5 per contact)
- [x] All 5 screens (Home, Clients, Detail, Leads, Me)
- [x] Deployed to Vercel

### Phase 2 🚀 In Progress
- [ ] Supabase authentication
- [ ] Database + append-only schema
- [ ] AI regeneration pipeline
- [ ] Offline sync via Dexie.js
- [ ] Web search for lead discovery

### Phase 3+ 📋 Planned
- Multi-modal input (voice, OCR)
- Table view with custom columns
- Team collaboration
- Advanced filtering & saved views

---

## Live Demo

Visit **https://kova-chi-two.vercel.app** on your phone to:
- See the 7 mock contacts in the Clients list
- View Lisa Chen's detailed profile with AI insights
- Check today's follow-up suggestions on the Home screen
- Explore the Leads discovery search
- Install as a PWA from your browser

---

## Contact

- **Email**: edhudsonxu@gmail.com
- **GitHub**: [AI-relationship](https://github.com/hanchaoxu/AI-relationship)

---

**Built with ❤️ for B2B relationship intelligence**
