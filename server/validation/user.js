const Joi = require('joi');

const signupValid = (user) => {
    const schema = Joi.object({
        name: Joi.string().trim().min(1).max(50).required(),
        email: Joi.string().required().email().max(100),
        password: Joi.string().required().min(6).max(256)
    })
    return schema.validate(user, { convert: false });
}

const signinValid = (user) => {
    const schema = Joi.object({
        nameOrMail: Joi.string().max(100).required(),
        password: Joi.string().required().min(6).max(256)
    })
    return schema.validate(user, { convert: false });
}
module.exports.signupValid = signupValid;
module.exports.signinValid = signinValid;