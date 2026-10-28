// Best-effort in-process rate limiting for Vercel API handlers.
// This reduces bursts on a warm function instance; it is not a distributed limiter.
const buckets = global.__PNW_RATE_LIMIT_BUCKETS || (global.__PNW_RATE_LIMIT_BUCKETS = new Map());
let lastPruneAt = global.__PNW_RATE_LIMIT_LAST_PRUNE || 0;

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown');
}

function rateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  if (now - lastPruneAt >= 60_000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
    // Keep memory bounded if a large number of distinct keys arrive.
    while (buckets.size >= 5000) buckets.delete(buckets.keys().next().value);
    lastPruneAt = now;
    global.__PNW_RATE_LIMIT_LAST_PRUNE = now;
  }
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= maxRequests,
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  };
}

module.exports = { clientIp, rateLimit };
