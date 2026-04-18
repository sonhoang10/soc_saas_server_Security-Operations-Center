import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        signin: resolve(__dirname, 'SignIn.html'),
        register: resolve(__dirname, 'Register.html'),
        home: resolve(__dirname, 'home.html'), 
        organization: resolve(__dirname, 'organization.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        portal_admin: resolve(__dirname, 'flux-portal-access/admin.html'),
        portal_dashboard: resolve(__dirname, 'flux-portal-access/dashboard.html'),
      }
    }
  }
})
