const express = require('express');
const crypto = require('crypto');
const Joi = require('joi');
const User = require('../model/user');
const { signupValid, signinValid } = require('../validation/user');
const { sendMail } = require('../model/emails');
const { isLoged, restoreSession } = require('../middlewears/user');
const { issueToken } = require('../security/tokens');
const router = express.Router();
const safe = handler => async (req, res) => {
    try { await handler(req, res); }
    catch (error) { res.status(error.code === 11000 ? 409 : 503).json({ error: 'Unable to complete request' }); }
};
const response = (user, token = issueToken(user)) => ({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
const password = Joi.string().min(6).max(256);
const email = Joi.string().email().max(100);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const validate = (schema, body, res) => {
    const result = schema.validate(body, { convert: false });
    if (result.error) { res.status(400).json({ error: 'Invalid request fields' }); return null; }
    return result.value;
};
// Bounded per-process recovery budget; shared multi-instance limiting remains SEC-07.
const attempts = new Map();
function recoveryLimit(req, res, next) {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
    const key = req.ip;
    const entry = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
    if (entry.count >= 10 || (!attempts.has(key) && attempts.size >= 10000)) return res.status(429).json({ error: 'Too many recovery attempts. Try again later.' });
    entry.count++;
    attempts.set(key, entry);
    next();
}
router.post('/user/signup', safe(async (req, res) => {
    const { error } = signupValid(req.body);
    if (error) return res.status(400).json({ error: 'Invalid registration fields' });
    if (await User.findOne({ email: req.body.email })) return res.status(409).json({ error: 'Email already exists' });
    const user = new User({ name: req.body.name, email: req.body.email, password: req.body.password });
    await user.save();
    res.json(response(user));
}));
router.post('/user/signin', safe(async (req, res) => {
    const { error } = signinValid(req.body);
    if (error) return res.status(400).json({ error: 'Invalid sign-in fields' });
    const user = await User.findOne({ $or: [{ name: req.body.nameOrMail }, { email: req.body.nameOrMail }] });
    if (!user || user.disabled || !user.checkPassword(req.body.password)) return res.status(401).json({ error: "Email or password don't match" });
    res.json(response(user));
}));
router.post('/user/signbytoken', restoreSession, (req, res) => {
    // Restore state without extending the existing access token lifetime.
    res.json(response(req.user, req.body.token));
});
router.post('/user/signout', isLoged, safe(async (req, res) => {
    await User.updateOne({ _id: req.tokenId }, { $inc: { tokenVersion: 1 } });
    res.clearCookie('token');
    res.json({ message: 'Signed out of all sessions' });
}));
router.post('/user/forgot/validmail', recoveryLimit, safe(async (req, res) => {
    const data = validate(Joi.object({ email: email.required() }).required(), req.body, res);
    if (!data) return;
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const user = await User.findOneAndUpdate({ email: data.email, disabled: { $ne: true },
        $or: [{ resetRequestedAt: { $exists: false } }, { resetRequestedAt: { $lt: new Date(now - 60000) } }]
    }, { $set: { resetTokenHash: hash(token), resetExpiresAt: new Date(+now + 15 * 60 * 1000), resetRequestedAt: now } }, { new: true });
    if (user) setImmediate(() => sendMail(user.email, 'Bet Knesset password reset',
        `Enter this reset code on the password reset page. It expires in 15 minutes:\n${token}`
    ).catch(() => console.error('Password reset mail delivery failed')));
    res.json({ sending: true, message: 'If the account exists, a reset code will be sent.' });
}));
router.post('/user/forgot/reset', recoveryLimit, safe(async (req, res) => {
    const data = validate(Joi.object({ token: Joi.string().pattern(/^[a-f0-9]{64}$/).required(), password: password.required() }).required(), req.body, res);
    if (!data) return;
    const pending = new User();
    pending.password = data.password;
    // Consume proof, replace credentials and revoke sessions in one atomic operation.
    const user = await User.findOneAndUpdate({ resetTokenHash: hash(data.token), resetExpiresAt: { $gt: new Date() }, disabled: { $ne: true } }, {
        $set: { hashPasword: String(pending.hashPasword), salt: pending.salt },
        $unset: { resetTokenHash: '', resetExpiresAt: '' }, $inc: { tokenVersion: 1 }
    }, { new: true, runValidators: true });
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset code' });
    res.json({ message: 'Password changed. Please sign in.' });
}));
router.post('/user/profile/update', isLoged, safe(async (req, res) => {
    const data = validate(Joi.object({ name: Joi.string().trim().min(1).max(50), password, currentPassword: password }).or('name', 'password').required(), req.body, res);
    if (!data) return;
    if (data.password && (!data.currentPassword || !req.user.checkPassword(data.currentPassword))) return res.status(403).json({ error: 'Current password is required' });
    const originalHash = String(req.user.hashPasword);
    const changes = {};
    if (data.name) changes.name = data.name;
    if (data.password) {
        req.user.password = data.password;
        changes.hashPasword = String(req.user.hashPasword);
        changes.salt = req.user.salt;
    }
    const update = { $set: changes };
    if (data.password) { update.$inc = { tokenVersion: 1 }; update.$unset = { resetTokenHash: '', resetExpiresAt: '' }; }
    const user = await User.findOneAndUpdate({ _id: req.tokenId, disabled: { $ne: true }, hashPasword: originalHash, $or: [{ tokenVersion: req.user.tokenVersion || 0 }, ...(req.user.tokenVersion ? [] : [{ tokenVersion: { $exists: false } }])] }, update, { new: true, runValidators: true });
    if (!user) return res.status(409).json({ error: 'Account changed. Please sign in again.' });
    res.json(response(user));
}));
module.exports = router;
