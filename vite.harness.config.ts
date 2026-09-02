import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Harness-only config. Swaps the tenant module for a stub so protected
// components render without a Supabase session. Everything else is real.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    root: path.resolve(__dirname, 'harness'),
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
        env.VITE_API_BASE_URL || 'http://localhost:8000'
      ),
    },
    resolve: {
      alias: [
        {
          find: /^\.\.\/contexts\/TenantContext$/,
          replacement: path.resolve(__dirname, 'harness/TenantStub.tsx'),
        },
      ],
    },
  };
});
