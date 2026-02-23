const cron = require('node-cron');
const checkoutService = require('../services/checkoutService');
const snovService = require('../services/snovService');
const { config } = require('../config/env');
const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

function startAbandonedCartJob() {
  logger.info('Starting abandoned cart cron job (runs every 5 minutes)');

  cron.schedule('*/5 * * * *', async () => {
    try {
      logger.info('Running abandoned cart detection...');

      const thresholdMinutes = config.abandonedCart.thresholdMinutes;
      const abandonedCheckouts = await checkoutService.findAbandonedCheckouts(thresholdMinutes);

      if (abandonedCheckouts.length === 0) {
        logger.info('No abandoned checkouts found');
        return;
      }

      logger.info(`Processing ${abandonedCheckouts.length} abandoned checkouts`);

      for (const checkout of abandonedCheckouts) {
        try {
          // Fetch latest state to avoid race condition with order webhooks
          const currentCheckout = await prisma.checkout.findUnique({
            where: { checkoutId: checkout.checkoutId }
          });

          if (currentCheckout && currentCheckout.status === 'pending' && !currentCheckout.snovSentAt) {
            await checkoutService.markAsAbandoned(checkout.checkoutId);

            logger.info(`Triggering abandoned cart campaign for: ${checkout.email}`);
            const result = await snovService.triggerAbandoned(checkout.email, checkout.firstName, checkout.lastName, checkout);

            if (result && (result.success !== false)) {
              await checkoutService.updateSnovSentAt(checkout.checkoutId);
              logger.info(`Abandoned cart processed and snovSentAt updated: ${checkout.checkoutId}`);
            }
          } else {
            logger.info(`Checkout ${checkout.checkoutId} already processed, converted, or sent to Snov, skipping`);
          }
        } catch (error) {
          logger.error(`Failed to process abandoned checkout ${checkout.checkoutId}:`, error.message);
        }
      }

      logger.info('Abandoned cart detection completed');
    } catch (error) {
      logger.error('Abandoned cart job error:', error);
    }
  });

  logger.info('Abandoned cart cron job started successfully');
}

module.exports = { startAbandonedCartJob };
