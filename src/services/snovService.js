const axios = require('axios');
const { config } = require('../config/env');
const { logger } = require('../utils/logger');

class SnovService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.baseUrl = 'https://api.snov.io/v1';
  }

  async getAccessToken() {
    if (config.snov.mock) {
      logger.info('[MOCK] Using mock Snov.io access token');
      return 'mock_access_token';
    }

    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      logger.info('Fetching new Snov.io access token');

      const response = await axios.post(`${this.baseUrl}/oauth/access_token`, {
        grant_type: 'client_credentials',
        client_id: config.snov.clientId,
        client_secret: config.snov.clientSecret
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;

      logger.info('Snov.io access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      logger.error('Failed to get Snov.io access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Snov.io');
    }
  }

  async addProspectToList(email, firstName, lastName, listId, customFields = {}) {
    if (config.snov.mock) {
      logger.info(`[MOCK] Adding prospect to list: ${email} -> List ${listId}`);
      return {
        success: true,
        mock: true,
        data: { email, listId, firstName, lastName, customFields }
      };
    }

    try {
      const token = await this.getAccessToken();

      const payload = {
        listId: parseInt(listId),
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        fullName: `${firstName || ''} ${lastName || ''}`.trim(),
        customFields: customFields
      };

      logger.info(`Adding prospect to Snov.io list: ${email} -> ${listId}`);

      const response = await axios.post(
        `${this.baseUrl}/add-names-to-list`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Prospect added to list successfully: ${email}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to add prospect to Snov.io list:', error.response?.data || error.message);
      throw error;
    }
  }

  async sendAbandonedCartCampaign(checkout) {
    const listId = config.snov.campaigns.abandoned;

    if (!listId) {
      logger.warn('SNOV_CAMPAIGN_ABANDONED (List ID) not configured, skipping');
      return { skipped: true, reason: 'List ID not configured' };
    }

    return await this.addProspectToList(
      checkout.email,
      checkout.firstName,
      checkout.lastName,
      listId,
      {
        recovery_url: checkout.recoveryUrl,
        cart_value: String(checkout.cartValue),
        currency: checkout.currency
      }
    );
  }

  async sendUpsellCampaign(order) {
    const listId = config.snov.campaigns.upsell;

    if (!listId) {
      logger.warn('SNOV_CAMPAIGN_UPSELL (List ID) not configured, skipping');
      return { skipped: true, reason: 'List ID not configured' };
    }

    const checkout = await prisma.checkout.findFirst({
      where: { email: order.email }
    });

    return await this.addProspectToList(
      order.email,
      checkout?.firstName || '',
      checkout?.lastName || '',
      listId,
      {
        order_value: String(order.totalPrice),
        currency: order.currency
      }
    );
  }

  async sendWelcomeCampaign(customer) {
    const listId = config.snov.campaigns.welcome;

    if (!listId) {
      logger.warn('SNOV_CAMPAIGN_WELCOME (List ID) not configured, skipping');
      return { skipped: true, reason: 'List ID not configured' };
    }

    return await this.addProspectToList(
      customer.email,
      customer.firstName,
      customer.lastName,
      listId
    );
  }
}

const prisma = require('../config/prisma');

module.exports = new SnovService();
