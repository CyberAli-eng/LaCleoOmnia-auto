const prisma = require('../src/config/prisma');
const { config } = require('../src/config/env');
const { logger } = require('../src/utils/logger');
const dneService = require('../src/services/dneService');
const snovService = require('../src/services/snovService');

async function megaSync() {
    logger.info('🚀 Starting MEGA SYNC (Parallel/Batch processing)');

    if (!config.snov.lists.welcome || !config.snov.lists.upsell || !config.snov.lists.abandoned) {
        logger.error('CRITICAL ERROR: Primary Snov list IDs are missing in config!');
        process.exit(1);
    }

    try {
        // Helper to process in parallel with a concurrency limit
        const runConcurrent = async (items, concurrency, task) => {
            const results = [];
            const executing = [];
            for (const item of items) {
                const p = task(item).then(res => {
                    executing.splice(executing.indexOf(p), 1);
                    return res;
                });
                results.push(p);
                executing.push(p);
                if (executing.length >= concurrency) {
                    await Promise.race(executing);
                }
            }
            return Promise.all(results);
        };

        // 1. SYNC CUSTOMERS (Welcome List + Welcome DNE)
        const unsyncedCustomers = await prisma.customer.findMany({
            where: {
                email: { not: null, not: '' },
                OR: [
                    { snovSentAt: null },
                    { dneSyncedAt: null }
                ]
            }
        });

        logger.info(`📋 Processing ${unsyncedCustomers.length} Customers`);

        // Campaign Sync (Individual calls, 5 concurrent)
        const customersToSnov = unsyncedCustomers.filter(c => !c.snovSentAt);
        if (customersToSnov.length > 0) {
            logger.info(`  - Adding ${customersToSnov.length} to Welcome Campaign List`);
            await runConcurrent(customersToSnov, 5, async (c) => {
                const res = await snovService.addToList(config.snov.lists.welcome, c.email, c.firstName, c.lastName);
                if (res.success) {
                    await prisma.customer.update({ where: { id: c.id }, data: { snovSentAt: new Date() } });
                }
            });
        }

        // DNE Sync (Batch)
        const customersToDNE = unsyncedCustomers.filter(c => !c.dneSyncedAt);
        if (customersToDNE.length > 0) {
            logger.info(`  - Adding ${customersToDNE.length} to Welcome DNE List (Batch)`);
            const emails = customersToDNE.map(c => c.email);
            const res = await dneService.addToDNEList(config.snov.lists.dneWelcome, emails);
            if (res.success) {
                await prisma.customer.updateMany({
                    where: { id: { in: customersToDNE.map(c => c.id) } },
                    data: { dneSyncedAt: new Date() }
                });
            }
        }

        // 2. SYNC ORDERS (Upsell List + Upsell DNE)
        const unsyncedOrders = await prisma.order.findMany({
            where: {
                email: { not: null, not: '' },
                OR: [
                    { snovSentAt: null },
                    { dneSyncedAt: null }
                ]
            }
        });

        logger.info(`📋 Processing ${unsyncedOrders.length} Orders`);

        // Campaign Sync (Individual calls, 5 concurrent)
        const ordersToSnov = unsyncedOrders.filter(o => !o.snovSentAt);
        if (ordersToSnov.length > 0) {
            logger.info(`  - Adding ${ordersToSnov.length} to Upsell Campaign List`);
            await runConcurrent(ordersToSnov, 5, async (o) => {
                const res = await snovService.addToList(config.snov.lists.upsell, o.email);
                if (res.success) {
                    await prisma.order.update({ where: { id: o.id }, data: { snovSentAt: new Date() } });
                }
            });
        }

        // DNE Sync (Batch)
        const ordersToDNE = unsyncedOrders.filter(o => !o.dneSyncedAt);
        if (ordersToDNE.length > 0) {
            logger.info(`  - Adding ${ordersToDNE.length} to Upsell DNE List (Batch)`);
            const emails = ordersToDNE.map(o => o.email);
            const res = await dneService.addToDNEList(config.snov.lists.dneUpsell, emails);
            if (res.success) {
                await prisma.order.updateMany({
                    where: { id: { in: ordersToDNE.map(o => o.id) } },
                    data: { dneSyncedAt: new Date() }
                });
            }
        }

        // 3. SYNC CHECKOUTS (Abandoned List)
        const unsyncedCheckouts = await prisma.checkout.findMany({
            where: {
                email: { not: null, not: '' },
                snovSentAt: null,
                status: 'abandoned'
            }
        });

        logger.info(`📋 Processing ${unsyncedCheckouts.length} Abandoned Checkouts`);
        if (unsyncedCheckouts.length > 0) {
            await runConcurrent(unsyncedCheckouts, 5, async (ch) => {
                const res = await snovService.addToList(config.snov.lists.abandoned, ch.email, ch.firstName, ch.lastName);
                if (res.success) {
                    await prisma.checkout.update({ where: { id: ch.id }, data: { snovSentAt: new Date() } });
                }
            });
        }

        logger.info('✅ MEGA SYNC COMPLETE');
        process.exit(0);
    } catch (error) {
        logger.error('❌ MEGA SYNC FAILED:', error);
        process.exit(1);
    }
}

megaSync();
