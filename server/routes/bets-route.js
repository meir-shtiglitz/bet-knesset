const express = require('express')
const router = express.Router();
const {isLoged} = require('../middlewears/user');
const Joi = require('joi');
const Bet = require('../model/bets');
const Session = require('../model/sessions');
const Party = require('../model/parties');
const Result = require('../model/results');

const { validatePrediction, isOpen } = require('../security/predictions');
const { rateLimit } = require('../security/rate-limit');
router.post('/add', rateLimit({ limit: 30 }), isLoged, async (req, res) => {
    const data = validatePrediction(req.body);
    if (!data) return res.status(400).json({ error: 'Invalid prediction. Allocate exactly 120 integer seats.' });
    try {
        const session = await Session.findById(data.sessionId);
        if (!session) return res.status(404).json({ error: 'Election not found' });
        if (!isOpen(session)) return res.status(403).json({ error: 'Election is closed for predictions' });
        const parties = await Party.find({ sessionId: data.sessionId }).select('_id');
        const allowed = new Set(parties.map(party => String(party._id)));
        if (Object.keys(data.bets).some(id => !allowed.has(id))) return res.status(400).json({ error: 'Party does not belong to this election' });
        // Fail closed until the compound unique index has been built successfully.
        await Bet.init();
        // Re-read after potentially slow index/party work; cutoff is checked at
        // write admission. Database completion may occur after the cutoff.
        if (!isOpen(await Session.findById(data.sessionId))) return res.status(403).json({ error: 'Election is closed for predictions' });
        const filter = { userId: req.tokenId, sessionId: data.sessionId };
        const update = { $set: { bets: Object.entries(data.bets).map(([partyId, predictedSeats]) => ({ partyId, predictedSeats })) } };
        const options = { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true };
        let bet;
        try {
            bet = await Bet.findOneAndUpdate(filter, update, options);
        } catch (error) {
            if (error.code !== 11000) throw error;
            // A concurrent first insert won the unique-index race. Update only
            // the same user's record, without another insert attempt.
            if (!isOpen(await Session.findById(data.sessionId))) return res.status(403).json({ error: 'Election is closed for predictions' });
            bet = await Bet.findOneAndUpdate(filter, update, { ...options, upsert: false });
            if (!bet) return res.status(409).json({ error: 'Prediction changed. Please retry.' });
        }
        const result = bet.toObject();
        result.userId = { _id: req.user._id, name: req.user.name };
        res.json(result);
    } catch (error) {
        res.status(503).json({ error: 'Unable to save prediction' });
    }
});

// Keep full-response charts correct: fail rather than silently truncating data.
// Pagination/aggregate endpoints remain SEC-07/11 follow-up for larger elections.
const readSchema = Joi.object({ slug: Joi.string().min(1).max(100).pattern(/^[\p{L}\p{N}_-]+$/u).required() });
router.get('/get/:slug', rateLimit({ limit: 60 }), async (req, res, next) => {
    if (readSchema.validate(req.params, { convert: false }).error || Object.keys(req.query).length) {
        return res.status(400).json({ error: 'Invalid election request' });
    }
    try {
        const allSessions = await Session.find().select('_id slug name description startDate endDate isClosed').sort({ endDate: -1 }).limit(101);
        if (allSessions.length > 100) return res.status(503).json({ error: 'Election list exceeds response capacity' });
        if (!allSessions.length) return res.status(404).json({ error: 'No elections available' });
        // Unknown slugs explicitly fail; home uses "latest" for latest election.
        const session = req.params.slug === 'latest' ? allSessions[0] : allSessions.find(s => s.slug === req.params.slug);
        if (!session) return res.status(404).json({ error: 'Election not found' });
        const parties = await Party.find({ sessionId: session._id }).select('_id sessionId name chars subtext').limit(121);
        const bets = await Bet.find({ sessionId: session._id }).select('_id userId sessionId bets score place createdAt updatedAt').sort({ _id: 1 }).limit(1001).populate('userId', '_id name');
        if (parties.length > 120 || bets.length > 1000) return res.status(503).json({ error: 'Election data exceeds response capacity' });
        const result = await Result.findOne({ sessionId: session._id }).select('_id sessionId results publishedAt');
        res.json({ allSessions, session, parties, bets, result });
    } catch (error) { next(error); }
});

// Retired unsafe legacy mutation: scoring must be rebuilt as a session-scoped POST.
router.get('/calculate', (req, res) => res.status(405).json({ error: 'Legacy scoring is disabled' }));
module.exports = router;
