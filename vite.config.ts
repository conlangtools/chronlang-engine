import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from "vite-plugin-dts"

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: resolve(__dirname, './src/mod.ts'),
      name: 'chronlang-engine',
      fileName: 'chronlang-engine',
    },
  },
})