const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'gmail', host: 'smtp.gmail.com',
    auth: { user: process.env.USER_MAIL, pass: process.env.PASS_MAIL }
});
exports.sendMail = (to, subject, text) => transporter.sendMail({
    from: `Bet Knesset <${process.env.USER_MAIL}>`, to, subject, text
});
