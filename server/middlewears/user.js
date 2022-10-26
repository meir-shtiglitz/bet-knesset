const jwt = require('jsonwebtoken');
const User = require('../model/user');

exports.isLoged = (req, res, next) => {
    console.log('req.headers.authorization', req.headers.authorization)
    const idFromToken = jwt.decode(req.headers.authorization)._id;
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
    const user = await User.findById({_id: req.tokenId}).exec();
    console.log('role', user.role);
    if (!user || user.role === 0){
        return res.status(403).json({err:"for Admin only"})
    }
    next()
}