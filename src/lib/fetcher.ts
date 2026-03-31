const cache = new Map<string, { data: unknown; timestamp: number }>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL = 5000; // 5 saniye cache

export async function cachedFetch<T>(
  url: string,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const now = Date.now();

  // Cache'den dondur
  const cached = cache.get(url);
  if (cached && now - cached.timestamp < ttl) {
    return cached.data as T;
  }

  // Ayni anda ayni URL'ye birden fazla istek yapilmasini engelle
  const existing = inflight.get(url);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fetch(url)
    .then(async (res) => {
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      cache.set(url, { data, timestamp: Date.now() });
      return data as T;
    })
    .finally(() => {
      inflight.delete(url);
    });

  inflight.set(url, promise);
  return promise;
}

export function invalidateCache(urlPrefix?: string) {
  if (!urlPrefix) {
    cache.clear();
    return;
  }
  cache.forEach((_, key) => {
    if (key.startsWith(urlPrefix)) {
      cache.delete(key);
    }
  });
}
