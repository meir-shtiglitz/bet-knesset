const express = require('express')
const router = express.Router();
const {isLoged, isAdmin} = require('../middlewears/user');
const Mails = require("../model/listMails");
const slugify = require("slugify")
const moment = require('moment')
const Bet = require('../model/bets');
const bets = require('../model/bets');

// router.post('/category/add', requireSignin, isAdmin, create)
router.post('/add', isLoged, async (req, res) => {
    console.log("req.body",req.body);
    const userId = req.tokenId
    const {bets} = req.body;
    if(!userId) return res.status(400).send('עליך להרשם קודם על מנת להמר')

    console.log("req.token",userId);
    const isPassedVoted = moment(new Date('11 01, 2022 23:59:00')).diff(moment(), 'hours') < 0
    console.log('isPassedVoted', isPassedVoted)
    if(isPassedVoted) return res.status(400).send("Voted is over please wait for the naxt time")
    try {
        const isUpdatBet = await Bet.findOne({userId})
        console.log('isUpdatBet', isUpdatBet)
        if(isUpdatBet){
            console.log('isUpdatBet is true')
            const updateBet = await Bet.findOneAndUpdate({userId},{bets},{new: true}).exec()
            console.log('updateBet555', updateBet)
            res.status(200).json(updateBet)
        } else{
            const bet = await new Bet({userId, bets}).save();
            console.log(bet);
            res.status(200).json(bet)
        }
    } catch (error) {
        console.log('error', error)
        res.status(400).send("Create bet failed: "+error)
    }
})

router.get('/get', async(req, res) => {
    console.log('get all bets')
   const bets = await Bet.find({});
//    console.log('bets', bets)
   res.status(200).json(bets);
})

router.get('/calculate',isLoged,isAdmin, async(req, res) => {
    console.log('calculate')
    await Bet.find({}).exec((error, result) => {
        console.log('result', result.length)
        result.forEach(b => {
            const score = getScore(b.bets, b.updatedAt)
            b.place = score
            b.save()
        });
        console.log('result after', result)
        res.send(result)
    })

    const finalResult = {
        '1': 31,//ליכוד
        '2': 26,//לפיד
        '3': 12,//גנץ
        '4': 14,//צד
        '5': 9,//שס
        '6': 7,//ג
        '7': 6,//עבודה
        '8': 6,//ליברמן
        '9': 5,//מרצ
        '10': 4,//רעמ
        '11': 0,//בלד
        '12': 0,//שקד
        '13': 5,//חדש
        '14': 0,//קארה
        '15': 0,//אבידר
        '16': 0,//זליכה
        '17': 0,//מוכתר
        '18': 0,//עלה ירוק
    }

    const getScore = (bets, updatedAt) => {
        let score = 1000
        for (const p in finalResult) {
            const p_final = finalResult[p]
            const u_bet = bets[p] || 0
            console.log('p', p, 'p_final', p_final, 'u_bet', u_bet)
            if(p_final === u_bet) {
                console.log('theSame')
                score += 0.5
            } else{
                let toScore = Math.abs(p_final - u_bet)
                if(!p_final || !u_bet) toScore -= 2.5
                console.log('toScore', toScore)
                score -= toScore
            }
        }
        const diffTime = moment(updatedAt).diff(moment(), 'millisecond')
        console.log('diffTime', diffTime, updatedAt,moment(updatedAt))
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