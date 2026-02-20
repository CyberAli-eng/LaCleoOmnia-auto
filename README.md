# lacleoOmnia-auto

Production-grade Shopify to Snov.io automation server using Node.js and PostgreSQL.

## Features
- ✅ Receive Shopify webhooks (checkout, order, customer)
- ✅ Verify Shopify HMAC signatures securely
- ✅ Store data in PostgreSQL using Prisma ORM
- ✅ Detect abandoned carts using cron logic (45-minute threshold)
- ✅ Trigger Snov.io campaigns (Abandoned, Upsell, Welcome) via API
- ✅ Deployable on Render
- ✅ Restart-safe and idempotent

## Tech Stack
- **Node.js**: 18+
- **Database**: PostgreSQL (Prisma ORM)
- **Framework**: Express.js
- **Automation**: node-cron

## Project Structure
```
lacleoOmnia-auto/
├── src/
│   ├── server.js
│   ├── app.js
│   ├── config/
│   │   ├── env.js
│   │   └── prisma.js
│   ├── middleware/
│   │   └── verifyShopifyHmac.js
│   ├── routes/
│   │   └── webhooks.js
│   ├── controllers/
│   │   └── webhookController.js
│   ├── services/
│   │   ├── snovService.js
│   │   ├── checkoutService.js
│   │   └── orderService.js
│   ├── jobs/
│   │   └── abandonedCartJob.js
│   └── utils/
│       └── logger.js
├── prisma/
│   └── schema.prisma
├── package.json
└── README.md
```

## Setup & Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env` and fill in the values.
   ```bash
   cp .env.example .env
   ```

3. **Database Setup**:
   Generate Prisma client:
   ```bash
   npx prisma generate
   ```
   Apply migrations:
   ```bash
   npx prisma migrate dev
   ```

4. **Start Server**:
   ```bash
   npm start
   ```

## Shopify Webhook Setup Guide

After deployment, set up webhooks in your Shopify Admin (Settings > Notifications):

- **Checkout Creation**: `https://your-app.onrender.com/webhook/checkout`
- **Order Creation**: `https://your-app.onrender.com/webhook/order`
- **Customer Creation**: `https://your-app.onrender.com/webhook/customer`

**Format**: JSON
**API Version**: Latest stable

## Render Deployment Instructions

1. **Create Web Service**: Connect your GitHub repository to Render.
2. **Configure Environment**:
   - Set `Node.js` version to `18` or higher.
   - Add all environment variables from `.env.example`.
3. **Database**: Attach a Render PostgreSQL database and provide the `DATABASE_URL`.
4. **Build Command**: `npm install && npx prisma generate`
5. **Start Command**: `npx prisma migrate deploy && npm start`

## Testing Guide

### Abandoned Cart Test
1. Add a product to cart and proceed to checkout.
2. Enter email but do NOT complete the purchase.
3. Wait 45 minutes.
4. Verify that the Snov.io abandoned campaign is triggered.

### Order/Upsell Test
1. Place a successful order.
2. Verify that the Snov.io upsell campaign is triggered.
