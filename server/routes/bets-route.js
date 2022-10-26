const express = require('express')
const router = express.Router();
const {isLoged, isAdmin} = require('../middlewears/user');
const Mails = require("../model/listMails");
const slugify = require("slugify")
const moment = require('moment')
const Bet = require('../model/bets');

// router.post('/category/add', requireSignin, isAdmin, create)
router.post('/add', isLoged, async (req, res) => {
    console.log("req.body",req.body);
    console.log("req.token",req.tokenId);
    const isPassedVoted = moment('2022-10-31').diff(moment(), 'hours') < 0
    console.log('isPassedVoted', isPassedVoted)
    if(isPassedVoted) return res.status(400).send("Voted is over please wait for the naxt time")
    try { 
        const {bets} = req.body;
        console.log('bets', bets);
        const bet = await new Bet({userId: req.tokenId, bets}).save();
        console.log(bet);
        res.status(200).json(bet)
    } catch (error) {
        console.log('error', error)
        res.status(400).send("Create bet failed: "+error)
    }
})

router.get('/get', async(req, res) => {
    console.log('DDDDDDDD')
   const bets = await Bet.find({});
   console.log('bets', bets)
   res.status(200).json({bets});
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