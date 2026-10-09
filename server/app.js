const express = require('express');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
function createApp({ buildPath = path.join(__dirname, 'build'),
    basePath = process.env.APP_BASE_PATH || '/bet' } = {}) {
    const app = express();
    app.disable('x-powered-by');
    // Passenger may preserve or strip the application's URL prefix.
    // Normalize preserved prefixes once; root-relative requests still work.
    const prefix = basePath.replace(/\/$/, '');
    if (prefix && !/^\/(?:[a-zA-Z0-9_-]+\/?)+$/.test(prefix))
        throw new Error('Invalid APP_BASE_PATH');
    app.use((req, res, next) => {
        if (prefix && (req.url === prefix || req.url.startsWith(prefix + '/') || req.url.startsWith(prefix + '?'))) {
            req.url = req.url.slice(prefix.length) || '/';
            if (req.url.startsWith('?')) req.url = '/' + req.url;
        }
        next();
    });
    app.use((req, res, next) => {
        req.requestId = crypto.randomBytes(12).toString('hex');
        res.set('X-Request-Id', req.requestId);
        next();
    });
    app.use(express.json({ limit: '32kb' }));
    app.use(cors());
    app.use('/api', require('./routes/user'));
    app.use('/api/bets', require('./routes/bets-route'));
    app.use('/api/groups', require('./routes/groups'));
    app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));
    app.use(express.static(buildPath));
    app.get('*', (req, res) => {
        if (req.path.startsWith('/static/') || ['/manifest.json', '/favicon.ico', '/logo192.png', '/logo512.png'].includes(req.path))
            return res.status(404).type('text').send('Asset not found');
        res.sendFile(path.join(buildPath, 'index.html'));
    });
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
