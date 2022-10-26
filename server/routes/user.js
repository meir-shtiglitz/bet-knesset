const express = require('express')
const router = express.Router();
const User = require('../model/user');
const jwt = require('jsonwebtoken');
const {signupValid, signinValid} = require('../validation/user');
const { sendMail } = require('../model/emails');

// exports.isLoged = (req, res, next) => {
//     const idFromToken = jwt.decode(req.body.token)._id;
//     console.log('idFromToken',idFromToken)
//     if(!idFromToken) return res.status(400).json({err: "you need to signin"})
//     req.token = idFromToken;
// }

// exports.isAuth = (req, res, next) => {
//     const user = req.body.authorId && req.token && req.body.authorId == req.token;
//     if(!user) return res.status(400).json({err: "you can't continue"})
//     next();
// }

router.post('/user/signup', async(req, res) => {
    // validate fields
    const {error} = signupValid(req.body);
    if(error){
        console.log('error', error.details[0].message)
        return res.status(401).json({error: error.details[0].message});
    }
    // check if email exists
    const check_email = await User.findOne({email: req.body.email});
    if(check_email){
        return res.status(400).json({error: 'email already exists...'});
    }
    // insert user
    const user = new User(req.body);
    user.save();
    const token = jwt.sign({_id:user._id},process.env.JWT_SECRET);
    res.cookie("token",token,{expire: new Date()+9999});
    const {_id, name, email, role} = user;
    return res.json({token, user: {_id, name, email, role}});
})

router.post('/user/signin', async(req, res) => {
    const {error} = signinValid(req.body)
    if (error){
        return res.status(401).json({error: error.details[0].message});
    } 

    User.find({$or:[{name: req.body.nameOrMail}, {email: req.body.nameOrMail}]}, (err,user) => {
        if (err || !user[0] || !user[0].checkPassword(req.body.password)){
            return res.status(400).json({err: "Email or Password don't match"})
        }

        const token = jwt.sign({_id:user[0]._id},process.env.JWT_SECRET);
        res.cookie("token",token,{expire: new Date()+9999});
        const {_id, name, email, role} = user[0];
        return res.json({token, user: {_id, name, email, role}});
    })

})

router.post('/user/signbytoken', async(req, res) => {
    console.log('getr',req.headers);
    const idFromToken = jwt.decode(req.body.token)._id;
    User.findOne({_id: idFromToken}, (err,user) => {
        if (err || !user){
            console.log('not');
            return res.status(400).json({err: "Token don't match to a valid user"})
        }
        
        const token = jwt.sign({_id:user._id},process.env.JWT_SECRET);
        console.log(user);
        res.cookie("token",token,{expire: new Date()+9999});
        const {_id, name, email, role} = user;
        return res.json({token, user: {_id, name, email, role}});
    })

})

router.post('/user/signout', (req,res) => {
    res.clearCookie("token")
    return res.json({message: 'Signout success'})
})

router.post('/user/forgot/validmail', async(req, res) => {
    console.log(req.body);
    const {email, numsValid} = req.body;
    const checkMail = await User.findOne({email: email});
    if(!checkMail){
        return res.status(405).json({error: "this email address is not register yet"})
    }
    sendMail(email, 'valid your email address before reset password', 'put this password to the opened input: ' + numsValid);
    return res.status(200).json({sending: true})
})


router.post('/user/profile/update', async(req, res) => { 
    console.log(req.body);
    const {new_email, name, password, email} = req.body;
    
    if (new_email !== email){
        const checkMail = await User.findOne({email: new_email});
        if(checkMail){
            return res.status(402).json({error: "this email address is already exsits"})
        }
    }
    User.findOne({email: email}, (error, user) => {
        if (error || !user){
            console.log('not');
            return res.status(400).json({err: "Token don't match to a valid user"})
        }

        if(password) user.password = password;
        if(name) user.name = name;
        if(new_email) user.email = new_email;
        user.save();
        
        console.log(user);
        const token = jwt.sign({_id:user._id},process.env.JWT_SECRET);
        res.cookie("token",token,{expire: new Date()+9999});
        const {_id, email, role} = user;
        return res.json({token, user: {_id, name:user.name, email, role}});
    })
})




module.exports = router;
