const jwt = require('jsonwebtoken');
const User = require('../model/user');

exports.isLoged = (req, res, next) => {
    console.log('req.headers.authorization', req.headers.authorization)
    let jwtoken = req.headers.authorization.replace('Bearer ', '')
    console.log('jwtoken', jwtoken)
    let idFromToken = jwt.decode(jwtoken);
    idFromToken = idFromToken._id
    console.log('idFromToken', idFromToken)
    if(!idFromToken) return res.status(400).json({err: "you need to signin"})
    req.tokenId = idFromToken;
    next();
}

// exports.isAuth = (req, res, next) => {
//     const user = req.body.authorId && req.token && req.body.authorId == req.token;
//     if(!user) return res.status(400).json({err: "you can't continue"})
//     next();
// }

exports.isAdmin = async (req,res,next) => {
    console.log('req.tokenId from is admin', req.tokenId)
    await User.findById(req.tokenId).exec((err, user) => {
        console.log('role', user);
        if (!user || user.role === 0){
            return res.status(403).json({err:"for Admin only"})
        }
        next()

    });
}