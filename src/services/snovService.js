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

  async addToList(listId, email, firstName, lastName, customFields = {}) {
    if (config.snov.mock) {
      logger.info(`[MOCK] Adding prospect to Snov list ${listId} for ${email}`);
      return {
        success: true,
        mock: true,
        data: { email, listId, firstName, lastName, customFields }
      };
    }

    try {
      const token = await this.getAccessToken();

      const payload = {
        listId: Number(listId),
        email: email,
        firstName: firstName || '',
        lastName: lastName || '',
        fullName: `${firstName || ''} ${lastName || ''}`.trim(),
        customFields: customFields
      };

      logger.info(`Adding prospect to Snov list ${listId} for ${email}`);

      const response = await axios.post(
        'https://api.snov.io/v1/add-names-to-list',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Prospect added successfully');
      return response.data;
    } catch (error) {
      logger.error('Snov API error', error.response?.data || error.message);
      // Do NOT crash main workflow, return error structure
      return { success: false, error: error.response?.data || error.message };
    }
  }

  async triggerAbandoned(email, firstName, lastName, checkoutData = {}) {
    const listId = config.snov.lists.abandoned;

    if (!listId || listId === 'xxxxx') {
      logger.warn('SNOV_LIST_ABANDONED not configured, skipping');
      return { skipped: true, reason: 'List ID not configured' };
    }

    return await this.addToList(
      listId,
      email,
      firstName,
      lastName,
      {
        recovery_url: checkoutData.recoveryUrl,
        cart_value: String(checkoutData.cartValue),
        currency: checkoutData.currency
      }
    );
  }

  async triggerUpsell(email, firstName, lastName, orderData = {}) {
    const listId = config.snov.lists.upsell;

    if (!listId || listId === 'xxxxx') {
      logger.warn('SNOV_LIST_UPSELL not configured, skipping');
      return { skipped: true, reason: 'List ID not configured' };
    }

    return await this.addToList(
      listId,
      email,
      firstName,
      lastName,
      {
        order_value: String(orderData.totalPrice),
        currency: orderData.currency
      }
    );
  }

  async triggerWelcome(email, firstName, lastName) {
    const listId = config.snov.lists.welcome;

    if (!listId || listId === 'xxxxx') {
      logger.warn('SNOV_LIST_WELCOME not configured, skipping');
      return { skipped: true, reason: 'List ID not configured' };
    }

    return await this.addToList(
      listId,
      email,
      firstName,
      lastName
    );
  }
}

const prisma = require('../config/prisma');

module.exports = new SnovService();
