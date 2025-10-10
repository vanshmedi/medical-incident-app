import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // When deploying to GitHub Pages at https://<user>.github.io/<repo>/,
  // Vite needs a base path that matches the repo name.
  // Allow overriding via env: VITE_GH_PAGES_BASE=/my-repo/
  const baseFromEnv = process.env.VITE_GH_PAGES_BASE
  const isCI = process.env.CI === 'true'
  return {
    plugins: [react()],
    base: baseFromEnv ?? (isCI ? '/medical-incident-app/' : '/'),
  }
})
