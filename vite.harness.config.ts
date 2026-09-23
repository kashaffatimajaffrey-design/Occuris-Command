import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Diagnostic harness. Mounts the REAL App with only the Supabase client
// stubbed, so a signed-in shell renders without a live login. Everything else
// — contexts, services, components, the backend it calls — is the real thing,
// so a crash here is a crash in the real app.
//
//   npx vite --config vite.harness.config.ts --port 5174 --host localhost
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
          find: /^\.\.\/services\/supabaseClient$/,
          replacement: path.resolve(__dirname, 'harness/supabaseStub.ts'),
        },
        {
          find: /^\.\/supabaseClient$/,
          replacement: path.resolve(__dirname, 'harness/supabaseStub.ts'),
        },
      ],
    },
  };
});
