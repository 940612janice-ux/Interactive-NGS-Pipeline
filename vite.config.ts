import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/Interactive-NGS-Pipeline/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})