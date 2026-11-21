import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const api = process.env.KOISABESSA_API || 'http://127.0.0.1:3001';
const proxy = { '/v1': api, '/media': api, '/docs': api };

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, proxy },
  preview: { port: 4173, strictPort: true, proxy },
});
