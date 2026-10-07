const express = require('express')
const { ObjectId } = require('mongoose').Types;
const router = express.Router();
const {isLoged, isAdmin} = require('../middlewears/user');
const slugify = require("slugify")
const moment = require('moment')
const Bet = require('../model/bets');
const Session = require('../model/sessions');
const Party = require('../model/parties');
const Result = require('../model/results');

// router.post('/category/add', requireSignin, isAdmin, create)
router.post('/add', isLoged, async (req, res) => {
    const userId = req.tokenId
    const {bets, sessionId} = req.body;
    const session = await Session.findById(sessionId)
    if(!session) return res.status(400).send('שגיאה במערכת ההימורים')
    if(!userId) return res.status(400).send('עליך להרשם קודם על מנת להמר')

    const isPassedVoted = moment(new Date(session.endDate)) < new Date()
    if(isPassedVoted) return res.status(400).send("Voted is over please wait for the naxt time")
    try {
        const isUpdatBet = await Bet.findOne({userId, sessionId})
        const betsToInsert = []
        Object.keys(bets).map(p => betsToInsert.push({_id: new ObjectId(), partyId: p, predictedSeats: bets[p]}))
        if(isUpdatBet){
            const updateBet = await Bet.findOneAndUpdate({userId, sessionId},{bets: betsToInsert},{new: true}).exec()
            res.status(200).json(updateBet)
        } else{
            const bet = await new Bet({userId, bets: betsToInsert, sessionId}).save();
            res.status(200).json(bet)
        }
    } catch (error) {
        res.status(400).send("Create bet failed: "+error)
    }
})

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