// src/service-worker.ts
// Minimal service worker that does NOT interfere with WebLLM's model loading
// WebLLM handles its own caching via IndexedDB or Cache API

/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const CACHE = `cache-${version}`;
// Only cache app build assets, not external resources
const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  // @ts-ignore
  self.skipWaiting();
  
  async function addFilesToCache() {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
  }

  // @ts-ignore
  event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
  // Take control immediately
  // @ts-ignore
  event.waitUntil(self.clients.claim());
  
  // Remove old caches
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      // Only delete our app caches, not WebLLM caches
      if (key.startsWith('cache-') && key !== CACHE) {
        await caches.delete(key);
      }
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

  // CRITICAL: Never intercept cross-origin requests
  // WebLLM fetches models from huggingface.co and other CDNs
  if (url.origin !== location.origin) {
    return; // Let browser handle it
  }

  // CRITICAL: Never intercept WebLLM-related resources
  // These patterns match WebLLM model files, WASM, and cache files
  const webllmPatterns = [
    '.wasm',
    'ndarray',
    'params',
    'tokenizer',
    'mlc',
    'model',
    '.bin',
    '.json'
  ];
  
  if (webllmPatterns.some(pattern => url.pathname.toLowerCase().includes(pattern))) {
    return; // Let browser handle it
  }

  // Only serve from cache for known static assets
  if (!ASSETS.includes(url.pathname)) {
    return; // Let browser handle it
  }

  async function respond(): Promise<Response> {
    const cache = await caches.open(CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }

    // If not in cache, fetch from network
    const response = await fetch(request);
    
    // Only cache successful responses
    if (response.ok) {
      cache.put(request, response.clone()).catch(() => {
        // Ignore cache errors
      });
    }
    
    return response;
  }

  // @ts-ignore
  event.respondWith(respond());
});
