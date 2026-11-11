import preact from '@preact/preset-vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact()],
  server: {
    proxy: {
      '/api': {
        // `bun run api` serves here via portless; set API_TARGET to point at another server.
        target: process.env.API_TARGET ?? 'http://wordle-api.localhost:1355',
        changeOrigin: true,
      },
    },
  },
})
