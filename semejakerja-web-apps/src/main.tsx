import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import './index.css'
import App from './App.tsx'

// Static/prerendered SEO tags and the crawler-only content block are for
// no-JS crawlers; once the app boots, <Seo/> owns the head, so drop them
// to avoid duplicate tags.
document.querySelectorAll('[data-seo]').forEach(el => el.remove())
document.getElementById('seo-content')?.remove()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
