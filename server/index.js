// The legacy MongoDB driver can include credential-bearing URIs in Node
// deprecation warnings. Keep our fixed startup diagnostics instead.
process.noDeprecation = true;
const mongoose = require('mongoose');
const path = require('path');
const { createApp } = require('./app');
const Bet = require('./model/bets');

async function start({ env = process.env, connect = (...args) => mongoose.connect(...args),
    initialize = () => Promise.all([Bet.init(), require('./model/group').init(), require('./model/group-membership').init()]), create = createApp } = {}) {
    if (typeof env.DATABASE !== 'string' || !/^mongodb(?:\+srv)?:\/\//.test(env.DATABASE))
        throw new Error('DATABASE must be a MongoDB connection URI');
    if (typeof env.JWT_SECRET !== 'string' || Buffer.byteLength(env.JWT_SECRET) < 32)
        throw new Error('JWT_SECRET must contain at least 32 bytes');
    const port = env.PORT === undefined ? 4000 : Number(env.PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
    let stage = 'database connection';
    try {
        await connect(env.DATABASE, {
            useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false,
            useCreateIndex: true, serverSelectionTimeoutMS: 10000
        });
        stage = 'database index initialization';
        await initialize();
        stage = 'application initialization';
        const app = create();
        stage = 'HTTP listener';
        const server = await new Promise((resolve, reject) => {
            const listener = app.listen(port, () => resolve(listener));
            listener.once('error', reject);
        });
        server.requestTimeout = 15000;
        server.headersTimeout = 10000;
        return server;
    } catch (error) {
        await mongoose.disconnect().catch(() => {});
        throw new Error(`Server startup failed during ${stage}${stage === 'HTTP listener' && error.code === 'EADDRINUSE' ? ': configured port is already in use' : ''}`);
    }
}
if (require.main === module) {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
    start().then(() => console.info('Server ready')).catch(error => {
        // start() emits only fixed diagnostics, never driver errors or credentials.
        console.error(error.message);
        process.exitCode = 1;
    });
}
module.exports = { start };
