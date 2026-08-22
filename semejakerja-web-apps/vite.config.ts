import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // Default Vite ('baseline-widely-available' ≈ Chrome 107 / Safari 16)
    // kelewat baru buat Android System WebView bawaan HP lama — dan link
    // peta banyak dibuka dari in-app browser WhatsApp/IG yang pakai WebView
    // itu. Syntax modern di luar target = SyntaxError = layar putih diam,
    // bukan error yang kelihatan. Samain dengan browserslist di
    // semejakerja-landingpage-v2/package.json.
    target: ['chrome94', 'edge94', 'firefox93', 'safari15.4'],
  },
  // maplibre-gl loads its render worker via `new Worker(new URL(...))`, which
  // Vite's dev-time dep pre-bundling mangles (worker script 404s at runtime).
  // Exclude it from optimizeDeps so it's served as-is.
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
})
