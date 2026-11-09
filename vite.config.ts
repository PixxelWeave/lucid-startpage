import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    modules: {
      // styles.searchBar  <=>  .search-bar
      localsConvention: 'camelCaseOnly',
    },
    preprocessorOptions: {
      scss: {
        // 每个 SCSS 文件可直接使用变量与 mixin：v.$gap / v.flex-center
        additionalData: `@use "@/styles/variables" as v;\n`,
      },
    },
  },
})
