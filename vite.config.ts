/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Expose on the local network (same setup as the scrippy frontend) —
    // the API base URL must then be the host machine's LAN IP, not
    // localhost (see .env / README).
    host: true,
  },
  test: {
    // Pure-node tests (calc modules, schema, gates) — no DOM environment.
    include: ['src/**/*.test.ts'],
  },
});
