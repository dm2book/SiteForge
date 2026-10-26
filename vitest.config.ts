import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      /* `server-only` gooit een fout zodra het buiten een servercomponent
         wordt geladen. Dat is precies de bedoeling in de build, maar vitest
         kent de voorwaarde `react-server` niet en zou dan geen enkele module
         uit src/server/ kunnen laden. Zie tests/helpers/server-only.stub.ts. */
      'server-only': fileURLToPath(new URL('./tests/helpers/server-only.stub.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    css: true,
  },
});
