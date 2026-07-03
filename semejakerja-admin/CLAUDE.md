@AGENTS.md

# semejakerja-admin

Internal admin dashboard for the whole Semeja Kerja ecosystem: cafe data & map, community contribution moderation, Semeja Moves sessions/participants, add-on subscriptions, and financial reports (lapkeu). This is the operational back-office that reads/writes the shared Supabase project.

> ⚠️ **Next.js 16** — the App Router APIs here may differ from your training data. See `AGENTS.md` and read `node_modules/next/dist/docs/` before writing Next-specific code.

## Stack

- **Next.js 16** (App Router, RSC) + **React 19** + **TypeScript**.
- **Tailwind CSS v4** (via `@tailwindcss/postcss`) + **shadcn** UI (`style: base-nova`, `components/ui/`, aliases in `components.json`). Use `cn()` from `lib/utils.ts`.
- **Supabase** via `@supabase/ssr` (SSR-aware auth). **@tanstack/react-query** for client data.
- **Leaflet** (`components/MapPicker.tsx`) for picking cafe coordinates.
- Reporting/export: **recharts**, **jspdf** + `jspdf-autotable`, **xlsx**.

## Commands (run from this folder)

```bash
npm run dev      # next dev
npm run build    # next build
npm run start    # next start
npm run lint     # eslint
```

## Architecture

- `app/` — App Router.
  - `app/(dashboard)/` — the authenticated area, grouped by domain: `maps/cafes`, `maps/moderasi`, `moves/sessions` (+ `moves/sessions/detail?id=<uuid>`), `moves/participants`, `community/members`, `community/promo-codes`, `addon/manage`, `addon/subscribers`, `dashboard`, `lapkeu`. Shared chrome in `(dashboard)/layout.tsx`.
  - `app/login/` — auth page. `app/page.tsx` — entry point (client redirect to `/dashboard`).
- **Auth gate is client-side.** This app is a **static export** (`output: 'export'` in `next.config.ts`) deployed to Cloudflare Pages — there is **no Node server**, so Proxy/Middleware is unsupported and there is no `proxy.ts`. Route protection lives in `app/(dashboard)/layout.tsx` (redirects to `/login` when there's no session or the account has no `admin_roles` row) and `app/login/page.tsx` (redirects signed-in admins to `/dashboard`). The real security boundary is **Supabase RLS** — the client gate is UX, not enforcement. Static export also forbids dynamic route segments without `generateStaticParams()`, which is why session detail is `?id=` query param, not `[id]`.
- `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (RSC/route handlers) — pick the right one for the context; never share a client across the server/client boundary.
- `lib/utils.ts` — `cn()`; `lib/utils/format.ts` — formatting helpers.
- `types/index.ts` — **canonical domain types** for the ecosystem (cafes, contributions, moderation, moves, etc.).
- `supabase/migrations/` — **the source-of-truth DB schema for all apps in the monorepo.** Add new schema changes here as numbered SQL migrations (`00N_description.sql`).

## Key domain notes

- **Moderation model**: community contributions arrive as `CafeSubmission` (new cafe), `CafeEdit` (suggested edits), `CafeReview`, and `CafePhoto`, each with `status: 'pending' | 'approved' | 'rejected'` and reviewer metadata. The moderation screen approves/rejects these into the live `cafes` table.
- On the `Cafe` type here, `facilities` is `string[] | null` — this **differs** from `semejakerja-web-apps`, which models facilities as a structured boolean object. Reconcile carefully when moving data between the two.
- `SUPABASE_SERVICE_ROLE_KEY` is a **server-only** secret — only use it in server code (`lib/supabase/server.ts` / route handlers), never expose it to the client.

## Env

`.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
