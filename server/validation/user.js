const Joi = require('joi');

const signupValid = (user) => {
    console.log('user',user);
    const schema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().required().email(),
        password: Joi.string().required().min(6)
    })
    return schema.validate(user);
}

const signinValid = (user) => {
    console.log('user',user);
    const schema = Joi.object({
        nameOrMail: Joi.string().required(),
        password: Joi.string().required().min(6)
    })
    return schema.validate(user);
}
module.exports.signupValid = signupValid;
module.exports.signinValid = signinValid;