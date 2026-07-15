@AGENTS.md

# semejakerja-landingpage-v2

Public marketing/landing site for Semeja Kerja (v2, the current one) plus membership flow, a maps preview, docs, and a Semeja Moves teaser. Ships as a **static export** — no server runtime in production.

> ⚠️ **Next.js 16** — App Router APIs may differ from your training data. See `AGENTS.md` and read `node_modules/next/dist/docs/` before writing Next-specific code.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**, configured for **`output: "export"`** with `images.unoptimized` (`next.config.ts`). Build produces static HTML in `out/`.
- **CSS Modules** (`*.module.css`) for styling — **not** Tailwind. Each component ships its own module.
- **framer-motion** for animation (plus `ScrollReveal.tsx`). **@supabase/ssr** / supabase-js for auth + data.

## Commands (run from this folder)

```bash
npm run dev      # next dev
npm run build    # next build  → static export into out/
npm run start    # next start (note: static export is served from out/, not this)
npm run lint     # eslint
```

## Architecture

- `src/app/` — App Router pages: `/` (home), `auth/login`, `auth/register`, `maps`, `membership` (+ `membership/checkout`), `moves`, `dokumentasi`.
- `src/app/components/` — page sections, each with a paired `.module.css` (Navbar, HeroSection, StorySection, GrowthStats, CafeGrid, MovesTeaser, CTASection, Footer, ScrollReveal).
- `src/lib/supabase/client.ts` — browser Supabase client.

## Static-export constraints (important)

Because this uses `output: "export"`, avoid features that require a Node server at runtime: no Route Handlers/API routes, no server actions, no on-demand SSR/ISR, no dynamic `next/image` optimization. Auth and data go through the **client** Supabase SDK. Keep all interactivity client-side.

Server-side **payment logic (DOKU Checkout)** therefore lives in **Supabase Edge Functions** (`semejakerja-admin/supabase/functions/`), called from the browser via `supabase.functions.invoke(...)`. `membership/checkout/page.tsx` invokes `doku-create-payment` and redirects to DOKU; `membership/checkout/status` polls the payment then forwards to `membership/dashboard`. DOKU is the live payment method (replaced the manual bank-transfer flow).

## Env

`.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (both public — safe to expose since there's no server side).

## Note

`semejakerja-landingpage/` (no `-v2`) is the older static-HTML version, kept for reference. This is the active landing page.
