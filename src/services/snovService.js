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

  async addProspectToCampaign(email, firstName, lastName, campaignId, customFields = {}) {
    if (config.snov.mock) {
      logger.info(`[MOCK] Adding prospect to campaign: ${email} -> Campaign ${campaignId}`);
      return {
        success: true,
        mock: true,
        data: { email, campaignId, firstName, lastName, customFields }
      };
    }

    try {
      const token = await this.getAccessToken();

      const payload = {
        campaign_id: campaignId,
        email,
        first_name: firstName || '',
        last_name: lastName || '',
        ...customFields
      };

      logger.info(`Adding prospect to Snov.io campaign: ${email} -> ${campaignId}`);

      const response = await axios.post(
        `${this.baseUrl}/add-prospect-to-campaign`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Prospect added successfully: ${email}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to add prospect to Snov.io:', error.response?.data || error.message);
      throw error;
    }
  }

  async sendAbandonedCartCampaign(checkout) {
    const campaignId = config.snov.campaigns.abandoned;

    if (!campaignId) {
      logger.warn('SNOV_CAMPAIGN_ABANDONED not configured, skipping');
      return { skipped: true, reason: 'Campaign ID not configured' };
    }

    return await this.addProspectToCampaign(
      checkout.email,
      checkout.firstName,
      checkout.lastName,
      campaignId,
      {
        recovery_url: checkout.recoveryUrl,
        cart_value: checkout.cartValue,
        currency: checkout.currency
      }
    );
  }

  async sendUpsellCampaign(order) {
    const campaignId = config.snov.campaigns.upsell;

    if (!campaignId) {
      logger.warn('SNOV_CAMPAIGN_UPSELL not configured, skipping');
      return { skipped: true, reason: 'Campaign ID not configured' };
    }

    const checkout = await prisma.checkout.findFirst({
      where: { email: order.email }
    });

    return await this.addProspectToCampaign(
      order.email,
      checkout?.firstName || '',
      checkout?.lastName || '',
      campaignId,
      {
        order_value: order.totalPrice,
        currency: order.currency
      }
    );
  }

  async sendWelcomeCampaign(customer) {
    const campaignId = config.snov.campaigns.welcome;

    if (!campaignId) {
      logger.warn('SNOV_CAMPAIGN_WELCOME not configured, skipping');
      return { skipped: true, reason: 'Campaign ID not configured' };
    }

    return await this.addProspectToCampaign(
      customer.email,
      customer.firstName,
      customer.lastName,
      campaignId
    );
  }
}

const prisma = require('../config/prisma');

module.exports = new SnovService();
