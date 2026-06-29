import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        b: resolve(__dirname, 'b/index.html'),
        c: resolve(__dirname, 'c/index.html'),
        checkout: resolve(__dirname, 'checkout/index.html'),
        access: resolve(__dirname, 'access/index.html'),
        accessVerify: resolve(__dirname, 'access/verify.html'),
        admin: resolve(__dirname, 'admin/index.html'),
        terms: resolve(__dirname, 'terms/index.html'),
        privacy: resolve(__dirname, 'privacy/index.html'),
        license: resolve(__dirname, 'license/index.html'),
      },
    },
  },
});
