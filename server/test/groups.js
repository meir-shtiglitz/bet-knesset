// Real HTTP routes and JWT verification with isolated in-memory model adapters.
// No dotenv, MongoDB or email is used.
const assert = require('assert');
const http = require('http');
process.env.JWT_SECRET = 'synthetic-groups-test-secret-at-least-32-bytes';
const Group = require('../model/group');
const Membership = require('../model/group-membership');
const User = require('../model/user');
const Session = require('../model/sessions');
const Party = require('../model/parties');
const Bet = require('../model/bets');
const Result = require('../model/results');
const { issueToken } = require('../security/tokens');
const { charts, eligible } = require('../security/group-charts');
const { createApp } = require('../app');
const ids = n => n.toString(16).padStart(24, '0');
const users = [1, 2, 3].map(n => ({ _id: ids(n), name: `user-${n}`, tokenVersion: 0, role: n === 3 ? 1 : 0 }));
const tokens = users.map(issueToken);
User.findById = async id => users.find(u => u._id === String(id));
let groups = [], memberships = [], nextId = 100;
const election = { _id: ids(10), endDate: new Date(Date.now() + 60000), isClosed: false };
let sessions = [election];
let bets = users.map((u, i) => ({ _id: ids(20 + i), userId: u._id, sessionId: election._id, score: 100 - i,
    bets: [{ partyId: ids(11), predictedSeats: 40 + i * 10 }, { partyId: ids(12), predictedSeats: 80 - i * 10 }] }));
let result = null;
function match(record, filter) {
    return Object.entries(filter).every(([key, expected]) => expected && expected.$in ? expected.$in.some(v => String(v) === String(record[key])) : String(record[key]) === String(expected));
}
function query(value) {
    return { select() { return this; }, sort() { return this; }, limit(max) { this.max = max; return this; },
        populate() { this.populated = true; return this; }, then(resolve, reject) {
            let output = Array.isArray(value) ? value.slice(0, this.max) : value;
            if (this.populated && Array.isArray(output)) output = output.map(r => ({ ...r, userId: users.find(u => u._id === r.userId) || null }));
            return Promise.resolve(output).then(resolve, reject);
        } };
}
function adapter(model, read) {
    model.find = filter => query(read().filter(r => match(r, filter)));
    model.findOne = filter => query(read().find(r => match(r, filter)) || null);
    model.create = async data => {
        const rows = read();
        if (model === Membership && rows.some(m => m.groupId === data.groupId && m.userId === data.userId)) throw Object.assign(new Error('duplicate'), { code: 11000 });
        const record = { ...data, _id: ids(nextId++), deleted: false }; rows.push(record); return record;
    };
    model.updateOne = async (filter, update) => {
        const found = read().find(r => match(r, filter));
        if (found) Object.assign(found, update.$set); return { n: found ? 1 : 0 };
    };
}
adapter(Group, () => groups); adapter(Membership, () => memberships);
Membership.deleteMany = async filter => { memberships = memberships.filter(r => !match(r, filter)); };
Session.find = filter => query(sessions.filter(s => match(s, filter)));
Session.findById = async id => sessions.find(s => s._id === id);
Party.find = () => query([{ _id: ids(11) }, { _id: ids(12) }]);
Bet.find = filter => query(bets.filter(b => match(b, filter)));
Result.findOne = async () => result;
let server, checks = 0;
function check(value) { assert(value); checks++; }
async function request(path, expected = 200, user = 0, method = 'GET', body) {
    const response = await new Promise((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port: server.address().port, path: `/api/groups${path}`, method,
            headers: { 'Content-Type': 'application/json', ...(user === null ? {} : { Authorization: `Bearer ${tokens[user]}` }) } }, res => {
            let raw = ''; res.on('data', c => raw += c); res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(raw) }));
        }); req.on('error', reject); req.end(body === undefined ? undefined : JSON.stringify(body));
    });
    assert.equal(response.status, expected, JSON.stringify(response.data)); checks++; return response.data;
}
(async () => {
    server = await new Promise(resolve => { const s = createApp().listen(0, '127.0.0.1', () => resolve(s)); });
    await request('', 401, null);
    await request('', 400, 0, 'POST', { name: 'x', creatorId: users[1]._id });
    await request('', 400, 0, 'POST', { name: ' '.repeat(5) });
    const created = await request('', 201, 0, 'POST', { name: 'Friends', description: 'Our group' });
    const gid = created.groupId, invitation = `/invite/${created.inviteCode}`;
    check(/^[a-f0-9]{64}$/.test(created.inviteCode));
    check(groups[0].creatorId === users[0]._id);
    check(memberships[0].status === 'active');
    check(Object.keys(await request(invitation, 200, null)).join() === 'name');
    await request(`${invitation}/join`, 401, null, 'POST', {});
    await request(`/${gid}`, 403, 1);
    await request(`/${gid}/charts/${election._id}`, 403, 1);
    await request(`${invitation}/join`, 200, 1, 'POST', {});
    const joinedAt = memberships[1].joinedAt;
    await request(`${invitation}/join`, 200, 1, 'POST', {});
    check(memberships.length === 2 && memberships[1].joinedAt === joinedAt);
    check((await request('', 200, 1)).groups.length === 1);
    await request(`/${gid}/invite`, 403, 1);
    await request(`/${gid}`, 403, 1, 'PATCH', { name: 'Hijacked' });
    await request(`/${gid}`, 403, 2, 'DELETE'); // App administrator does not own this group.
    await request(`/${gid}/leave`, 403, 0, 'POST', {});
    check((await request(`/${gid}`, 200, 1)).members.length === 2);
    let data = await request(`/${gid}/charts/${election._id}`);
    check(data.participantCount === 2 && data.averages[0].avg === 45);
    check(!data.winnersReady && !data.winners.length);
    result = { results: [{ partyId: ids(11), actualSeats: 40 }] };
    data = await request(`/${gid}/charts/${election._id}`);
    check(data.winnersReady && data.winners.length === 2 && data.winners[0].userId._id === users[0]._id);
    bets[1].score = undefined;
    data = await request(`/${gid}/charts/${election._id}`); check(!data.winnersReady && !data.winners.length);
    bets[1].score = 99;
    await request(`/${gid}/leave`, 200, 1, 'POST', {});
    election.endDate = new Date(Date.now() - 1000);
    await request(`${invitation}/join`, 200, 1, 'POST', {});
    data = await request(`/${gid}/charts/${election._id}`);
    check(data.participantCount === 2 && !data.winners.some(b => b.userId._id === users[1]._id));
    check((await request(`/${gid}/charts/${election._id}`, 200, 1)).viewerEligible === false);
    await request(`/${gid}/members/${users[0]._id}/remove`, 400, 0, 'POST', {});
    await request(`/${gid}/members/${users[1]._id}/remove`, 200, 0, 'POST', {});
    await request(`${invitation}/join`, 403, 1, 'POST', {});
    await request(`/${gid}`, 403, 1);
    data = await request(`/${gid}/charts/${election._id}`); check(data.participantCount === 1);
    await request(`/${gid}/members/${users[1]._id}/unblock`, 200, 0, 'POST', {});
    await request(`${invitation}/join`, 200, 1, 'POST', {});
    await request(`/${gid}`, 200, 0, 'PATCH', { name: 'Renamed', description: '' });
    check(groups[0].name === 'Renamed');
    const rotated = await request(`/${gid}/invite/reset`, 200, 0, 'POST', {});
    check(rotated.inviteCode !== created.inviteCode);
    await request(invitation, 404, null);
    check((await request(`/${gid}/invite`)).inviteCode === rotated.inviteCode);
    election.isClosed = true;
    const lateGroup = await request('', 201, 2, 'POST', { name: 'Renamed' });
    const lateData = await request(`/${lateGroup.groupId}/charts/${election._id}`, 200, 2);
    check(lateData.participantCount === 1 && !lateData.winners.length);
    await request(`/${gid}`, 200, 0, 'DELETE');
    await request(`/${gid}`, 404, 1);
    await request(`/invite/${rotated.inviteCode}`, 404, null);
    check(!memberships.some(m => m.groupId === gid)); check(bets.length === 3);
    const mem = { userId: users[0]._id, status: 'active', joinedAt: new Date(1000), excludedSessionIds: [] };
    check(!eligible(mem, { _id: election._id, endDate: new Date(1000) }));
    check(eligible(mem, { _id: election._id, endDate: new Date(1001) }));
    check(!eligible({ ...mem, excludedSessionIds: [election._id] }, { _id: election._id, endDate: new Date(2000) }));
    check(!eligible(mem, { _id: election._id, endDate: 'invalid' }));
    check(charts([], [], election, [{ _id: ids(11) }], null).averages[0].avg === 0);
    check(!charts(bets, [mem], { ...election, endDate: new Date(2000) }, [], { results: [] }).winnersReady);
    check(charts(bets, [{ ...mem, status: 'left' }], election, [], result).participantCount === 0);
    console.log(`PASS: ${checks} groups assertions (real HTTP/auth, synthetic DB; no live services)`);
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => { if (server) server.close(); });
