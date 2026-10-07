const User = require('../model/user');
const { verifyToken } = require('../security/tokens');
async function authenticate(token, req, res, next) {
    let claims;
    try { claims = verifyToken(token); }
    catch (_) { return res.status(401).json({ error: 'Please sign in again' }); }
    try {
        const user = await User.findById(claims.sub);
        if (!user || user.disabled || claims.version !== (user.tokenVersion || 0)) return res.status(401).json({ error: 'Please sign in again' });
        req.user = user;
        req.tokenId = String(user._id);
        next();
    } catch (_) { return res.status(503).json({ error: 'Authentication temporarily unavailable' }); }
}
exports.isLoged = (req, res, next) => {
    const match = typeof req.headers.authorization === 'string' && /^Bearer ([^\s]+)$/i.exec(req.headers.authorization);
    return authenticate(match ? match[1] : undefined, req, res, next);
};
exports.restoreSession = (req, res, next) => authenticate(req.body && req.body.token, req, res, next);
// Role 0 is a participant; only explicit role 1 grants administration.
exports.isAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 1) return res.status(403).json({ error: 'For admins only' });
    next();
};
