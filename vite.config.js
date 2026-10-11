import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// NOTE: base './' keeps the build working under any GitHub Pages URL,
// both username.github.io and username.github.io/<repo>/.
export default defineConfig({
  plugins: [react()],
  base: './',
})
