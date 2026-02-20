# 📋 User Action Checklist

This checklist guides you through setting up and deploying **lacleoOmnia-auto** from start to finish.

---

## Phase 1: Local Development Setup ✅

### 1.1 Prerequisites
- [ ] Node.js 18+ installed (`node --version`)
- [ ] PostgreSQL installed and running
- [ ] Git installed

### 1.2 Database Setup
- [ ] PostgreSQL service started
- [ ] Database `lacleoomnia` created
- [ ] Connection string ready

### 1.3 Project Setup
```bash
cd lacleoOmnia-auto
```
- [ ] Run `npm install`
- [ ] Run `npm run prisma:generate`
- [ ] Update `.env` with your local database connection
- [ ] Run `npm run prisma:migrate:dev` (name: `init`)

### 1.4 Start Server
- [ ] Run `npm start`
- [ ] Verify server at http://localhost:3000
- [ ] See log: "lacleoOmnia-auto server started"
- [ ] See log: "Abandoned cart cron job started successfully"

### 1.5 Run Tests
- [ ] In new terminal: `npm test`
- [ ] All tests should pass ✅
- [ ] Review test output

### 1.6 Manual Testing
- [ ] Create test checkout via `/test/checkout`
- [ ] Verify in database or Prisma Studio
- [ ] Test other endpoints per `TESTING.md`

**Status:** Local development working? → Proceed to Phase 2

---

## Phase 2: Shopify Setup 🛍️

### 2.1 Get Shopify Credentials

**Webhook Secret:**
- [ ] Login to Shopify Admin
- [ ] Go to Settings → Notifications
- [ ] Scroll to "Webhooks" section
- [ ] Copy "Webhook signing secret"
- [ ] Save for deployment

**Store Domain:**
- [ ] Note your domain: `your-store.myshopify.com`

**Access Token (if needed):**
- [ ] Go to Apps → Develop apps
- [ ] Create private app or use existing
- [ ] Copy Admin API access token
- [ ] Save for deployment

### 2.2 Prepare for Webhook Setup
- [ ] Note: You'll configure webhooks AFTER Render deployment
- [ ] Keep these URLs ready:
  - `/webhook/checkout`
  - `/webhook/order`
  - `/webhook/customer`

**Status:** Shopify credentials ready? → Proceed to Phase 3

---

## Phase 3: Snov.io Setup 📧

### 3.1 Get API Credentials
- [ ] Login to https://snov.io
- [ ] Go to Integrations → API
- [ ] Create or view API credentials
- [ ] Copy **Client ID**
- [ ] Copy **Client Secret**
- [ ] Save for deployment

### 3.2 Create Email Campaigns
- [ ] Go to Email Drip Campaigns
- [ ] Create campaign: **Abandoned Cart Recovery**
  - [ ] Design email with recovery link
  - [ ] Add variables: `{{recovery_url}}`, `{{cart_value}}`
  - [ ] Copy Campaign ID
- [ ] Create campaign: **Post-Purchase Upsell**
  - [ ] Design upsell email
  - [ ] Add variables: `{{order_value}}`
  - [ ] Copy Campaign ID
- [ ] Create campaign: **Welcome Series**
  - [ ] Design welcome email
  - [ ] Copy Campaign ID

### 3.3 Save Campaign IDs
```
SNOV_CAMPAIGN_ABANDONED = _______
SNOV_CAMPAIGN_UPSELL = _______
SNOV_CAMPAIGN_WELCOME = _______
```

**Status:** Snov.io ready? → Proceed to Phase 4

---

## Phase 4: GitHub Repository 🐙

### 4.1 Create Repository
- [ ] Go to https://github.com
- [ ] Click "New repository"
- [ ] Name: `lacleoOmnia-auto` (or your choice)
- [ ] Make it private (recommended)
- [ ] Don't initialize with README (we have one)
- [ ] Create repository

### 4.2 Push Code
```bash
cd lacleoOmnia-auto
git init
git add .
git commit -m "Initial commit - lacleoOmnia-auto"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/lacleoOmnia-auto.git
git push -u origin main
```

- [ ] Code pushed successfully
- [ ] Verify files on GitHub

**Status:** Code on GitHub? → Proceed to Phase 5

---

## Phase 5: Render Deployment ☁️

### 5.1 Create Render Account
- [ ] Go to https://render.com
- [ ] Sign up or login
- [ ] Verify email

### 5.2 Create PostgreSQL Database
- [ ] Click "New +" → "PostgreSQL"
- [ ] Configure:
  - Name: `lacleoomnia-db`
  - Database: `lacleoomnia`
  - Region: (choose closest)
  - Plan: Free (or paid)
- [ ] Click "Create Database"
- [ ] Wait for provisioning (~2 minutes)
- [ ] Copy **Internal Database URL**
- [ ] Save this URL

**Format:** `postgresql://user:pass@host/lacleoomnia`

### 5.3 Create Web Service
- [ ] Click "New +" → "Web Service"
- [ ] Click "Connect Repository"
- [ ] Authorize GitHub
- [ ] Select `lacleoOmnia-auto` repository
- [ ] Configure:
  - Name: `lacleoomnia-auto` (must be unique)
  - Region: (same as database)
  - Branch: `main`
  - Build Command: `npm install && npx prisma generate`
  - Start Command: `npx prisma migrate deploy && npm start`
  - Plan: Free (or paid)

### 5.4 Add Environment Variables

Click "Advanced" → Add each variable:

```env
DATABASE_URL
[paste Internal Database URL from step 5.2]

PORT
3000

SHOPIFY_WEBHOOK_SECRET
[paste from Phase 2]

SHOPIFY_STORE_DOMAIN
[your-store.myshopify.com]

SHOPIFY_ACCESS_TOKEN
[paste from Phase 2]

SNOV_CLIENT_ID
[paste from Phase 3.1]

SNOV_CLIENT_SECRET
[paste from Phase 3.1]

SNOV_CAMPAIGN_ABANDONED
[paste from Phase 3.2]

SNOV_CAMPAIGN_UPSELL
[paste from Phase 3.2]

SNOV_CAMPAIGN_WELCOME
[paste from Phase 3.2]

MOCK_SNOV
false
```

- [ ] All 11 variables added
- [ ] Double-check for typos

### 5.5 Deploy
- [ ] Click "Create Web Service"
- [ ] Wait for build & deploy (~5 minutes)
- [ ] Check logs for errors
- [ ] Status should show "Live"

### 5.6 Verify Deployment
- [ ] Copy your Render URL: `https://lacleoomnia-auto.onrender.com`
- [ ] Visit in browser
- [ ] Should see:
```json
{
  "service": "lacleoOmnia-auto",
  "status": "running",
  ...
}
```

**Status:** Deployed and running? → Proceed to Phase 6

---

## Phase 6: Shopify Webhook Configuration 🔗

### 6.1 Create Webhooks

Using your Render URL: `https://your-app.onrender.com`

**Webhook 1: Checkout Creation**
- [ ] Shopify Admin → Settings → Notifications
- [ ] Webhooks → Create webhook
- [ ] Event: `Checkout creation`
- [ ] Format: `JSON`
- [ ] URL: `https://your-app.onrender.com/webhook/checkout`
- [ ] API version: Latest stable (e.g., 2024-01)
- [ ] Click "Save"

**Webhook 2: Order Creation**
- [ ] Create webhook
- [ ] Event: `Order creation`
- [ ] Format: `JSON`
- [ ] URL: `https://your-app.onrender.com/webhook/order`
- [ ] API version: Latest stable
- [ ] Click "Save"

**Webhook 3: Customer Creation**
- [ ] Create webhook
- [ ] Event: `Customer creation`
- [ ] Format: `JSON`
- [ ] URL: `https://your-app.onrender.com/webhook/customer`
- [ ] API version: Latest stable
- [ ] Click "Save"

### 6.2 Test Webhooks
- [ ] Use "Send test notification" for each webhook
- [ ] Check Render logs for:
  - "Checkout webhook received"
  - "Order webhook received"
  - "Customer webhook received"
- [ ] All should return 200 OK

**Status:** Webhooks working? → Proceed to Phase 7

---

## Phase 7: End-to-End Testing 🧪

### 7.1 Test Abandoned Cart Flow

**Create abandoned cart:**
- [ ] Go to your Shopify store (as customer)
- [ ] Add product to cart
- [ ] Proceed to checkout
- [ ] Enter email address
- [ ] Leave checkout without completing

**Wait 45+ minutes**
- [ ] Check Render logs after 45 minutes
- [ ] Should see: "Running abandoned cart detection"
- [ ] Should see: "Found 1 abandoned checkouts"
- [ ] Should see Snov.io campaign triggered

**Verify in Snov.io:**
- [ ] Go to Snov.io dashboard
- [ ] Check Abandoned Cart campaign
- [ ] Customer should be added as prospect

### 7.2 Test Order Flow

**Complete a purchase:**
- [ ] Create new cart
- [ ] Complete checkout
- [ ] Place order

**Verify:**
- [ ] Check Render logs
- [ ] Should see: "Order webhook received"
- [ ] Should see: "Triggering upsell campaign"

**Verify in Snov.io:**
- [ ] Check Upsell campaign
- [ ] Customer should be added

### 7.3 Test Customer Creation

**Create new customer:**
- [ ] Have someone create account on your store
- [ ] Or create one manually in Shopify Admin

**Verify:**
- [ ] Check Render logs
- [ ] Should see: "Customer webhook received"
- [ ] Should see: "Triggering welcome campaign"

**Verify in Snov.io:**
- [ ] Check Welcome campaign
- [ ] Customer should be added

**Status:** All flows working? → Proceed to Phase 8

---

## Phase 8: Monitoring & Maintenance 📊

### 8.1 Setup Monitoring
- [ ] Bookmark Render dashboard
- [ ] Check logs daily initially
- [ ] Set up log alerts (Render settings)
- [ ] Monitor database usage

### 8.2 Database Management
- [ ] Access database via Render dashboard
- [ ] Use Prisma Studio locally to view data
- [ ] Check record counts weekly:
  - Checkouts
  - Orders
  - Customers

### 8.3 Snov.io Monitoring
- [ ] Monitor campaign performance
- [ ] Check email open rates
- [ ] Optimize email content
- [ ] A/B test subject lines

### 8.4 Performance Optimization
- [ ] Monitor response times
- [ ] Check abandoned cart detection logs
- [ ] Upgrade Render plan if needed (if sleeping)
- [ ] Scale database if slow queries

**Status:** Monitoring in place? → You're done! 🎉

---

## Phase 9: Optional Enhancements 🚀

### 9.1 Upgrade Infrastructure
- [ ] Consider Render Starter plan ($7/month per service)
- [ ] Benefits: Always-on, no sleep, better performance
- [ ] Upgrade database if > 1GB data

### 9.2 Add Features
- [ ] Custom recovery email templates
- [ ] SMS notifications (Twilio)
- [ ] WhatsApp integration
- [ ] Analytics dashboard
- [ ] Multi-store support

### 9.3 Advanced Configuration
- [ ] Adjust abandoned cart threshold
- [ ] Add more campaigns
- [ ] Implement rate limiting
- [ ] Add Redis for caching

---

## Troubleshooting Checklist 🔧

If something's not working:

### Deployment Issues
- [ ] Check Render build logs
- [ ] Verify all environment variables
- [ ] Ensure DATABASE_URL is Internal URL
- [ ] Check Node.js version (18+)

### Webhook Issues
- [ ] Verify SHOPIFY_WEBHOOK_SECRET matches
- [ ] Check webhook format is JSON
- [ ] Test with Shopify's test notification
- [ ] Review Render logs for errors

### Database Issues
- [ ] Check DATABASE_URL format
- [ ] Verify database is running
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Check for connection errors in logs

### Snov.io Issues
- [ ] Verify API credentials
- [ ] Check campaign IDs are correct
- [ ] Ensure campaigns are active
- [ ] Test with MOCK_SNOV=true first

### Cron Job Issues
- [ ] Check logs for "cron job started"
- [ ] Verify service stays running (not sleeping)
- [ ] Check for database query errors
- [ ] Upgrade to paid plan if using free tier

---

## Success Criteria ✅

Your system is fully operational when:

- ✅ Server is deployed and running on Render
- ✅ Database is created and migrations applied
- ✅ All environment variables configured
- ✅ Shopify webhooks receiving and processing
- ✅ HMAC verification passing
- ✅ Data being stored in database
- ✅ Cron job running every 5 minutes
- ✅ Abandoned carts detected after 45 minutes
- ✅ Snov.io campaigns being triggered
- ✅ Customers receiving emails

---

## Quick Reference

**Documentation:**
- Main guide: `README.md`
- Quick start: `QUICKSTART.md`
- Local setup: `LOCAL_SETUP.md`
- Testing: `TESTING.md`
- Deployment: `RENDER_DEPLOYMENT.md`
- Architecture: `ARCHITECTURE.md`

**Commands:**
```bash
npm start                  # Start server
npm test                   # Run tests
npm run prisma:studio      # View database
npm run prisma:migrate:dev # Create migration
```

**Support URLs:**
- Render Dashboard: https://dashboard.render.com
- Shopify Admin: https://yourstore.myshopify.com/admin
- Snov.io Dashboard: https://app.snov.io

---

## Completion Status

Track your progress:

```
[ ] Phase 1: Local Development Setup
[ ] Phase 2: Shopify Setup
[ ] Phase 3: Snov.io Setup
[ ] Phase 4: GitHub Repository
[ ] Phase 5: Render Deployment
[ ] Phase 6: Shopify Webhooks
[ ] Phase 7: End-to-End Testing
[ ] Phase 8: Monitoring Setup
[ ] Phase 9: Optional Enhancements (optional)

When all phases complete: 🎉 PRODUCTION READY 🎉
```

---

**Need help?** Refer to the comprehensive documentation files included in this project.

**Ready to scale?** See `ARCHITECTURE.md` for scaling considerations.

**Everything working?** Congratulations! Your automation is live! 🚀
