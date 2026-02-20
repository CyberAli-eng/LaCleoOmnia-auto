require('dotenv').config();

function validateEnv() {
  const required = [
    'DATABASE_URL',
    'SHOPIFY_WEBHOOK_SECRET',
    'SHOPIFY_STORE_DOMAIN',
    'SNOV_CLIENT_ID',
    'SNOV_CLIENT_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    console.warn('⚠️  Some features may not work correctly.');
  }
}

const config = {
  port: process.env.PORT || 3000,
  
  shopify: {
    webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET,
    storeDomain: process.env.SHOPIFY_STORE_DOMAIN,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN
  },
  
  snov: {
    clientId: process.env.SNOV_CLIENT_ID,
    clientSecret: process.env.SNOV_CLIENT_SECRET,
    campaigns: {
      abandoned: process.env.SNOV_CAMPAIGN_ABANDONED,
      upsell: process.env.SNOV_CAMPAIGN_UPSELL,
      welcome: process.env.SNOV_CAMPAIGN_WELCOME
    },
    mock: process.env.MOCK_SNOV === 'true'
  },
  
  abandonedCart: {
    thresholdMinutes: 45
  }
};

module.exports = { config, validateEnv };
