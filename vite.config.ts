import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// No `define` block for API keys. This config used to inject GEMINI_API_KEY
// into the client bundle as process.env.API_KEY / process.env.GEMINI_API_KEY.
// Nothing read either one, and a bundled LLM key is readable by every visitor.
// The frontend talks to the backend, which holds provider keys server-side.
export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
