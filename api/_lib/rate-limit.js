// Rate limit STOPGAP. En Vercel Functions (serverless) un `Map` en memoria
// NO se comparte entre invocaciones ni instancias: cada cold start arranca
// vacío y una función escalada horizontalmente tiene N mapas.
//
// Sirve como freno soft contra bursts en la misma instancia. Para límites
// reales usa Vercel KV, Upstash Redis, o una tabla con TTL.

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 24 * 60 * 60 * 1000);
const MAX_HITS = Number(process.env.RATE_LIMIT_MAX_HITS ?? 3);

const hits = new Map();

export function rateLimit(key) {
  if (!key) return { allowed: true };
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_HITS) {
    hits.set(key, recent);
    return { allowed: false, count: recent.length };
  }
  recent.push(now);
  hits.set(key, recent);
  return { allowed: true, count: recent.length };
}
