import deno from '@deno/vite-plugin'
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [deno()],
  build: {
    lib: {
      entry: resolve(__dirname, 'index.ts'),
      name: 'chronlang-web-wrapper',
      fileName: 'chronlang',
    },
  },
})