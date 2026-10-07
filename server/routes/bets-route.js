const express = require('express')
const router = express.Router();
const {isLoged, isAdmin} = require('../middlewears/user');
const slugify = require("slugify")
const moment = require('moment')
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

router.get('/get/:slug', async(req, res) => {
    const slugSession = req.params.slug;

    // 1. Get session
    let session;
    const allSessions = await Session.find();
    session = allSessions.find(s => s.slug === slugSession)
    if(!session){
        //return last session
        session = allSessions.sort((a, b) => b.endDate - a.endDate)[0]
    }
    const sessionId = session._id
    // 2. Get related parties
    const parties = await Party.find({ sessionId });

    // 3. Get related bets with user info (optional)
    const bets = await Bet.find({ sessionId }).populate('userId', '_id name');

    // 4. Get result (assuming only one per session)
    const result = await Result.findOne({ sessionId });

    // Combine into one object
    const sessionData = {
        allSessions,
        session,
        parties,
        bets,
        result
    };


    res.status(200).json(sessionData);
})

router.get('/calculate',isLoged,isAdmin, async(req, res) => {
    await Bet.find({}).exec((error, result) => {
        result.forEach(b => {
            const score = getScore(b.bets, b.createdAt)
            b.place = score
            b.save()
        });
        res.send(result)
    })

    const finalResult = {
        '1': 32,//ליכוד
        '2': 24,//לפיד
        '3': 12,//גנץ
        '4': 14,//צד
        '5': 11,//שס
        '6': 7,//ג
        '7': 4,//עבודה
        '8': 6,//ליברמן
        '9': 0,//מרצ
        '10': 5,//רעמ
        '11': 0,//בלד
        '12': 0,//שקד
        '13': 5,//חדש
        '14': 0,//קארה
        '15': 0,//אבידר
        '16': 0,//זליכה
        '17': 0,//מוכתר
        '18': 0,//עלה ירוק
    }

    const getScore = (bets, createdAt) => {
        let score = 1000
        for (const p in finalResult) {
            const p_final = finalResult[p]
            const u_bet = bets[p] || 0
            if(p_final === u_bet) {
                score += 0.5
            } else{
                let toScore = Math.abs(p_final - u_bet)
                if(!p_final || !u_bet) toScore -= 2.5
                score -= toScore
            }
        }
        const diffTime = moment().diff(moment(createdAt), 'millisecond')
        score +=Number(`0.00${diffTime}`)
        return score
    }
})

// router.get('/category/:slug', read)
router.put('/category/update/:slug', isLoged, isAdmin, (req, res)=> {
    Category.findOne({slug: req.params.slug}, (err, cat) => {
        cat.name = req.body.name;
        cat.slug = slugify(req.body.name)
        cat.save();
        return res.status(200).send('done');
    })
})

router.delete('/category/delete/:slug', isLoged, isAdmin, (req, res) => {
    Category.deleteOne({slug: req.params.slug}).exec((response) => {
        res.status(200).send('done');
    });
})



module.exports = router;