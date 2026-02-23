const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

class CheckoutService {
  async upsertCheckout(checkoutData) {
    try {
      const checkout = await prisma.checkout.upsert({
        where: { checkoutId: checkoutData.checkoutId },
        update: {
          email: checkoutData.email,
          firstName: checkoutData.firstName,
          lastName: checkoutData.lastName,
          recoveryUrl: checkoutData.recoveryUrl,
          cartValue: checkoutData.cartValue,
          currency: checkoutData.currency,
          status: 'pending',
          updatedAt: new Date()
        },
        create: {
          checkoutId: checkoutData.checkoutId,
          email: checkoutData.email,
          firstName: checkoutData.firstName,
          lastName: checkoutData.lastName,
          recoveryUrl: checkoutData.recoveryUrl,
          cartValue: checkoutData.cartValue,
          currency: checkoutData.currency,
          status: 'pending'
        }
      });

      logger.info(`Checkout upserted: ${checkout.checkoutId} for ${checkout.email}`);
      return checkout;
    } catch (error) {
      logger.error('Failed to upsert checkout:', error);
      throw error;
    }
  }

  async markAsAbandoned(checkoutId) {
    try {
      const checkout = await prisma.checkout.update({
        where: { checkoutId },
        data: { status: 'abandoned' }
      });

      logger.info(`Checkout marked as abandoned: ${checkoutId}`);
      return checkout;
    } catch (error) {
      logger.error('Failed to mark checkout as abandoned:', error);
      throw error;
    }
  }

  async markAsConverted(email, orderId = null) {
    try {
      const data = { status: 'converted' };
      if (orderId) {
        data.orderId = orderId;
      }

      const result = await prisma.checkout.updateMany({
        where: {
          email,
          status: 'pending'
        },
        data
      });

      logger.info(`Checkouts marked as converted for ${email}: ${result.count} records (Order: ${orderId})`);
      return result;
    } catch (error) {
      logger.error('Failed to mark checkout as converted:', error);
      throw error;
    }
  }

  async findAbandonedCheckouts(thresholdMinutes) {
    try {
      const thresholdDate = new Date(Date.now() - thresholdMinutes * 60 * 1000);

      const checkouts = await prisma.checkout.findMany({
        where: {
          status: 'pending',
          createdAt: {
            lt: thresholdDate
          }
        }
      });

      logger.info(`Found ${checkouts.length} abandoned checkouts`);
      return checkouts;
    } catch (error) {
      logger.error('Failed to find abandoned checkouts:', error);
      throw error;
    }
  }

  async updateSnovSentAt(checkoutId) {
    try {
      return await prisma.checkout.update({
        where: { checkoutId },
        data: { snovSentAt: new Date() }
      });
    } catch (error) {
      logger.error(`Failed to update snovSentAt for checkout ${checkoutId}:`, error);
      throw error;
    }
  }
}

module.exports = new CheckoutService();
