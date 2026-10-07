const jwt = require('jsonwebtoken');
const options = { algorithms: ['HS256'], issuer: 'bet-knesset', audience: 'bet-knesset-client' };
exports.issueToken = user => jwt.sign({ _id: String(user._id), version: user.tokenVersion || 0 }, process.env.JWT_SECRET, {
    algorithm: 'HS256', expiresIn: '1h', issuer: options.issuer, audience: options.audience, subject: String(user._id)
});
exports.verifyToken = token => {
    if (typeof token !== 'string' || token.length > 4096) throw new Error('Invalid token');
    const claims = jwt.verify(token, process.env.JWT_SECRET, options);
    if (!claims || !/^[a-f0-9]{24}$/i.test(claims.sub) || claims._id !== claims.sub ||
        !Number.isInteger(claims.exp) || !Number.isInteger(claims.version) || claims.version < 0) throw new Error('Invalid claims');
    return claims;
};
