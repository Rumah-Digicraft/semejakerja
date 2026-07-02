# semejamoves-web-apps

Internal dashboard for **Semeja Moves** — managing recurring community sports sessions (padel, funminton; basketball/volleyball planned): sessions, participants, payments, and simple financial reports (lapkeu). Includes public token-based pages so participants can view/join a session without logging in.

## Stack

- **React 19** + **Vite 8** + **TypeScript**, **Tailwind CSS v4** (via `@tailwindcss/vite`, no config file).
- **react-router-dom v7**, **@supabase/supabase-js** for data + auth.
- Google **Gemini** API (`src/lib/gemini.ts`) for an AI helper feature.

## Commands (run from this folder)

```bash
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build
npm run lint     # eslint .
npm run preview  # preview production build
```

## Architecture

- `src/App.tsx` — routing. Auth is context-based, not react-query:
  - **Public**: `/login`, `/f/:token` (funminton), `/p/:token` (padel).
  - **Protected** (wrapped in `ProtectedRoute` → `MainLayout`): `/dashboard`, `/funminton` + `/funminton/sessions/:id`, `/padel` + `/padel/sessions/:id`, `/lapkeu`.
- `src/contexts/AuthContext.tsx` — auth state/session; `components/ProtectedRoute.tsx` guards routes. Read session state from this context, not directly from Supabase in pages.
- `src/lib/supabase.ts` — Supabase singleton. `src/lib/gemini.ts` — Gemini client.
- `src/pages/` — one file per screen (padel/funminton have list + detail + public variants).
- `src/types/index.ts` — domain model. `src/utils/format.ts` — formatting (currency etc.).

## Key domain notes

- `SportType` = `'funminton' | 'padel' | 'basketball' | 'volleyball'`; sessions are keyed by sport and driven by `sports_config`.
- A `Session` carries `session_slots`, pricing (`price_per_person`, `court_cost`, `other_cost`), a public `token`, `status` (`open`/`closed`/`done`), and optional `polling_config` / `announcement_config`. The `token` is what powers the public `/f/:token` and `/p/:token` pages.
- Backend is the shared Supabase project; schema/migrations live in `../semejakerja-admin/supabase/migrations/`.

## Env

`.env.local` (see `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GEMINI_API_KEY`.

## Gotchas

- Uses `BrowserRouter` with public token routes — keep those routes outside `ProtectedRoute`.
- `._*` files are macOS junk — ignore them.
