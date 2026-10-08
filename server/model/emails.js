const nodemailer = require('nodemailer');
let transporter;
let active = 0;
const queue = [];
function transport() {
    if (!transporter) {
        if (!process.env.USER_MAIL || !process.env.PASS_MAIL) throw new Error('Mail is not configured');
        transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com', port: 465, secure: true,
            auth: { user: process.env.USER_MAIL, pass: process.env.PASS_MAIL },
            tls: { rejectUnauthorized: true },
            connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000
        });
    }
    return transporter;
}
exports.sendMail = async (to, subject, text) => {
    const sender = transport();
    if (active >= 2) {
        if (queue.length >= 20) throw new Error('Mail service busy');
        await new Promise(resolve => queue.push(resolve));
    } else active++;
    try {
        return await sender.sendMail({ from: `Bet Knesset <${process.env.USER_MAIL}>`, to, subject, text });
    } finally {
        const next = queue.shift();
        if (next) next();
        else active--;
    }
};
