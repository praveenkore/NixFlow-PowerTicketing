import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Configure the dev server to listen on all interfaces and a non-conflicting port.  This
      // allows the application to be accessed via an external IP or domain and avoids
      // clashing with the backend API which runs on port 3000.
      server: {
        host: '0.0.0.0',
        port: 5173,
      },
      plugins: [react()],
      define: {
        // Expose the Gemini API key to the client.  Use the same environment variable for
        // both aliases to maintain backward compatibility with legacy code paths.
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        },
      },
      // Mirror the dev server settings for the preview server used when running
      // `vite preview`.  This ensures consistent behaviour across development and
      // preview modes.
      preview: {
        host: '0.0.0.0',
        port: 5173,
      },
    };
});
