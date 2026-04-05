const CACHE_NAME = "besserlernen-v2";
const API_CACHE = "besserlernen-api-v1";
const SYNC_QUEUE = "besserlernen-sync";

// Offline'da kesinlikle cache'lenmesi gereken kaynaklar
const PRECACHE_URLS = [
  "/",
  "/giris",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.ico",
];

// Offline'da cache'lenecek API pattern'leri (GET istekleri)
const CACHEABLE_API = [
  /\/api\/desteler$/,
  /\/api\/desteler\/[^/]+$/,
  /\/api\/calisma\/[^/]+$/,
  /\/api\/desteler\/[^/]+\/smart-pool/,
  /\/api\/stats$/,
];

// Install: precache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: temizle eski cache'leri + bildir
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE && key !== SYNC_QUEUE)
          .map((key) => caches.delete(key))
      )
    ).then(() => {
      // Tum client'lara yeni versiyon bildirimi gonder
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "SW_UPDATED" });
        });
      });
    })
  );
  self.clients.claim();
});

// API istegi cache'lenebilir mi?
function isCacheableApi(url) {
  return CACHEABLE_API.some((pattern) => pattern.test(url.pathname));
}

// Fetch handler
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // POST/PUT/DELETE API istekleri — network, basarisizsa kuyruge al
  if (url.pathname.startsWith("/api/") && event.request.method !== "GET") {
    event.respondWith(handleMutationRequest(event.request));
    return;
  }

  // GET API istekleri — network-first, cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApiGet(event.request, url));
    return;
  }

  // Next.js data/chunk + navigasyon — stale-while-revalidate
  if (url.pathname.startsWith("/_next/") || event.request.mode === "navigate") {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request)
            .then((response) => {
              if (response.ok) cache.put(event.request, response.clone());
              return response;
            })
            .catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Diger statik kaynaklar — cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// GET API: network-first, basarisizsa cache'ten dondur
async function handleApiGet(request, url) {
  const cacheable = isCacheableApi(url);

  try {
    const response = await fetch(request);
    // Basarili response'u cache'le
    if (response.ok && cacheable) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline — cache'ten dondur
    if (cacheable) {
      const cached = await caches.match(request);
      if (cached) return cached;
    }
    return new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// POST/PUT/DELETE: network, basarisizsa kuyruge al
async function handleMutationRequest(request) {
  try {
    return await fetch(request);
  } catch {
    // Feedback ve review isteklerini kuyruge al
    const url = new URL(request.url);
    if (url.pathname.includes("/feedback") || url.pathname.includes("/review")) {
      const body = await request.clone().text();
      await addToSyncQueue({
        url: request.url,
        method: request.method,
        body,
        timestamp: Date.now(),
      });
      return new Response(JSON.stringify({ queued: true, offline: true }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// IndexedDB-based sync queue
function openSyncDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SYNC_QUEUE, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("queue", { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function addToSyncQueue(item) {
  const db = await openSyncDB();
  const tx = db.transaction("queue", "readwrite");
  tx.objectStore("queue").add(item);
  await new Promise((resolve) => { tx.oncomplete = resolve; });
  db.close();

  // Background sync kaydol (destekleniyorsa)
  if (self.registration.sync) {
    await self.registration.sync.register("sync-reviews");
  }
}

async function processSyncQueue() {
  const db = await openSyncDB();
  const tx = db.transaction("queue", "readonly");
  const store = tx.objectStore("queue");
  const items = await new Promise((resolve) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });
  db.close();

  const successIds = [];

  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: { "Content-Type": "application/json" },
        body: item.body,
      });
      if (res.ok || res.status < 500) {
        successIds.push(item.id);
      }
    } catch {
      // Hala offline, dur
      break;
    }
  }

  // Basarili olanlari kuyruktan sil
  if (successIds.length > 0) {
    const db2 = await openSyncDB();
    const tx2 = db2.transaction("queue", "readwrite");
    const store2 = tx2.objectStore("queue");
    for (const id of successIds) {
      store2.delete(id);
    }
    await new Promise((resolve) => { tx2.oncomplete = resolve; });
    db2.close();

    // Client'lara bildir
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: "SYNC_COMPLETE",
          count: successIds.length,
        });
      });
    });
  }
}

// Background sync event
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-reviews") {
    event.waitUntil(processSyncQueue());
  }
});

// Online oldugunda da kuyrugu isle (sync desteklenmiyor ise fallback)
self.addEventListener("message", (event) => {
  if (event.data === "PROCESS_SYNC_QUEUE") {
    processSyncQueue();
  }
});
