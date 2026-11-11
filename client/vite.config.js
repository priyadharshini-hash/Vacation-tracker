import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Optional local HTTPS: Slack only accepts https redirect addresses, so "Sign in with Slack" needs the app on
// https://localhost:5173. If client/certs/localhost.pfx exists (see README), the dev server uses it.
const pfxPath = path.resolve(__dirname, 'certs/localhost.pfx');
const https = fs.existsSync(pfxPath) ? { pfx: fs.readFileSync(pfxPath), passphrase: 'localhost-dev' } : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    https,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
