// Single-process limits keyed by Express req.ip. Keep trust proxy disabled unless
// a known proxy topology is configured; forwarded headers are not identity.
function rateLimit({ limit, windowMs = 15 * 60 * 1000 }) {
    const attempts = new Map();
    return (req, res, next) => {
        const now = Date.now();
        for (const [key, entry] of attempts) if (entry.until <= now) attempts.delete(key);
        const key = req.ip;
        const entry = attempts.get(key) || { count: 0, until: now + windowMs };
        if (entry.count >= limit || (!attempts.has(key) && attempts.size >= 10000)) {
            res.set('Retry-After', String(Math.max(1, Math.ceil((entry.until - now) / 1000))));
            return res.status(429).json({ error: 'Too many requests. Try again later.' });
        }
        entry.count++;
        attempts.set(key, entry);
        next();
    };
}
module.exports = { rateLimit };
