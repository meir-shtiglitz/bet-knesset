const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    auth: {
        user: process.env.USER_MAIL,
        pass: process.env.PASS_MAIL
    },
    tls: {
        rejectUnauthorized: false
      }
});

 const sendMail = (to, subject, text) => {
     console.log(process.env.USER_MAIL);
     console.log(process.env.PASS_MAIL);
     console.log(text);
    var info = transporter.sendMail({
        from: `YOUTUBE<${process.env.USER_MAIL}>`,
        to: to,
        subject: subject,
        html: text
    }).then(result => {
         console.log(result);
    }) 
}

module.exports.sendMail = sendMail;