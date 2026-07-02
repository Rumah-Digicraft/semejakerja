# semejakerja-web-apps

Public interactive cafe map for the Semeja Kerja WFC community in Purwokerto, plus a self-contained admin panel. Users browse cafes on a Leaflet map, filter by facilities/vibes/open-now, run a WiFi speed test, and contribute reviews/edits.

## Stack

- **React 19** + **Vite 8** + **TypeScript**, **Tailwind CSS v4** (via `@tailwindcss/vite`, no `tailwind.config` — configured in `src/index.css`).
- **react-router-dom v7** for routing, **@tanstack/react-query v5** for server state.
- **Leaflet / react-leaflet v5** + `react-leaflet-cluster` for the map.
- **@supabase/supabase-js** for data + auth. **@cloudflare/speedtest** for the WiFi speed feature.

## Commands (run from this folder)

```bash
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build
npm run lint     # eslint .
npm run preview  # preview production build
```

## Architecture

- `src/App.tsx` — routes. `MapApp` (public map) at `/`, `AdminPanel` at `/admin/*`.
- `src/hooks/` — react-query hooks own all Supabase I/O: `useCafes`, `useCafeReviews`, `useContribute`, `useModerations`, `useAdminAuth`, `useSpeedTest`. Prefer adding a hook over calling Supabase from a component.
- `src/lib/` — `supabaseClient.ts` (singleton), `queryClient.ts`, `geo.ts` (distance/geo helpers), `openHours.ts` (open-now / open-night logic).
- `src/components/` — map & UI; `components/admin/` and `components/contribute/` are feature-scoped.
- `src/pages/admin/` — admin screens (login, dashboard, cafes CRUD, moderation).
- `src/types/cafe.ts` — the domain model.

## Key domain notes

- **Two cafe shapes in `types/cafe.ts`**: `CafeRow` is the raw Supabase row; `Cafe` is the mapped UI model. A mapper fills safe defaults for columns not yet in the DB — keep new fields flowing through that mapper, don't read raw rows in components. Note Supabase returns `numeric` as a string.
- `facilities` on the UI `Cafe` is a structured object (`wifi`, `ac`, `powerOutlets`, `mushola`, `motorParking`, `carParking`). ⚠️ In `semejakerja-admin` the same DB column is typed as `string[]` — the two apps model it differently.
- `vibes` is 1 (tenang) … 5 (ramai), default 3 until enriched.
- Cafe clicks are tracked optimistically via the `increment_cafe_clicks` Supabase RPC, with a direct-update fallback (see `App.tsx`).
- **Supabase schema** lives in `../semejakerja-admin/supabase/migrations/` — this app has no migrations of its own.

## Env

Copy `.env.local.example` → `.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Gotchas

- `cafes_purwokerto.csv` / `cafes_ready_for_supabase.csv` and `scraper/` are one-off data-seeding artifacts, not part of the app build.
- `._*` files are macOS junk — ignore them.
