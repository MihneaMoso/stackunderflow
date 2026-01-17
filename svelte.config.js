import adapterAuto from '@sveltejs/adapter-auto';
import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Select adapter based on deployment environment
function getAdapter() {
	if (process.env.CF_PAGES) {
		// Cloudflare Pages
		return adapterCloudflare();
	}
	if (process.env.GITHUB_ACTIONS) {
		// GitHub Pages (static build)
		return adapterStatic({
			pages: 'build',
			assets: 'build',
			fallback: '404.html', // GitHub Pages uses 404.html for SPA fallback
			precompress: false
		});
	}
	// Default: Vercel, Netlify, etc.
	return adapterAuto();
}

const adapter = getAdapter();

// Set base path for GitHub Pages (repo name)
const basePath = process.env.GITHUB_ACTIONS ? '/stackunderflow' : '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter,
		paths: {
			base: basePath
		}
	}
};

export default config;
