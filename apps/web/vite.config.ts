import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const local = loadEnv(mode, '../..', '');
  const port = process.env.CONTROL_PLANE_PORT ?? local.CONTROL_PLANE_PORT ?? '8080';
  const target = process.env.INCIDENTLENS_API_TARGET ?? `http://127.0.0.1:${port}`;
  const url = new URL(target);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('IncidentLens API proxy supports a local loopback origin only.');
  return {
    plugins: [react(), ...(mode === 'learning' ? [{ name: 'learning-only', configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use('/api', (_request, response) => { response.statusCode = 503; response.setHeader('Content-Type', 'application/problem+json'); response.end(JSON.stringify({ status: 503, detail: 'Learning-only mode: the experiment backend is not connected.' })); });
    } }] : [])],
    server: { port: 5173, proxy: mode === 'learning' ? undefined : { '/api': { target, changeOrigin: true } } },
    test: { include: ['src/**/*.test.{ts,tsx}'], environment: 'jsdom', setupFiles: ['./src/test-setup.ts'], clearMocks: true },
  };
});
