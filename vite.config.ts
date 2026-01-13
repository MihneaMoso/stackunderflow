import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    allowedHosts: [
      "29483b4d0aeb.ngrok-free.app",
    ]
  },
	plugins: [sveltekit()]
});
