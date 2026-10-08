const mongoose = require('mongoose');
const { createApp } = require('./app');
const Bet = require('./model/bets');

async function start({ env = process.env, connect = (...args) => mongoose.connect(...args),
    initialize = () => Bet.init(), create = createApp } = {}) {
    if (typeof env.DATABASE !== 'string' || !/^mongodb(?:\+srv)?:\/\//.test(env.DATABASE) ||
        typeof env.JWT_SECRET !== 'string' || Buffer.byteLength(env.JWT_SECRET) < 32) {
        throw new Error('DATABASE and a JWT_SECRET of at least 32 bytes are required');
    }
    const port = env.PORT === undefined ? 4000 : Number(env.PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
    try {
        await connect(env.DATABASE, {
            useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false,
            useCreateIndex: true, serverSelectionTimeoutMS: 10000
        });
        await initialize();
        const app = create();
        const server = await new Promise((resolve, reject) => {
            const listener = app.listen(port, () => resolve(listener));
            listener.once('error', reject);
        });
        server.requestTimeout = 15000;
        server.headersTimeout = 10000;
        return server;
    } catch (error) {
        await mongoose.disconnect().catch(() => {});
        throw new Error('Server startup failed');
    }
}
if (require.main === module) {
    require('dotenv').config();
    start().then(() => console.info('Server ready')).catch(() => {
        console.error('Server startup failed; check configuration, database and indexes');
        process.exitCode = 1;
    });
}
module.exports = { start };
