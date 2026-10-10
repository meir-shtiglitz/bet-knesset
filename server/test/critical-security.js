// HTTP regression checks with the real router/JWT/model and an isolated in-memory DB adapter.
// Never loads dotenv, connects MongoDB, or sends actual mail.
const assert = require('assert');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'synthetic-test-secret-not-for-deployment';
const User = require('../model/user');
const mails = require('../model/emails');
const sent = [];
mails.sendMail = async (to, subject, text) => { sent.push({ to, text }); };
const { hashPassword, verifyPassword } = require('../security/passwords');
const { rateLimit } = require('../security/rate-limit');
const { issueToken } = require('../security/tokens');
const store = new Map();
async function add(id, role = 0) {
    const user = new User({ _id: id, name: id, email: `${id}@example.com`, role });
    await user.setPassword('old-password');
    store.set(id, user.toObject());
    return User.hydrate(store.get(id));
}
function match(doc, filter) {
    return Object.entries(filter).every(([key, value]) => {
        if (key === '$or') return value.some(branch => match(doc, branch));
        if (value && typeof value === 'object' && !(value instanceof Date)) {
            return Object.entries(value).every(([op, operand]) => {
                if (op === '$ne') return doc[key] !== operand;
                if (op === '$exists') return (doc[key] !== undefined) === operand;
                if (op === '$gt') return doc[key] > operand;
                if (op === '$lt') return doc[key] < operand;
                throw new Error(`Unimplemented test operator ${op}`);
            });
        }
        return String(doc[key]) === String(value);
    });
}
User.findById = async id => store.has(String(id)) ? User.hydrate(store.get(String(id))) : null;
User.findOne = async filter => {
    const doc = [...store.values()].find(doc => match(doc, filter));
    return doc ? User.hydrate(doc) : null;
};
User.findOneAndUpdate = async (filter, update) => {
    const doc = [...store.values()].find(doc => match(doc, filter));
    if (!doc) return null;
    Object.assign(doc, update.$set || {});
    for (const key of Object.keys(update.$unset || {})) delete doc[key];
    for (const [key, value] of Object.entries(update.$inc || {})) doc[key] = (doc[key] || 0) + value;
    return User.hydrate(doc);
};
User.updateOne = async (filter, update) => User.findOneAndUpdate(filter, update);
const originalSave = User.prototype.save;
User.prototype.save = async function () { store.set(String(this._id), this.toObject()); return this; };
const app = express();
app.use(express.json());
app.post('/limited', rateLimit({ limit: 2 }), (req, res) => res.json({ ok: true }));
app.use('/api', require('../routes/user'));
const { isLoged, isAdmin } = require('../middlewears/user');
app.post('/protected', isLoged, (req, res) => res.json({ id: req.tokenId }));
app.post('/admin', isLoged, isAdmin, (req, res) => res.json({ ok: true }));
let server;
let checks = 0;
function request(path, data = {}, token) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const req = http.request({ host: '127.0.0.1', port: server.address().port, path, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        }, res => {
            let text = '';
            res.on('data', chunk => text += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(text) }));
        });
        req.on('error', reject); req.end(body);
    });
}
async function status(path, data, token, expected) {
    const result = await request(path, data, token);
    assert.equal(result.status, expected, `${path}: ${JSON.stringify(result)}`); checks++;
    return result;
}
(async () => {
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const a = await add('000000000000000000000001');
    const b = await add('000000000000000000000002');
    const admin = await add('000000000000000000000003', 1);
    const oddRole = await add('000000000000000000000004', -1);
    const hashA = await hashPassword('same-password');
    const hashB = await hashPassword('same-password');
    assert.notEqual(hashA, hashB); checks++;
    assert(await verifyPassword('same-password', hashA)); checks++;
    assert(!(await verifyPassword('wrong-password', hashA))); checks++;
    assert(!(await verifyPassword('same-password', crypto.createHash('sha256').update('same-password').digest('hex')))); checks++;
    assert(!(await verifyPassword('same-password', hashA.replace('131072', '999999999')))); checks++;
    await assert.rejects(hashPassword('x'.repeat(257)), TypeError); checks++;
    await status('/limited', {}, undefined, 200);
    await status('/limited', {}, undefined, 200);
    await status('/limited', {}, undefined, 429);
    for (const path of ['/api/user/signup', '/api/user/signin']) {
        const data = path.endsWith('signup') ? { name: 'new', email: 'new@example.com' } : { nameOrMail: a.email };
        await status(path, { ...data, password: 'x'.repeat(257) }, undefined, 400);
        await status(path, { ...data, password: { $ne: null } }, undefined, 400);
    }
    assert(!JSON.stringify(store.get(String(a._id))).includes('old-password')); checks++;
    const token = issueToken(a);
    const valid = jwt.decode(token);
    assert.equal(valid.exp - valid.iat, 24 * 60 * 60); checks++;
    const invalidTokens = [
        'not-a-jwt', jwt.sign(valid, 'attacker-secret'), jwt.sign(valid, '', { algorithm: 'none' }),
        jwt.sign({ ...valid, exp: 1 }, process.env.JWT_SECRET),
        jwt.sign({ ...valid, aud: 'other' }, process.env.JWT_SECRET),
        jwt.sign({ ...valid, iss: 'other' }, process.env.JWT_SECRET),
        jwt.sign({ ...valid, sub: 'bad-id' }, process.env.JWT_SECRET),
        jwt.sign({ _id: String(a._id) }, process.env.JWT_SECRET),
        token.slice(0, -8) + 'tampered', issueToken({ _id: '000000000000000000000099' })
    ];
    await status('/protected', {}, undefined, 401);
    for (const bad of invalidTokens) {
        await status('/protected', {}, bad, 401);
        await status('/api/user/signbytoken', { token: bad }, undefined, 401);
    }
    await status('/protected', {}, token, 200);
    const restored = await status('/api/user/signbytoken', { token }, undefined, 200);
    assert.equal(restored.body.token, token); checks++;
    assert.equal(restored.body.expiresAt, valid.exp * 1000); checks++;
    await status('/admin', {}, token, 403);
    await status('/admin', {}, issueToken(oddRole), 403);
    await status('/admin', {}, issueToken(admin), 200);
    await status('/api/user/profile/update', { email: b.email, password: 'attacker-password' }, undefined, 401);
    await status('/api/user/profile/update', { email: b.email, name: 'attacker' }, token, 400);
    await status('/api/user/profile/update', { new_email: 'attacker@example.com' }, token, 400);
    await status('/api/user/profile/update', { password: 'new-password' }, token, 403);
    await status('/api/user/profile/update', { password: 'new-password', currentPassword: 'wrong-password' }, token, 403);
    const own = await status('/api/user/profile/update', { name: 'own-name' }, token, 200);
    assert.equal(own.body.user._id, String(a._id)); checks++;
    assert.equal(store.get(String(b._id)).name, String(b._id)); checks++;
    const changed = await status('/api/user/profile/update', { password: 'new-password', currentPassword: 'old-password' }, token, 200);
    await status('/protected', {}, token, 401);
    await status('/protected', {}, changed.body.token, 200);
    // Legacy documents lacking tokenVersion support authenticated profile updates.
    delete store.get(String(b._id)).tokenVersion;
    await status('/api/user/profile/update', { name: 'legacy' }, issueToken(b), 200);
    const disabled = store.get(String(oddRole._id)); disabled.disabled = true;
    await status('/protected', {}, issueToken(oddRole), 401);
    await status('/api/user/forgot/validmail', { email: { $ne: null } }, undefined, 400);
    const known = await status('/api/user/forgot/validmail', { email: a.email }, undefined, 200);
    const unknown = await status('/api/user/forgot/validmail', { email: 'missing@example.com' }, undefined, 200);
    assert.deepEqual(known.body, unknown.body); checks++;
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(sent.length, 1); checks++;
    const code = sent[0].text.match(/[a-f0-9]{64}/)[0];
    const doc = store.get(String(a._id));
    assert.equal(doc.resetTokenHash, crypto.createHash('sha256').update(code).digest('hex')); checks++;
    assert.notEqual(doc.resetTokenHash, code); checks++;
    await status('/api/user/forgot/validmail', { email: a.email }, undefined, 200);
    await new Promise(resolve => setImmediate(resolve)); assert.equal(sent.length, 1); checks++;
    await status('/api/user/forgot/reset', { token: 'a'.repeat(64), password: 'reset-password' }, undefined, 400);
    const expiry = doc.resetExpiresAt; doc.resetExpiresAt = new Date(0);
    await status('/api/user/forgot/reset', { token: code, password: 'reset-password' }, undefined, 400);
    doc.resetExpiresAt = expiry;
    const concurrent = await Promise.all([request('/api/user/forgot/reset', { token: code, password: 'reset-password' }), request('/api/user/forgot/reset', { token: code, password: 'reset-password' })]);
    assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 400]); checks++;
    assert(!concurrent.find(r => r.status === 200).body.token); checks++;
    assert.equal(doc.resetTokenHash, undefined); checks++;
    assert(await User.hydrate(doc).checkPassword('reset-password')); checks++;
    assert(await User.hydrate(store.get(String(b._id))).checkPassword('old-password')); checks++;
    await status('/protected', {}, changed.body.token, 401);
    await status('/api/user/forgot/reset', { token: code, password: 'another-password' }, undefined, 400);
    await status('/api/user/forgot/reset', { token: code, password: 'another-password' }, undefined, 400);
    await status('/api/user/forgot/reset', { token: code, password: 'another-password' }, undefined, 429);
    const login = await status('/api/user/signin', { nameOrMail: a.email, password: 'reset-password' }, undefined, 200);
    await status('/api/user/signout', {}, login.body.token, 200);
    await status('/protected', {}, login.body.token, 401);
    const registered = await status('/api/user/signup', { name: 'registered', email: 'registered@example.com', password: 'password' }, undefined, 200);
    const registeredDoc = store.get(registered.body.user._id);
    assert(registeredDoc.hashPasword.startsWith('scrypt$131072$8$1$')); checks++;
    await status('/api/user/signin', { nameOrMail: 'registered@example.com', password: 'wrong-password' }, undefined, 401);
    registeredDoc.hashPasword = crypto.createHash('sha256').update('password').digest('hex');
    await status('/api/user/signin', { nameOrMail: 'registered@example.com', password: 'password' }, undefined, 401);
    // A failed persisted registration must not return an access token.
    User.prototype.save = async () => { throw new Error('synthetic DB outage'); };
    const failed = await status('/api/user/signup', { name: 'new', email: 'new@example.com', password: 'password' }, undefined, 503);
    assert(!failed.body.token); checks++;
    console.log(`PASS: ${checks} critical-security assertions (stub DB/mail; no live services)`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
    User.prototype.save = originalSave;
    if (server) server.close();
});
