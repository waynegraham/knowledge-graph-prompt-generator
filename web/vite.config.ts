import { resolve } from 'path'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        tutorial: resolve(__dirname, 'tutorial.html'),
        themePreview: resolve(__dirname, 'theme-preview.html'),
      },
    },
  },
})
