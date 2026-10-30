import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import tailwindcss from '@tailwindcss/vite';
import { createReadStream, existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

// Serves MediaPipe's WASM runtime from the app's own origin (dev server and build output), so the
// landmarker never fetches from a CDN. The model lives in public/mediapipe.
const mediapipeWasm = () => {
  const wasmDir = dirname(
    createRequire(import.meta.url).resolve('@mediapipe/tasks-vision/vision_wasm_internal.js')
  );
  return {
    name: 'mediapipe-wasm',
    configureServer(server) {
      server.middlewares.use('/mediapipe/wasm', (req, res, next) => {
        const file = join(wasmDir, (req.url ?? '').split('?')[0]);
        if (!file.startsWith(wasmDir) || !existsSync(file)) return next();
        res.setHeader(
          'Content-Type',
          file.endsWith('.wasm') ? 'application/wasm' : 'text/javascript'
        );
        createReadStream(file).pipe(res);
      });
    },
    generateBundle() {
      for (const name of readdirSync(wasmDir)) {
        this.emitFile({
          type: 'asset',
          fileName: `mediapipe/wasm/${name}`,
          source: readFileSync(join(wasmDir, name)),
        });
      }
    },
  };
};

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
      mediapipeWasm(),
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
