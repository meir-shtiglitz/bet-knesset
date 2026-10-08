const assert = require('assert');
const nodemailer = require('nodemailer');
let configuration, concurrent = 0, peak = 0;
const releases = [];
nodemailer.createTransport = config => {
    configuration = config;
    return { sendMail: async message => {
        concurrent++; peak = Math.max(peak, concurrent);
        assert(message.text && !message.html);
        await new Promise(resolve => releases.push(resolve));
        concurrent--;
        return { accepted: [message.to] };
    } };
};
// Load first, configure later: mirrors dotenv startup ordering.
const { sendMail } = require('../model/emails');
(async () => {
    await assert.rejects(sendMail('synthetic@example.com', 'Reset', 'synthetic proof'), /not configured/);
    process.env.USER_MAIL = 'synthetic-sender@example.com'; process.env.PASS_MAIL = 'synthetic-not-real-password';
    const pending = Array.from({ length: 22 }, () => sendMail('synthetic@example.com', 'Reset', 'synthetic proof'));
    await assert.rejects(sendMail('synthetic@example.com', 'Reset', 'synthetic proof'), /busy/);
    assert.equal(peak, 2);
    assert.equal(configuration.tls.rejectUnauthorized, true);
    assert.equal(configuration.secure, true);
    assert.equal(configuration.socketTimeout, 10000);
    assert.equal(configuration.auth.user, process.env.USER_MAIL);
    while (releases.length) { releases.shift()(); await new Promise(resolve => setImmediate(resolve)); }
    await Promise.all(pending);
    assert.equal(concurrent, 0);
    console.log('PASS: bounded lazy mail transport/TLS configuration (stub transport; no real delivery)');
})().catch(error => { console.error(error); process.exitCode = 1; });
