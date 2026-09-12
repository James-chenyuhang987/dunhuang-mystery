import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
const [repositoryOwner, repositoryName] = process.env.GITHUB_REPOSITORY?.split('/') ?? []
const isUserSite = repositoryName?.toLowerCase() === `${repositoryOwner}.github.io`.toLowerCase()
const base = process.env.GITHUB_ACTIONS === 'true' && repositoryName && !isUserSite
  ? `/${repositoryName}/`
  : '/'

export default defineConfig({
  base,
  plugins: [
    vue(),
    vueDevTools(),
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: { groups: [{ name: 'panorama-engine', test: /node_modules\/three/ }] },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
