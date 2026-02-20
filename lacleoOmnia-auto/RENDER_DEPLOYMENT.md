# Render Deployment Guide

## Prerequisites

- GitHub account with repository
- Render account (free tier works)
- Shopify store admin access
- Snov.io account with API access

---

## Step-by-Step Deployment

### Part 1: Setup PostgreSQL Database

1. **Login to Render**
   - Go to https://dashboard.render.com
   - Sign in or create account

2. **Create Database**
   - Click "New +" button
   - Select "PostgreSQL"
   - Configure:
     - **Name:** `lacleoomnia-db`
     - **Database:** `lacleoomnia`
     - **User:** (auto-generated)
     - **Region:** Choose closest to your users
     - **Instance Type:** Free (or paid for production)
   - Click "Create Database"

3. **Get Connection String**
   - Wait for database to provision (1-2 minutes)
   - Go to database info page
   - Copy **Internal Database URL**
   - Format: `postgresql://user:pass@host:5432/lacleoomnia`
   - Save this - you'll need it shortly

---

### Part 2: Push Code to GitHub

```bash
# Navigate to project
cd lacleoOmnia-auto

# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - lacleoOmnia-auto"

# Create repository on GitHub
# Then push:
git remote add origin https://github.com/yourusername/lacleoOmnia-auto.git
git branch -M main
git push -u origin main
```

---

### Part 3: Deploy Web Service

1. **Create Web Service**
   - In Render dashboard, click "New +"
   - Select "Web Service"
   - Click "Connect Repository"
   - Authorize GitHub if needed
   - Select your `lacleoOmnia-auto` repository

2. **Configure Service**
   - **Name:** `lacleoomnia-auto` (must be unique)
   - **Region:** Same as database
   - **Branch:** `main`
   - **Root Directory:** (leave blank)
   - **Environment:** `Node`
   - **Build Command:**
     ```
     npm install && npx prisma generate
     ```
   - **Start Command:**
     ```
     npx prisma migrate deploy && npm start
     ```
   - **Instance Type:** Free (or Starter for production)

3. **Add Environment Variables**

   Click "Advanced" → "Add Environment Variable"

   Add each of these:

   ```
   DATABASE_URL
   [paste your Internal Database URL from Part 1]

   PORT
   3000

   SHOPIFY_WEBHOOK_SECRET
   [your actual Shopify webhook secret]

   SHOPIFY_STORE_DOMAIN
   [your-store.myshopify.com]

   SHOPIFY_ACCESS_TOKEN
   [your actual Shopify access token]

   SNOV_CLIENT_ID
   [your Snov.io client ID]

   SNOV_CLIENT_SECRET
   [your Snov.io client secret]

   SNOV_CAMPAIGN_ABANDONED
   [your abandoned cart campaign ID]

   SNOV_CAMPAIGN_UPSELL
   [your upsell campaign ID]

   SNOV_CAMPAIGN_WELCOME
   [your welcome campaign ID]

   MOCK_SNOV
   false
   ```

   **Important:** Use `false` for production, `true` for testing

4. **Deploy**
   - Click "Create Web Service"
   - Render will:
     - Clone your repository
     - Install dependencies
     - Generate Prisma client
     - Run database migrations
     - Start the server
   - Wait 3-5 minutes for first deploy

5. **Verify Deployment**
   - Once status shows "Live"
   - Copy your service URL (e.g., `https://lacleoomnia-auto.onrender.com`)
   - Visit in browser
   - Should see:
     ```json
     {
       "service": "lacleoOmnia-auto",
       "status": "running",
       ...
     }
     ```

---

### Part 4: Configure Shopify Webhooks

1. **Get Webhook Secret**
   - Shopify Admin → Settings → Notifications
   - Scroll to "Webhooks"
   - Copy your webhook signing secret
   - Update in Render env vars if needed

2. **Create Webhooks**

   Using your Render URL (e.g., `https://lacleoomnia-auto.onrender.com`):

   **Webhook 1: Checkout Creation**
   - Event: `Checkout creation`
   - Format: `JSON`
   - URL: `https://lacleoomnia-auto.onrender.com/webhook/checkout`
   - API version: `2024-01` (latest stable)

   **Webhook 2: Order Creation**
   - Event: `Order creation`
   - Format: `JSON`
   - URL: `https://lacleoomnia-auto.onrender.com/webhook/order`
   - API version: `2024-01`

   **Webhook 3: Customer Creation**
   - Event: `Customer creation`
   - Format: `JSON`
   - URL: `https://lacleoomnia-auto.onrender.com/webhook/customer`
   - API version: `2024-01`

3. **Test Webhooks**
   - Use Shopify's "Send test notification" button
   - Check Render logs for incoming webhooks

---

### Part 5: Verify Everything Works

1. **Check Logs**
   - Go to Render service → Logs tab
   - Should see:
     ```
     [INFO] lacleoOmnia-auto server started
     [INFO] Port: 3000
     [INFO] Mock Snov: false
     [INFO] Abandoned cart cron job started successfully
     ```

2. **Test Database Connection**
   - In Render dashboard, go to your PostgreSQL database
   - Click "Connect" → "External Connection"
   - Use connection string with any PostgreSQL client
   - Check tables exist: `Checkout`, `Order`, `Customer`

3. **Test Live Webhook**
   - In Shopify, create a test order
   - Check Render logs for:
     ```
     [INFO] Order webhook received
     [INFO] Order processed successfully
     ```

4. **Verify Snov.io Integration**
   - Create a test customer in Shopify
   - Check Snov.io dashboard
   - New prospect should appear in welcome campaign

---

## Troubleshooting

### Build Fails: "Cannot find module '@prisma/client'"

**Fix:** Ensure build command includes:
```
npm install && npx prisma generate
```

### Start Fails: Database Connection Error

**Fix:**
- Use **Internal Database URL** (not external)
- Format: `postgresql://user:pass@host/dbname`
- Check database is in same region

### Webhooks Return 401

**Fix:**
- Verify `SHOPIFY_WEBHOOK_SECRET` matches Shopify settings
- Check webhook format is JSON
- Ensure API version is stable (not unstable)

### Snov.io API Errors

**Fix:**
- Verify credentials are correct
- Check campaign IDs exist and are active
- Test with `MOCK_SNOV=true` first

### Service Sleeping (Free Tier)

**Issue:** Render free tier sleeps after 15 min inactivity

**Fix:**
- Upgrade to paid plan ($7/month)
- Or use external monitoring service to ping every 10 min

### Cron Not Running

**Check:**
- Logs show "Abandoned cart cron job started"
- Service stays running (check uptime)
- Database query works (check logs every 5 min)

---

## Monitoring & Maintenance

### View Logs

```bash
# Real-time logs
Render Dashboard → Your Service → Logs

# Download logs
Render Dashboard → Logs → Download
```

### Database Management

```bash
# Connect to database
psql [EXTERNAL_DATABASE_URL]

# View tables
\dt

# Query checkouts
SELECT * FROM "Checkout" ORDER BY "createdAt" DESC LIMIT 10;

# Count by status
SELECT status, COUNT(*) FROM "Checkout" GROUP BY status;
```

### Manual Migration

If you update `schema.prisma`:

```bash
# Locally
npx prisma migrate dev --name your_migration_name

# Push to GitHub
git add .
git commit -m "Database migration: your_migration_name"
git push

# Render will auto-deploy and run migrations
```

---

## Security Best Practices

1. **Never commit `.env` file**
   - Already in `.gitignore`
   - Use Render environment variables

2. **Use Internal Database URL**
   - Faster and more secure
   - Not exposed to internet

3. **Rotate Secrets Regularly**
   - Shopify webhook secret
   - Snov.io API credentials
   - Update in Render env vars

4. **Monitor Logs**
   - Set up log alerts in Render
   - Watch for unusual activity

5. **Backup Database**
   - Render Pro plans include automatic backups
   - Or manually backup:
     ```bash
     pg_dump [DATABASE_URL] > backup.sql
     ```

---

## Scaling Considerations

### High Traffic

- Upgrade to Render Standard plan
- Scale database (increase RAM/CPU)
- Consider Redis for caching

### Multiple Stores

- Add `storeId` field to models
- Support multiple webhook secrets
- Separate campaigns per store

### Advanced Features

- Add job queue (Bull/BullMQ with Redis)
- Implement retry logic
- Add analytics dashboard
- A/B test campaigns

---

## Cost Estimate

**Free Tier:**
- PostgreSQL: Free (1GB storage)
- Web Service: Free (512MB RAM, sleeps after 15min)
- Total: $0/month

**Production (Recommended):**
- PostgreSQL: $7/month (256MB RAM)
- Web Service: $7/month (512MB RAM, always on)
- Total: $14/month

**High Traffic:**
- PostgreSQL: $20/month (1GB RAM)
- Web Service: $25/month (2GB RAM)
- Total: $45/month

---

## Support

For deployment issues:

1. Check Render logs
2. Verify environment variables
3. Test locally first
4. Review this guide
5. Contact Render support (support@render.com)

---

**Deployment Complete! 🚀**
