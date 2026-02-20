const express = require('express');
const { config } = require('./config/env');
const { logger } = require('./utils/logger');
const webhookRoutes = require('./routes/webhooks');
const testRoutes = require('./routes/test');

const app = express();

// Middleware to capture raw body for HMAC verification
app.use('/webhook', express.raw({ type: 'application/json' }));

// Regular JSON parsing for other routes
app.use((req, res, next) => {
  if (req.path.startsWith('/webhook')) {
    if (req.body instanceof Buffer) {
      req.rawBody = req.body;
      try {
        req.body = JSON.parse(req.body.toString('utf8'));
      } catch (err) {
        return res.status(400).json({ error: 'Invalid JSON' });
      }
    }
    next();
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
