import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Load env vars from the repo root .env (shared with the backend).
  // Only VITE_-prefixed vars are exposed to the browser bundle.
  envDir: '..',
})
