const express = require('express');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
function createApp({ buildPath = path.join(__dirname, 'build') } = {}) {
    const app = express();
    app.disable('x-powered-by');
    app.use((req, res, next) => {
        req.requestId = crypto.randomBytes(12).toString('hex');
        res.set('X-Request-Id', req.requestId);
        next();
    });
    app.use(express.json({ limit: '32kb' }));
    app.use(cors());
    app.use('/api', require('./routes/user'));
    app.use('/api/bets', require('./routes/bets-route'));
    app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));
    app.use(express.static(buildPath));
    app.get('*', (req, res) => res.sendFile(path.join(buildPath, 'index.html')));
    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        console.error(JSON.stringify({ event: 'request_failed', requestId: req.requestId }));
        const status = error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 503;
        res.status(status).json({ error: status === 413 ? 'Request body too large' :
            status === 400 ? 'Invalid JSON body' : 'Unable to complete request' });
    });
    return app;
}
module.exports = { createApp };
