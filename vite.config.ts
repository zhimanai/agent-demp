import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: env.VITE_DEV_HOST || '0.0.0.0',
      port: Number(env.VITE_DEV_PORT || 8089),
      proxy: {
        [env.VITE_PROXY_PREFIX || '/api']: {
          target: env.VITE_PROXY_TARGET || 'http://127.0.0.1:8080',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      host: env.VITE_DEV_HOST || '0.0.0.0',
      port: Number(env.VITE_PREVIEW_PORT || 4173),
    },
  };
});
