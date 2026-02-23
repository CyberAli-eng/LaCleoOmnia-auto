const checkoutService = require('../services/checkoutService');
const orderService = require('../services/orderService');
const snovService = require('../services/snovService');
const customerService = require('../services/customerService');
const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

class WebhookController {
  async handleCheckout(req, res) {
    try {
      const webhook = req.body;

      logger.info('Checkout webhook received:', {
        id: webhook.id,
        email: webhook.email
      });

      const checkoutData = {
        checkoutId: String(webhook.id),
        email: webhook.email,
        firstName: webhook.customer?.first_name || webhook.billing_address?.first_name || '',
        lastName: webhook.customer?.last_name || webhook.billing_address?.last_name || '',
        recoveryUrl: webhook.abandoned_checkout_url || '',
        cartValue: parseFloat(webhook.total_price) || 0,
        currency: webhook.currency || 'USD'
      };

      await checkoutService.upsertCheckout(checkoutData);

      logger.info(`Checkout stored successfully: ${checkoutData.checkoutId}`);

      return res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Checkout webhook error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async handleOrder(req, res) {
    try {
      const webhook = req.body;

      logger.info('Order webhook received:', {
        id: webhook.id,
        email: webhook.email
      });

      const orderData = {
        orderId: String(webhook.id),
        email: webhook.email,
        totalPrice: parseFloat(webhook.total_price) || 0,
        currency: webhook.currency || 'USD'
      };

      await orderService.createOrder(orderData);

      await checkoutService.markAsConverted(orderData.email, orderData.orderId);

      logger.info('Triggering upsell campaign');
      try {
        const order = await prisma.order.findUnique({
          where: { orderId: orderData.orderId }
        });

        if (order && !order.snovSentAt) {
          const checkout = await prisma.checkout.findFirst({
            where: { email: orderData.email }
          });

          logger.info(`Processing order ${orderData.orderId}`);
          await snovService.triggerUpsell(orderData.email, checkout?.firstName || '', checkout?.lastName || '');
          await orderService.updateSnovSentAt(orderData.orderId);
          logger.info(`Checkout synced to Snov`);
        } else {
          logger.info(`Upsell campaign already sent for order ${orderData.orderId}, skipping`);
        }
      } catch (snovError) {
        logger.error('Snov upsell campaign failed (non-blocking):', snovError.message);
      }

      logger.info(`Order processed successfully: ${orderData.orderId}`);

      return res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Order webhook error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async handleCustomer(req, res) {
    try {
      const webhook = req.body;

      logger.info('Customer webhook received:', {
        id: webhook.id,
        email: webhook.email
      });

      const customerData = {
        shopifyCustomerId: String(webhook.id),
        email: webhook.email,
        firstName: webhook.first_name || '',
        lastName: webhook.last_name || ''
      };

      await customerService.upsertCustomer(customerData);

      logger.info('Triggering welcome campaign');
      try {
        const customer = await prisma.customer.findUnique({
          where: { shopifyCustomerId: customerData.shopifyCustomerId }
        });

        if (customer && !customer.snovSentAt) {
          logger.info(`Processing customer ${customerData.shopifyCustomerId}`);
          await snovService.triggerWelcome(customerData.email, customerData.firstName, customerData.lastName);
          await customerService.updateSnovSentAt(customerData.shopifyCustomerId);
          logger.info(`Checkout synced to Snov`);
        } else {
          logger.info(`Welcome campaign already sent for customer ${customerData.shopifyCustomerId}, skipping`);
        }
      } catch (snovError) {
        logger.error('Snov welcome campaign failed (non-blocking):', snovError.message);
      }

      logger.info(`Customer processed successfully: ${customerData.shopifyCustomerId}`);

      return res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Customer webhook error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new WebhookController();
