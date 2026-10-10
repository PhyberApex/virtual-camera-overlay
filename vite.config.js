import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: tag => tag.startsWith('vite-plugin-vue-devtools-'),
          },
        },
      }),
      vueDevTools(),
      tailwindcss(),
    ],
    define: {
      __VUE_PROD_DEVTOOLS__: mode === 'development',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: mode === 'development',
    },
    base: './',
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
