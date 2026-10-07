// Real HTTP/JWT/schema checks; isolated adapters, no MongoDB or mail connection.
const assert = require('assert');
const http = require('http');
const express = require('express');
process.env.JWT_SECRET = 'synthetic-prediction-secret';
const User = require('../model/user');
const Bet = require('../model/bets');
const Session = require('../model/sessions');
const Party = require('../model/parties');
const { issueToken } = require('../security/tokens');
const { isOpen } = require('../security/predictions');
const userId = '000000000000000000000001';
const sessionId = '000000000000000000000002';
const partyId = '000000000000000000000003';
const otherParty = '000000000000000000000004';
const user = new User({ _id: userId, name: 'Synthetic', email: 'synthetic@example.com', hashPasword: 'unused' });
User.findById = async id => String(id) === userId ? user : null;
let session;
const open = () => ({ _id: sessionId, startDate: new Date(Date.now() - 60000), endDate: new Date(Date.now() + 60000), isClosed: false });
let reads = 0, writes = 0, indexFailed = false, writeFailed = false, duplicate = false, record;
Session.findById = async () => { reads++; return session; };
Party.find = () => ({ select: async () => [{ _id: partyId }] });
Bet.init = async () => { if (indexFailed) throw new Error('synthetic index outage'); };
Bet.findOneAndUpdate = async (filter, update, options) => {
    writes++;
    assert.deepEqual(filter, { userId, sessionId });
    assert.equal(options.runValidators, true);
    if (writeFailed) throw new Error('synthetic private DB error');
    if (duplicate && options.upsert) { duplicate = false; throw Object.assign(new Error('duplicate'), { code: 11000 }); }
    if (!record) record = { _id: '000000000000000000000005', createdAt: new Date(), ...filter };
    Object.assign(record, update.$set);
    return { toObject: () => ({ ...record }) };
};
const app = express();
app.use(express.json());
app.use('/api/bets', require('../routes/bets-route'));
app.use((error, req, res, next) => res.status(error.status || 503).json({ error: 'Unable to complete request' }));
let server, checks = 0;
function request(body, token = issueToken(user)) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request({ host: '127.0.0.1', port: server.address().port, path: '/api/bets/add', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        }, res => {
            let text = '';
            res.on('data', chunk => text += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(text) }));
        });
        req.on('error', reject); req.end(data);
    });
}
async function status(body, expected, token) {
    const result = await request(body, token);
    assert.equal(result.status, expected, JSON.stringify(result)); checks++;
    return result;
}
(async () => {
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    session = open();
    const valid = { sessionId, bets: { [partyId]: 120 } };
    await status(valid, 401, null);
    for (const body of [null, [], {}, { ...valid, userId }, { ...valid, sessionId: { $ne: null } },
        { ...valid, sessionId: 'bad' }, { ...valid, bets: [] }, { ...valid, bets: { $ne: 120 } },
        ...[-1, 1.5, '120', 121, 119, null].map(value => ({ ...valid, bets: { [partyId]: value } }))]) {
        await status(body, 400);
    }
    assert.equal(reads, 0); checks++;
    await status({ ...valid, bets: { [otherParty]: 120 } }, 400);
    assert.equal(writes, 0); checks++;
    const saved = await status(valid, 200);
    assert.deepEqual(saved.body.userId, { _id: userId, name: 'Synthetic' }); checks++;
    const createdAt = record.createdAt;
    duplicate = true;
    await status(valid, 200);
    assert.equal(record.createdAt, createdAt); checks++;
    indexFailed = true;
    const before = writes;
    await status(valid, 503);
    assert.equal(writes, before); checks++;
    indexFailed = false;
    writeFailed = true;
    const failed = await status(valid, 503);
    assert(!JSON.stringify(failed).includes('private DB')); checks++;
    writeFailed = false;
    for (const invalid of [null, { ...open(), isClosed: true }, { ...open(), startDate: new Date(Date.now() + 60000) },
        { ...open(), endDate: new Date(0) }, { ...open(), startDate: null }, { ...open(), startDate: 'invalid' }]) {
        session = invalid;
        await status(valid, invalid ? 403 : 404);
    }
    assert(isOpen({ startDate: new Date(100), endDate: new Date(200), isClosed: false }, 100)); checks++;
    assert(!isOpen({ startDate: new Date(100), endDate: new Date(200), isClosed: false }, 200)); checks++;
    // Real Mongoose validators and index definition, independent of route mocks.
    assert(Bet.schema.indexes().some(([keys, options]) => keys.userId === 1 && keys.sessionId === 1 && options.unique)); checks++;
    for (const bets of [[], [{ partyId, predictedSeats: 119 }], [{ partyId, predictedSeats: 120.5 }],
        [{ partyId, predictedSeats: 60 }, { partyId, predictedSeats: 60 }]]) {
        assert(new Bet({ userId, sessionId, bets }).validateSync()); checks++;
    }
    assert(!new Bet({ userId, sessionId, bets: [{ partyId, predictedSeats: 120 }] }).validateSync()); checks++;
    console.log(`PASS: ${checks} prediction-security assertions (stub DB; no live services)`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { if (server) server.close(); });
