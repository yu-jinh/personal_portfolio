import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import markdownContent from './vite/markdown-content.js'

// NOTE: base './' keeps the build working under any GitHub Pages URL,
// both username.github.io and username.github.io/<repo>/.
export default defineConfig({
  plugins: [markdownContent(), react()],
  base: './',
  // Math-heavy post bodies (KaTeX HTML) are large but compress ~20x and load
  // only on their own page, so the default 500 kB warning is noise here.
  build: { chunkSizeWarningLimit: 800 },
})
