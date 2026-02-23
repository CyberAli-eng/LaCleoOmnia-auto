const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

class CustomerService {
  async upsertCustomer(customerData) {
    try {
      const customer = await prisma.customer.upsert({
        where: { shopifyCustomerId: customerData.shopifyCustomerId },
        update: {
          email: customerData.email,
          firstName: customerData.firstName,
          lastName: customerData.lastName
        },
        create: {
          shopifyCustomerId: customerData.shopifyCustomerId,
          email: customerData.email,
          firstName: customerData.firstName,
          lastName: customerData.lastName
        }
      });

      logger.info(`Customer upserted: ${customer.shopifyCustomerId} - ${customer.email}`);
      return customer;
    } catch (error) {
      logger.error('Failed to upsert customer:', error);
      throw error;
    }
  }

  async updateSnovSentAt(shopifyCustomerId) {
    try {
      return await prisma.customer.update({
        where: { shopifyCustomerId },
        data: { snovSentAt: new Date() }
      });
    } catch (error) {
      logger.error(`Failed to update snovSentAt for customer ${shopifyCustomerId}:`, error);
      throw error;
    }
  }
}

module.exports = new CustomerService();
