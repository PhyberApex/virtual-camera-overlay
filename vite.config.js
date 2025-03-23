import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const devHost = process.env.VITE_HA_DEV_HOST || '192.168.0.13';
  const port = process.env.VITE_HA_PORT || '8123';
  
  return {
    plugins: [vue()],
    server: {
      proxy: {
        '/api': {
          target: `http://${devHost}:${port}`,
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
})