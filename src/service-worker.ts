// src/service-worker.ts
/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
  // Create a new cache and add all files to it
  async function addFilesToCache() {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
  }

  // @ts-ignore
  event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
  // Remove previous cached data from disk
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      if (key !== CACHE) await caches.delete(key);
    }
  }

  // @ts-ignore
  event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
  // @ts-ignore
  const request = event.request;
  
  // Only handle GET requests
  if (request.method !== 'GET') return;

  // @ts-ignore
  const url = new URL(request.url);

  // CRITICAL: Don't intercept cross-origin requests at all
  // This is essential for WebLLM which fetches models from Hugging Face CDN
  if (url.origin !== self.location.origin) {
    return; // Let the browser handle it normally
  }

  // Also skip WebLLM-related files
  if (url.pathname.includes('.wasm') ||
      url.pathname.includes('ndarray') ||
      url.pathname.includes('mlc') ||
      url.pathname.includes('tokenizer') ||
      url.pathname.includes('params')) {
    return; // Let the browser handle it normally
  }

  async function respond(): Promise<Response> {
    const cache = await caches.open(CACHE);

    // Serve build assets from the cache
    if (ASSETS.includes(url.pathname)) {
      const cachedResponse = await cache.match(url.pathname);
      if (cachedResponse) return cachedResponse;
    }

    // Try the network, fallback to cache if offline
    try {
      const response = await fetch(request);
      // Only cache successful, same-origin responses
      if (response.status === 200 && response.type === 'basic') {
        cache.put(request, response.clone()).catch(() => {
          // Ignore cache errors silently
        });
      }
      return response;
    } catch {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) return cachedResponse;
      throw new Error('No cached response available');
    }
  }

  // @ts-ignore
  event.respondWith(respond());
});