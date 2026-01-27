import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            input: {
                sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
                options: resolve(__dirname, 'src/options/index.html'),
                // For background and content scripts, we usually need a separate build step 
                // OR we can output them as entry points if we handle the filenames carefully.
                // However, standard Vite builds ESM validation. Chrome extension service workers MUST be ESM (in MV3).
                // Content scripts generally need to be IIFE or bundled suitable for loading.
                // For simplicity in this step, we will use Vite to build the HTML pages, 
                // and we will rely on a separate config or manual step for scripts.
                // BUT, let's try to add them here and see if consistent naming works.
            },
        },
    },
});
