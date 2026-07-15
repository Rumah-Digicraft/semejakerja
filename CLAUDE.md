# Semeja Kerja — Monorepo

Digital ecosystem for **Semeja Kerja**, a WFC (Work From Cafe) community in Purwokerto. This is a plain-folder monorepo (no workspaces tooling): each project has its own `package.json`, `node_modules`, and deploy target. `cd` into a project before running any command.

## Projects

| Folder | Stack | Purpose | Docs |
| --- | --- | --- | --- |
| `semejakerja-web-apps/` | React 19 + Vite + Leaflet | Public interactive cafe map + built-in admin panel | [CLAUDE.md](semejakerja-web-apps/CLAUDE.md) |
| `semejakerja-admin/` | Next.js 16 (App Router) | Internal admin dashboard (cafes, moderation, moves, finance) | [CLAUDE.md](semejakerja-admin/CLAUDE.md) |
| `semejakerja-landingpage-v2/` | Next.js 16 (static export) | Community landing page + membership flow | [CLAUDE.md](semejakerja-landingpage-v2/CLAUDE.md) |
| `semejamoves-web-apps/` | React 19 + Vite | Internal sports session manager (padel, funminton) | [CLAUDE.md](semejamoves-web-apps/CLAUDE.md) |
| `semejakerja-landingpage/` | Static HTML + Tailwind CDN | Legacy v1 landing page, no build | [CLAUDE.md](semejakerja-landingpage/CLAUDE.md) |

## Shared conventions

- **Backend is Supabase** across every app (Postgres + Auth + RLS). There is one shared Supabase project — the SQL migrations live in `semejakerja-admin/supabase/migrations/`. Treat that folder as the source of truth for the DB schema. **Supabase Edge Functions** (Deno) also live under `semejakerja-admin/supabase/functions/` — currently the DOKU payment gateway.
- **Payments run on DOKU Checkout** (live in production since Jul 2026). Membership checkout on the landing page calls an edge function that creates the DOKU payment; a webhook edge function activates the membership. Replaced the old manual bank-transfer + admin-verify flow.
- **Env vars** are per-project `.env.local` (git-ignored). Vite apps use `VITE_*`; Next.js apps use `NEXT_PUBLIC_*` (+ a server-only `SUPABASE_SERVICE_ROLE_KEY` in admin). See each project's `.env` example.
- **The `cafes` table is shared** by web-apps and admin, but each app declares its own TypeScript type for it and they intentionally differ (see per-project docs). Do not assume one shape maps cleanly onto the other.
- **macOS AppleDouble junk**: files prefixed `._` (and `.DS_Store`) are macOS metadata, already git-ignored. Never edit or commit them.

## Working here

- Always work inside a single project directory; there is no root-level build or install.
- Match the surrounding code — these apps predate each other and differ in style (Tailwind v4 utility classes in web-apps/admin, CSS Modules in landingpage-v2).
