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
    const isPassedVoted = moment(new Date('11 01, 2022 06:00:00')).diff(moment(), 'hours') < 0
    console.log('isPassedVoted', isPassedVoted)
    if(isPassedVoted) return res.status(400).send("Voted is over please wait for the naxt time")
    try {
        const isUpdatBet = await Bet.findOne({userId})
        console.log('isUpdatBet', isUpdatBet)
        if(isUpdatBet){
            console.log('isUpdatBet is true')
            const updateBet = Bet.findOneAndUpdate({userId},{bets}).exec()
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
   console.log('bets', bets)
   res.status(200).json(bets);
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