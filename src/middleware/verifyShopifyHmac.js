const crypto = require('crypto');
const { config } = require('../config/env');
const { logger } = require('../utils/logger');

function verifyShopifyHmac(req, res, next) {
  try {
    const hmacHeader = req.get('x-shopify-hmac-sha256');
    
    if (!hmacHeader) {
      logger.warn('Missing HMAC header');
      return res.status(401).json({ error: 'Missing HMAC signature' });
    }

    if (!config.shopify.webhookSecret) {
      logger.error('SHOPIFY_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const body = req.rawBody;
    
    const hash = crypto
      .createHmac('sha256', config.shopify.webhookSecret)
      .update(body, 'utf8')
      .digest('base64');

    const hmacBuffer = Buffer.from(hmacHeader);
    const hashBuffer = Buffer.from(hash);

    if (hmacBuffer.length !== hashBuffer.length) {
      logger.warn('HMAC verification failed: length mismatch');
      return res.status(401).json({ error: 'Invalid HMAC signature' });
    }

    const isValid = crypto.timingSafeEqual(hmacBuffer, hashBuffer);

    if (!isValid) {
      logger.warn('HMAC verification failed');
      return res.status(401).json({ error: 'Invalid HMAC signature' });
    }

    logger.info('HMAC verified successfully');
    next();
  } catch (error) {
    logger.error('HMAC verification error:', error);
    return res.status(500).json({ error: 'HMAC verification failed' });
  }
}

module.exports = verifyShopifyHmac;
