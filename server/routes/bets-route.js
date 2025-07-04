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
    console.log("req.body",req.body);
    const userId = req.tokenId
    const {bets, sessionId} = req.body;
    console.log('sessionId', sessionId)
    const session = await Session.findById(sessionId)
    if(!session) return res.status(400).send('שגיאה במערכת ההימורים')
    if(!userId) return res.status(400).send('עליך להרשם קודם על מנת להמר')

    console.log("req.token",userId);
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
            console.log(bet);
            res.status(200).json(bet)
        }
    } catch (error) {
        console.log('error', error)
        res.status(400).send("Create bet failed: "+error)
    }
})

router.get('/get/:slug', async(req, res) => {
    const slugSession = req.params.slug;
    console.log('get all bets - slugSession:', slugSession);

    // 1. Get session
    const session = await Session.findOne({slug: slugSession});
    const sessionId = session._id
    console.log('session', session);
    // 2. Get related parties
    const parties = await Party.find({ sessionId });

    // 3. Get related bets with user info (optional)
    const bets = await Bet.find({ sessionId }).populate('userId', '_id name');

    // 4. Get result (assuming only one per session)
    const result = await Result.findOne({ sessionId });

    // Combine into one object
    const sessionData = {
        session,
        parties,
        bets,
        result
    };

    console.log(sessionData);

//    console.log('bets', bets)
    res.status(200).json(sessionData);
})

router.get('/calculate',isLoged,isAdmin, async(req, res) => {
    console.log('calculate')
    await Bet.find({}).exec((error, result) => {
        console.log('result', result.length)
        result.forEach(b => {
            const score = getScore(b.bets, b.createdAt)
            b.place = score
            b.save()
        });
        // console.log('result after', result)
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
            // console.log('p', p, 'p_final', p_final, 'u_bet', u_bet)
            if(p_final === u_bet) {
                // console.log('theSame')
                score += 0.5
            } else{
                let toScore = Math.abs(p_final - u_bet)
                if(!p_final || !u_bet) toScore -= 2.5
                // console.log('toScore', toScore)
                score -= toScore
            }
        }
        const diffTime = moment().diff(moment(createdAt), 'millisecond')
        console.log('diffTime', diffTime, Number(`0.00${diffTime}`), createdAt,moment(createdAt))
        score +=Number(`0.00${diffTime}`)
        console.log('score', score)
        return score
    }
})

// router.get('/category/:slug', read)
router.put('/category/update/:slug', isLoged, isAdmin, (req, res)=> {
    console.log('req.query:', req.query);
    console.log('req.body:', req.body);
    Category.findOne({slug: req.params.slug}, (err, cat) => {
        console.log('cat:', cat);
        cat.name = req.body.name;
        cat.slug = slugify(req.body.name)
        cat.save();
        console.log('cat:', cat);
        return res.status(200).send('done');
    })
})

router.delete('/category/delete/:slug', isLoged, isAdmin, (req, res) => {
    Category.deleteOne({slug: req.params.slug}).exec((response) => {
        res.status(200).send('done');
    });
})



module.exports = router;