const express = require('express');
const crypto = require('crypto');
const Joi = require('joi');
const Group = require('../model/group');
const Membership = require('../model/group-membership');
const Session = require('../model/sessions');
const Party = require('../model/parties');
const Bet = require('../model/bets');
const Result = require('../model/results');
const { isLoged } = require('../middlewears/user');
const { rateLimit } = require('../security/rate-limit');
const { charts, eligible } = require('../security/group-charts');
const router = express.Router();
const hash = code => crypto.createHash('sha256').update(code).digest('hex');
const newInvite = () => crypto.randomBytes(32).toString('hex');
const id = Joi.string().pattern(/^[a-f0-9]{24}$/).required();
const code = Joi.string().pattern(/^[a-f0-9]{64}$/).required();
const details = Joi.object({ name: Joi.string().trim().min(1).max(80).required(), description: Joi.string().trim().allow('').max(500).default('') }).required();
const safe = fn => async (req, res, next) => { try { await fn(req, res, next); } catch (error) {
    res.status(error.code === 11000 ? 409 : 503).json({ error: error.code === 11000 ? 'Membership changed. Please retry.' : 'Unable to complete group request' });
} };
function valid(schema, value, res) {
    const check = schema.validate(value, { convert: false });
    if (check.error) { res.status(400).json({ error: 'Invalid group request' }); return null; }
    return check.value;
}
router.use(rateLimit({ limit: 60 }));
router.get('/invite/:code', safe(async (req, res) => {
    if (!valid(code, req.params.code, res)) return;
    const group = await Group.findOne({ inviteHash: hash(req.params.code), deleted: false }).select('name');
    if (!group) return res.status(404).json({ error: 'Invitation is no longer available' });
    res.json({ name: group.name });
}));
router.use(isLoged);
async function membershipData() {
    const closed = await Session.find({ isClosed: true }).select('_id').limit(101);
    if (closed.length > 100) throw new Error('Election capacity exceeded');
    return { joinedAt: new Date(), excludedSessionIds: closed.map(s => s._id) };
}
router.post('/invite/:code/join', safe(async (req, res) => {
    if (!valid(code, req.params.code, res)) return;
    const group = await Group.findOne({ inviteHash: hash(req.params.code), deleted: false });
    if (!group) return res.status(404).json({ error: 'Invitation is no longer available' });
    const filter = { groupId: group._id, userId: req.tokenId };
    const existing = await Membership.findOne(filter);
    if (existing?.status === 'blocked') return res.status(403).json({ error: 'You have been removed from this group' });
    if (existing?.status !== 'active') {
        const data = await membershipData();
        if (existing) await Membership.updateOne({ ...filter, status: 'left' }, { $set: { ...data, status: 'active' } });
        else await Membership.create({ ...filter, ...data, status: 'active' });
    }
    // Recheck membership and invitation after writes: concurrent removal/deletion fails closed.
    const joined = await Membership.findOne({ ...filter, status: 'active' });
    if (!joined || !await Group.findOne({ _id: group._id, deleted: false, inviteHash: hash(req.params.code) })) {
        return res.status(409).json({ error: 'Group or invitation changed. Please retry.' });
    }
    res.json({ groupId: group._id, name: group.name });
}));
router.get('/', safe(async (req, res) => {
    const memberships = await Membership.find({ userId: req.tokenId, status: 'active' }).select('groupId').limit(101);
    if (memberships.length > 100) return res.status(503).json({ error: 'Too many groups to display' });
    const groups = await Group.find({ _id: { $in: memberships.map(m => m.groupId) }, deleted: false }).select('name description creatorId').sort({ name: 1 });
    res.json({ groups });
}));
router.post('/', rateLimit({ limit: 10 }), safe(async (req, res) => {
    const data = valid(details, req.body, res); if (!data) return;
    const inviteCode = newInvite();
    const membership = await membershipData();
    const group = await Group.create({ ...data, creatorId: req.tokenId, inviteHash: hash(inviteCode), inviteCode });
    try { await Membership.create({ groupId: group._id, userId: req.tokenId, status: 'active', ...membership }); }
    catch (error) { await Group.updateOne({ _id: group._id }, { $set: { deleted: true } }); throw error; }
    res.status(201).json({ groupId: group._id, inviteCode });
}));
router.use('/:groupId', safe(async (req, res, next) => {
    if (!valid(id, req.params.groupId, res)) return;
    req.group = await Group.findOne({ _id: req.params.groupId, deleted: false });
    if (!req.group) return res.status(404).json({ error: 'Group not found' });
    req.membership = await Membership.findOne({ groupId: req.group._id, userId: req.tokenId, status: 'active' });
    if (!req.membership) return res.status(403).json({ error: 'Group membership required' });
    next();
}));
const admin = (req, res, next) => String(req.group.creatorId) === String(req.tokenId) ? next() : res.status(403).json({ error: 'Only the creator can manage this group' });
router.get('/:groupId', safe(async (req, res) => {
    const isAdmin = String(req.group.creatorId) === String(req.tokenId);
    const members = await Membership.find({ groupId: req.group._id, status: { $in: isAdmin ? ['active', 'blocked'] : ['active'] } })
        .select('userId status joinedAt').populate('userId', '_id name').limit(1001);
    if (members.length > 1000) return res.status(503).json({ error: 'Group exceeds member capacity' });
    res.json({ group: { _id: req.group._id, name: req.group.name, description: req.group.description, creatorId: req.group.creatorId }, members });
}));
router.patch('/:groupId', admin, safe(async (req, res) => {
    const data = valid(details, req.body, res); if (!data) return;
    await Group.updateOne({ _id: req.group._id, deleted: false }, { $set: data }); res.json({ updated: true });
}));
router.post('/:groupId/invite/reset', admin, safe(async (req, res) => {
    const inviteCode = newInvite();
    await Group.updateOne({ _id: req.group._id, deleted: false }, { $set: { inviteHash: hash(inviteCode), inviteCode } });
    res.json({ inviteCode });
}));
router.get('/:groupId/invite', admin, safe(async (req, res) => {
    const group = await Group.findOne({ _id: req.group._id, deleted: false }).select('+inviteCode');
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json({ inviteCode: group.inviteCode });
}));
router.delete('/:groupId', admin, safe(async (req, res) => {
    await Group.updateOne({ _id: req.group._id }, { $set: { deleted: true } });
    await Membership.deleteMany({ groupId: req.group._id }); res.json({ deleted: true });
}));
router.post('/:groupId/leave', safe(async (req, res) => {
    if (String(req.group.creatorId) === String(req.tokenId)) return res.status(403).json({ error: 'The creator must delete the group to leave' });
    await Membership.updateOne({ _id: req.membership._id, status: 'active' }, { $set: { status: 'left' } }); res.json({ left: true });
}));
router.post('/:groupId/members/:userId/:action', admin, safe(async (req, res) => {
    if (!valid(id, req.params.userId, res) || !valid(Joi.string().valid('remove', 'unblock').required(), req.params.action, res)) return;
    if (String(req.group.creatorId) === req.params.userId) return res.status(400).json({ error: 'The creator cannot be removed' });
    const status = req.params.action === 'remove' ? 'blocked' : 'left';
    await Membership.updateOne({ groupId: req.group._id, userId: req.params.userId, status: req.params.action === 'remove' ? 'active' : 'blocked' }, { $set: { status } });
    res.json({ updated: true });
}));
router.get('/:groupId/charts/:sessionId', safe(async (req, res) => {
    if (!valid(id, req.params.sessionId, res)) return;
    const session = await Session.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Election not found' });
    const members = await Membership.find({ groupId: req.group._id, status: 'active' }).limit(1001);
    if (members.length > 1000) return res.status(503).json({ error: 'Group exceeds chart capacity' });
    const bets = await Bet.find({ sessionId: session._id, userId: { $in: members.map(m => m.userId) } })
        .select('_id userId bets score').populate('userId', '_id name').sort({ _id: 1 }).limit(1001);
    if (bets.length > 1000) return res.status(503).json({ error: 'Group exceeds chart capacity' });
    const parties = await Party.find({ sessionId: session._id }).select('_id').limit(121);
    if (parties.length > 120) return res.status(503).json({ error: 'Election exceeds chart capacity' });
    const result = await Result.findOne({ sessionId: session._id });
    res.json({ ...charts(bets, members, session, parties, result), viewerEligible: eligible(req.membership, session) });
}));
module.exports = router;
