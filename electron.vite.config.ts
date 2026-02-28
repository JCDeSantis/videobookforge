import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['ffmpeg-static', 'ffprobe-static']
      }
    }
  },
  preload: {},
  renderer: {
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0')
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
