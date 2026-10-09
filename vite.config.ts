import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/lib/storage.ts', 'src/store/create-store.ts'],
      reporter: ['text', 'html'],
    },
  },
});
