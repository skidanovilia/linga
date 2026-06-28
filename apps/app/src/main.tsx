import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from './router'
import { AuthProvider } from './auth/AuthProvider'
// Self-hosted fonts (offline-safe PWA). Outfit (Latin display) + Noto subsets
// for the Russian (Cyrillic) and Georgian content the app teaches. Imported
// before index.css so the @font-face rules exist when the theme references them.
import '@fontsource-variable/outfit/index.css'
import '@fontsource/noto-sans/cyrillic-400.css'
import '@fontsource/noto-sans/cyrillic-700.css'
import '@fontsource/noto-sans-georgian/georgian-400.css'
import '@fontsource/noto-sans-georgian/georgian-700.css'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
