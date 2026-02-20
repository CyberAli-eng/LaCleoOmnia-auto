const express = require('express');
const { config } = require('./config/env');
const { logger } = require('./utils/logger');
const webhookRoutes = require('./routes/webhooks');
const testRoutes = require('./routes/test');

const app = express();

app.use((req, res, next) => {
  if (req.path.startsWith('/webhook/')) {
    express.raw({ type: 'application/json' })(req, res, (err) => {
      if (err) return next(err);
      req.rawBody = req.body;
      req.body = JSON.parse(req.body.toString('utf8'));
      next();
    });
  } else {
    express.json()(req, res, next);
  }
});

app.get('/', (req, res) => {
  res.json({
    service: 'lacleoOmnia-auto',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      webhooks: [
        'POST /webhook/checkout',
        'POST /webhook/order',
        'POST /webhook/customer'
      ],
      test: [
        'POST /test/checkout',
        'POST /test/order',
        'POST /test/customer',
        'GET /test/checkouts',
        'GET /test/orders',
        'GET /test/customers',
        'DELETE /test/reset'
      ]
    }
  });
});

app.use('/webhook', webhookRoutes);
app.use('/test', testRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
