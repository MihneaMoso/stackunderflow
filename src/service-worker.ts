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
  if (event.request.method !== 'GET') return;

  async function respond() {
    // @ts-ignore
    const url = new URL(event.request.url);

    // Don't intercept cross-origin requests at all - let them go directly to network
    // This is critical for WebLLM which fetches models from external CDNs
    if (url.origin !== self.location.origin) {
      // @ts-ignore
      return fetch(event.request);
    }

    // Also skip WebLLM-related files even if same-origin
    if (url.pathname.includes('.wasm') ||
        url.pathname.includes('ndarray-cache') ||
        url.pathname.includes('mlc-') ||
        url.pathname.includes('tokenizer')) {
      // @ts-ignore
      return fetch(event.request);
    }

    const cache = await caches.open(CACHE);

    // Serve build assets from the cache
    if (ASSETS.includes(url.pathname)) {
      const response = await cache.match(url.pathname);
      if (response) return response;
    }

    // Try the network, fallback to cache if offline
    try {
      // @ts-ignore
      const response = await fetch(event.request);
      // Only cache same-origin, successful responses that are cacheable
      if (response.status === 200 && response.type === 'basic') {
        try {
          // @ts-ignore
          cache.put(event.request, response.clone());
        } catch (e) {
          // Ignore cache errors - some responses can't be cached
          console.warn('Failed to cache:', url.pathname);
        }
      }
      return response;
    } catch {
      // @ts-ignore
      return cache.match(event.request);
    }
  }

  // @ts-ignore
  event.respondWith(respond());
});