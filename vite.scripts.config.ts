import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        emptyOutDir: false, // Don't empty, as ui build does it (or vice versa)
        outDir: 'dist',
        lib: {
            entry: {
                background: resolve(__dirname, 'src/background/index.ts'),
                content: resolve(__dirname, 'src/content/index.ts'),
            },
            formats: ['es'],
        },
        rollupOptions: {
            output: {
                entryFileNames: '[name].js',
            },
        },
    },
});
