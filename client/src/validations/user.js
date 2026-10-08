var Joi = require('joi-browser');

export const signupValid = (user) => {
    const schema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().required().email(),
        password: Joi.string().required().min(6)
    })
    return schema.validate(user);
}

export const signinValid = (user) => {
    const schema = Joi.object({
        nameOrMail: Joi.string().required(),
        password: Joi.string().required().min(6)
    })
    return schema.validate(user);
}

export const validMail = (email) => {
    const schema = Joi.object({
        email: Joi.string().email().required()
    })
    return schema.validate(email);
}

export const validPassword = (password) => {
    const schema = Joi.object({
        password: Joi.string().required().min(6)
    })
    return schema.validate(password);
}

// custome messages
// .error(() => {
//     return {
//       message: 'נא להזין שם תקין',
//     };
//   }),