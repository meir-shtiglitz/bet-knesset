// Entrypoint/read regression checks with synthetic adapters; never connects MongoDB.
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
process.env.JWT_SECRET = 'synthetic-app-test-secret-at-least-32-bytes';
const Session = require('../model/sessions');
const Party = require('../model/parties');
const Bet = require('../model/bets');
const Result = require('../model/results');
const { createApp } = require('../app');
const { start } = require('../index');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bet-knesset-app-test-'));
fs.writeFileSync(path.join(dir, 'index.html'), '<html>synthetic SPA</html>');
let sessions = [], parties = [], bets = [], outage = false;
const projections = [];
function query(items) {
    return { select(value) { projections.push(value); return this; }, sort() { return this; },
        populate() { return this; }, limit(max) { this.max = max; return this; },
        then(resolve, reject) { return (outage ? Promise.reject(new Error('sentinel-database-secret')) : Promise.resolve(items.slice(0, this.max))).then(resolve, reject); } };
}
Session.find = () => query(sessions); Party.find = () => query(parties); Bet.find = () => query(bets);
Result.findOne = () => ({ select: async () => null });
let server, checks = 0;
const log = [];
const originalError = console.error;
console.error = (...args) => log.push(args.join(' '));
function request(url, body, method = 'GET') {
    return new Promise((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port: server.address().port, path: url, method,
            headers: body === undefined ? {} : { 'Content-Type': 'application/json' }
        }, res => {
            let text = ''; res.on('data', chunk => text += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: text, headers: res.headers }));
        }); req.on('error', reject); req.end(body);
    });
}
async function status(url, expected, body, method) {
    const response = await request(url, body, method);
    assert.equal(response.status, expected, response.body); checks++;
    if (url.startsWith('/api')) { assert(response.headers['content-type'].includes('application/json')); checks++; }
    return response;
}
(async () => {
    server = await new Promise(resolve => { const s = createApp({ buildPath: dir }).listen(0, '127.0.0.1', () => resolve(s)); });
    const missing = await status('/api/no-such-route', 404);
    assert(/^[a-f0-9]{24}$/.test(missing.headers['x-request-id'])); checks++;
    await status('/api/user/signin', 400, '{"password":"sentinel-password",', 'POST');
    await status('/api/user/signin', 413, JSON.stringify({ password: 'x'.repeat(40000) }), 'POST');
    const spa = await status('/some-browser-route', 200); assert(spa.body.includes('synthetic SPA')); checks++;
    await status('/api/bets/get/latest', 404);
    await status('/api/bets/get/bad%24slug', 400);
    await status('/api/bets/get/latest?email[$ne]=null', 400);
    sessions = [{ _id: '000000000000000000000001', slug: 'election-2026' }];
    await status('/api/bets/get/missing', 404);
    await status('/api/bets/get/latest', 200);
    await status('/api/bets/get/election-2026', 200);
    assert(projections.every(value => !value.includes('email') && !value.includes('hashPasword'))); checks++;
    bets = Array.from({ length: 1001 }, () => ({})); await status('/api/bets/get/latest', 503); bets = [];
    parties = Array.from({ length: 121 }, () => ({})); await status('/api/bets/get/latest', 503); parties = [];
    sessions = Array.from({ length: 101 }, () => ({})); await status('/api/bets/get/latest', 503);
    sessions = [{ _id: '000000000000000000000001', slug: 'election-2026' }];
    outage = true; await status('/api/bets/get/latest', 503); outage = false;
    await status('/api/bets/calculate', 405);
    await status('/api/bets/category/update/anything', 404, '{}', 'PUT');
    assert(!log.join(' ').includes('sentinel')); checks++;
    const env = { DATABASE: 'mongodb://synthetic.invalid/test', JWT_SECRET: 'synthetic-startup-secret-at-least-32-bytes', PORT: '4000' };
    let connected = false, created = false;
    await assert.rejects(start({ env: {}, connect: async () => { connected = true; } })); checks++;
    assert(!connected); checks++;
    await assert.rejects(start({ env, connect: async () => { throw new Error('sentinel-database-secret'); }, create: () => { created = true; } })); checks++;
    assert(!created); checks++;
    await assert.rejects(start({ env, connect: async () => {}, initialize: async () => { throw new Error('index failure'); }, create: () => { created = true; } })); checks++;
    assert(!created); checks++;
    const order = [];
    await start({ env, connect: async () => { order.push('connect'); }, initialize: async () => { order.push('indexes'); },
        create: () => ({ listen: (port, callback) => { order.push('listen'); process.nextTick(callback); return { once() {} }; } }) });
    assert.deepEqual(order, ['connect', 'indexes', 'listen']); checks++;
    console.log(`PASS: ${checks} app/read/startup assertions (stub DB; no live services)`);
})().catch(error => { originalError(error); process.exitCode = 1; }).finally(() => {
    console.error = originalError; if (server) server.close();
    fs.rmSync(dir, { recursive: true, force: true });
});
