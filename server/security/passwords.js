const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);
// OWASP scrypt minimum: N=2^17, r=8, p=1; approximately 128 MiB per operation.
const options = { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 };
const prefix = 'scrypt$131072$8$1$';
const validPassword = value => typeof value === 'string' && value.length >= 6 && value.length <= 256;
// Bound expensive work, including queued work, so requests cannot exhaust memory.
let active = false;
const queue = [];
async function derive(password, salt) {
    if (active) {
        if (queue.length >= 16) throw new Error('Password service busy');
        await new Promise(resolve => queue.push(resolve));
    } else active = true;
    try { return await scrypt(password, salt, 64, options); }
    finally {
        const next = queue.shift();
        if (next) next();
        else active = false;
    }
}
async function hashPassword(password) {
    if (!validPassword(password)) throw new TypeError('Invalid password');
    const salt = crypto.randomBytes(16).toString('hex');
    const key = await derive(password, salt);
    return `${prefix}${salt}$${key.toString('hex')}`;
}
async function verifyPassword(password, encoded) {
    if (!validPassword(password) || typeof encoded !== 'string') return false;
    // No SHA256 fallback; development accounts must reset or be recreated.
    if (!/^scrypt\$131072\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(encoded)) return false;
    const [, , , , salt, key] = encoded.split('$');
    const derived = await derive(password, salt);
    return crypto.timingSafeEqual(derived, Buffer.from(key, 'hex'));
}
module.exports = { hashPassword, verifyPassword };
