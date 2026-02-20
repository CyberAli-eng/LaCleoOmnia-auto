# lacleoOmnia-auto

Production-grade **Shopify → Snov.io** automation server built with Node.js and PostgreSQL.

## 🎯 What It Does

Automatically captures Shopify events and triggers email campaigns via Snov.io:

1. **Checkout Creation** → Store in database, detect abandoned carts
2. **Order Creation** → Mark checkout as converted, trigger upsell campaign
3. **Customer Creation** → Trigger welcome campaign
4. **Abandoned Cart Detection** → Automated cron job (45 min threshold)

## 📋 Features

- ✅ Secure HMAC verification for all Shopify webhooks
- ✅ PostgreSQL database with Prisma ORM
- ✅ Restart-safe cron job for abandoned cart detection
- ✅ Idempotent operations (no duplicate records)
- ✅ Mock mode for Snov.io during development
- ✅ Test endpoints for local development
- ✅ Production-ready for Render deployment

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Shopify store with admin access
- Snov.io account

### Installation

```bash
# Clone or download the project
cd lacleoOmnia-auto

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### Environment Variables

Edit `.env` file:

```env
PORT=3000

DATABASE_URL=postgresql://user:password@host:5432/lacleoomnia?schema=public

SHOPIFY_WEBHOOK_SECRET=your_shopify_webhook_secret_here
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_shopify_access_token_here

SNOV_CLIENT_ID=your_snov_client_id_here
SNOV_CLIENT_SECRET=your_snov_client_secret_here

SNOV_CAMPAIGN_ABANDONED=campaign_id_for_abandoned_cart
SNOV_CAMPAIGN_UPSELL=campaign_id_for_upsell
SNOV_CAMPAIGN_WELCOME=campaign_id_for_welcome

MOCK_SNOV=true
```

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (For production on Render)
npx prisma migrate deploy
```

### Start Server

```bash
# Development
npm run dev

# Production
npm start
```

Server will start on `http://localhost:3000`

---

## 🧪 Testing Guide

### Step 1: Start Server with Mock Mode

Ensure `.env` has:
```
MOCK_SNOV=true
```

This allows testing without real Snov.io API calls.

### Step 2: Test Checkout Creation

```bash
curl -X POST http://localhost:3000/test/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "checkoutId": "test-checkout-001",
    "email": "customer@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "cartValue": 150.00,
    "currency": "USD"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "checkout": {
    "id": 1,
    "checkoutId": "test-checkout-001",
    "email": "customer@example.com",
    "status": "pending",
    ...
  }
}
```

### Step 3: Verify Checkout Storage

```bash
curl http://localhost:3000/test/checkouts
```

You should see your checkout in the database.

### Step 4: Test Order Creation

```bash
curl -X POST http://localhost:3000/test/order \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test-order-001",
    "email": "customer@example.com",
    "totalPrice": 150.00,
    "currency": "USD"
  }'
```

**Expected Result:**
- Order created
- Checkout marked as "converted"
- Mock upsell campaign logged

### Step 5: Test Customer Creation

```bash
curl -X POST http://localhost:3000/test/customer \
  -H "Content-Type: application/json" \
  -d '{
    "shopifyCustomerId": "12345",
    "email": "newcustomer@example.com",
    "firstName": "Jane",
    "lastName": "Smith"
  }'
```

### Step 6: Test Abandoned Cart Detection

1. Create a checkout using test endpoint
2. Modify the checkout's `createdAt` to be 46 minutes ago:

```bash
# Access your database and run:
UPDATE "Checkout" 
SET "createdAt" = NOW() - INTERVAL '46 minutes' 
WHERE "checkoutId" = 'test-checkout-001';
```

3. Wait for the cron job to run (every 5 minutes)
4. Check logs:

```bash
# You should see:
[INFO] Running abandoned cart detection...
[INFO] Found 1 abandoned checkouts
[MOCK] Adding prospect to campaign...
```

5. Verify checkout status changed:

```bash
curl http://localhost:3000/test/checkouts
```

Status should be "abandoned".

### Step 7: Reset Database

```bash
curl -X DELETE http://localhost:3000/test/reset
```

This clears all test data.

---

## 🔐 Shopify Webhook Setup

### Getting Your Webhook Secret

1. Go to Shopify Admin → Settings → Notifications
2. Scroll to "Webhooks"
3. Find "Webhook signing secret" (or generate one)
4. Copy to `.env` as `SHOPIFY_WEBHOOK_SECRET`

### Creating Webhooks

After deploying to Render, you'll have a URL like:
```
https://lacleoomnia-auto.onrender.com
```

In Shopify Admin:

1. **Settings → Notifications → Webhooks**
2. Click "Create webhook"

#### Webhook 1: Checkout Creation

- **Event:** Checkout creation
- **Format:** JSON
- **URL:** `https://your-app.onrender.com/webhook/checkout`
- **API version:** Latest stable (e.g., 2024-01)

#### Webhook 2: Order Creation

- **Event:** Order creation
- **Format:** JSON
- **URL:** `https://your-app.onrender.com/webhook/order`
- **API version:** Latest stable

#### Webhook 3: Customer Creation

- **Event:** Customer creation
- **Format:** JSON
- **URL:** `https://your-app.onrender.com/webhook/customer`
- **API version:** Latest stable

### Testing Webhooks

Use Shopify's "Send test notification" button to verify webhooks work.

---

## ☁️ Render Deployment

### Step 1: Create PostgreSQL Database

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "PostgreSQL"
3. Name: `lacleoomnia-db`
4. Region: Choose closest to you
5. Click "Create Database"
6. Copy the **Internal Database URL**

### Step 2: Create Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name:** `lacleoomnia-auto`
   - **Environment:** Node
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `npx prisma migrate deploy && npm start`
   - **Instance Type:** Free or Starter

### Step 3: Add Environment Variables

In Render web service settings, add:

```
DATABASE_URL=[paste internal database URL from step 1]

SHOPIFY_WEBHOOK_SECRET=your_actual_secret
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_actual_token

SNOV_CLIENT_ID=your_actual_client_id
SNOV_CLIENT_SECRET=your_actual_client_secret

SNOV_CAMPAIGN_ABANDONED=your_campaign_id
SNOV_CAMPAIGN_UPSELL=your_campaign_id
SNOV_CAMPAIGN_WELCOME=your_campaign_id

MOCK_SNOV=false
```

### Step 4: Deploy

Click "Create Web Service"

Render will:
1. Install dependencies
2. Generate Prisma client
3. Run database migrations
4. Start the server

### Step 5: Verify Deployment

Visit: `https://your-app.onrender.com`

You should see:
```json
{
  "service": "lacleoOmnia-auto",
  "status": "running",
  ...
}
```

### Step 6: Update Shopify Webhooks

Replace all webhook URLs with your Render URL:
```
https://your-app.onrender.com/webhook/checkout
https://your-app.onrender.com/webhook/order
https://your-app.onrender.com/webhook/customer
```

---

## 🎬 Snov.io Setup

### Getting API Credentials

1. Log in to [Snov.io](https://snov.io)
2. Go to **Integrations → API**
3. Create API credentials
4. Copy **Client ID** and **Client Secret**

### Creating Campaigns

1. Go to **Email Drip Campaigns**
2. Create three campaigns:
   - **Abandoned Cart Recovery**
   - **Post-Purchase Upsell**
   - **Welcome Series**
3. Copy each **Campaign ID**
4. Add to `.env`:
```
SNOV_CAMPAIGN_ABANDONED=campaign_id_here
SNOV_CAMPAIGN_UPSELL=campaign_id_here
SNOV_CAMPAIGN_WELCOME=campaign_id_here
```

### Campaign Variables

The system sends these custom fields to Snov.io:

**Abandoned Cart:**
- `recovery_url`
- `cart_value`
- `currency`

**Upsell:**
- `order_value`
- `currency`

Use these in your email templates with Snov.io's variable syntax.

---

## 📊 Monitoring

### Check Logs (Render)

Go to your Render service → Logs tab

Look for:
```
[INFO] lacleoOmnia-auto server started
[INFO] Abandoned cart cron job started successfully
[INFO] Checkout webhook received
[INFO] Prospect added successfully
```

### Database Access

Use Prisma Studio for GUI:

```bash
npx prisma studio
```

Or connect via any PostgreSQL client using your `DATABASE_URL`.

---

## 🔄 Cron Job Details

**Schedule:** Every 5 minutes

**Logic:**
```
Find checkouts where:
  - status = 'pending'
  - createdAt < (now - 45 minutes)

For each:
  1. Mark status as 'abandoned'
  2. Send to Snov.io abandoned campaign
```

**Restart-Safe:** Uses database queries, not in-memory timers.

---

## 🛠️ Troubleshooting

### HMAC Verification Fails

- Ensure `SHOPIFY_WEBHOOK_SECRET` matches Shopify settings
- Check webhook format is JSON (not XML)
- Verify API version is stable

### Snov.io API Errors

- Verify `SNOV_CLIENT_ID` and `SNOV_CLIENT_SECRET`
- Check campaign IDs exist
- Use `MOCK_SNOV=true` to bypass API

### Database Connection Issues

- Verify `DATABASE_URL` format
- Check database is running
- Run `npx prisma migrate deploy`

### Cron Job Not Running

- Check logs for "Abandoned cart cron job started"
- Verify server stays running
- Check Render instance didn't sleep (upgrade plan)

---

## 📁 Project Structure

```
lacleoOmnia-auto/
├── src/
│   ├── server.js              # Entry point
│   ├── app.js                 # Express app
│   ├── config/
│   │   ├── env.js             # Environment config
│   │   └── prisma.js          # Database client
│   ├── middleware/
│   │   └── verifyShopifyHmac.js  # HMAC verification
│   ├── routes/
│   │   ├── webhooks.js        # Production webhook routes
│   │   └── test.js            # Test endpoints
│   ├── controllers/
│   │   └── webhookController.js  # Webhook handlers
│   ├── services/
│   │   ├── snovService.js     # Snov.io integration
│   │   ├── checkoutService.js # Checkout logic
│   │   ├── orderService.js    # Order logic
│   │   └── customerService.js # Customer logic
│   ├── jobs/
│   │   └── abandonedCartJob.js  # Cron job
│   └── utils/
│       └── logger.js          # Logging utility
├── prisma/
│   └── schema.prisma          # Database schema
├── .env.example               # Environment template
├── package.json
└── README.md
```

---

## 🔒 Security

- ✅ HMAC signature verification on all webhooks
- ✅ Environment variables for secrets
- ✅ No hardcoded credentials
- ✅ Timing-safe HMAC comparison
- ✅ Input validation

---

## 🚦 API Endpoints

### Production Webhooks (HMAC Protected)

- `POST /webhook/checkout` - Shopify checkout webhook
- `POST /webhook/order` - Shopify order webhook
- `POST /webhook/customer` - Shopify customer webhook

### Test Endpoints (Development Only)

- `POST /test/checkout` - Create test checkout
- `POST /test/order` - Create test order
- `POST /test/customer` - Create test customer
- `GET /test/checkouts` - List all checkouts
- `GET /test/orders` - List all orders
- `GET /test/customers` - List all customers
- `DELETE /test/reset` - Clear all data

### Health Check

- `GET /` - Service status

---

## 📈 Future Enhancements

The architecture supports adding:

- Redis queue for high-volume stores
- WhatsApp/SMS notifications
- Analytics dashboard
- Multi-store support
- Advanced segmentation
- A/B testing campaigns

---

## 📄 License

ISC

---

## 🆘 Support

For issues or questions:

1. Check logs first
2. Verify environment variables
3. Test with mock mode
4. Review this README

---

**Built with ❤️ for automated e-commerce marketing**
