import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // maplibre-gl loads its render worker via `new Worker(new URL(...))`, which
  // Vite's dev-time dep pre-bundling mangles (worker script 404s at runtime).
  // Exclude it from optimizeDeps so it's served as-is.
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
})
