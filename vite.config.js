import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(() => {
  const devHost = process.env.VITE_HA_DEV_HOST;
  const port = process.env.VITE_HA_PORT;

  return {
    plugins: [vue()],
    server: {
      proxy: {
        '/api': {
          target: `http://${devHost}:${port}`,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      deps: {
        inline: ['vue'],
      },
      coverage: {
        reporter: ['text', 'json', 'html'],
      },
    },
  };
});
