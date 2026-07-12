import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// When built inside GitHub Actions, GITHUB_REPOSITORY is "owner/repo" and the
// site is served from https://owner.github.io/repo/, so assets need that
// base path. Local dev and other hosts (Vercel, custom domain) just use '/'.
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/` : '/'

export default defineConfig({
  plugins: [react()],
  base,
})
