import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        checkout: resolve(__dirname, 'checkout/index.html'),
        paymentReturn: resolve(__dirname, 'payment/return/index.html'),
        terms: resolve(__dirname, 'terms/index.html'),
        privacy: resolve(__dirname, 'privacy/index.html'),
        license: resolve(__dirname, 'license/index.html'),
      },
    },
  },
});
