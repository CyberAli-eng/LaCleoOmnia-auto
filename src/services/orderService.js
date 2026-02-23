const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

class OrderService {
  async createOrder(orderData) {
    try {
      const order = await prisma.order.upsert({
        where: { orderId: orderData.orderId },
        update: {
          email: orderData.email,
          totalPrice: orderData.totalPrice,
          currency: orderData.currency
        },
        create: {
          orderId: orderData.orderId,
          email: orderData.email,
          totalPrice: orderData.totalPrice,
          currency: orderData.currency
        }
      });

      logger.info(`Order created/updated: ${order.orderId} for ${order.email}`);
      return order;
    } catch (error) {
      logger.error('Failed to create order:', error);
      throw error;
    }
  }

  async updateSnovSentAt(orderId) {
    try {
      return await prisma.order.update({
        where: { orderId },
        data: { snovSentAt: new Date() }
      });
    } catch (error) {
      logger.error(`Failed to update snovSentAt for order ${orderId}:`, error);
      throw error;
    }
  }
}

module.exports = new OrderService();
