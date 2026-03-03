const cron = require('node-cron');
const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { config } = require('../config/env');
const dneService = require('../services/dneService');

const BATCH_SIZE = 50;

let isRunning = false;

function startDNEMigrationJob() {
    logger.info('Starting DNE migration cron job (runs every 10 minutes)');

    cron.schedule('*/10 * * * *', async () => {
        if (isRunning) {
            logger.info('DNE migration job already running, skipping this iteration');
            return;
        }

        isRunning = true;
        logger.info('DNE SYNC START');

        try {
            // 1. Process Customers (Welcome DNE)
            const unsyncedCustomers = await prisma.customer.findMany({
                where: {
                    email: { not: null, not: '' },
                    dneSyncedAt: null
                },
                take: BATCH_SIZE
            });

            if (unsyncedCustomers.length > 0) {
                const emails = unsyncedCustomers.map(c => c.email);
                logger.info(`DNE MIGRATION → Syncing ${emails.length} Customers to Welcome DNE`);

                const result = await dneService.addToDNEList(config.snov.lists.dneWelcome, emails);
                if (result.success) {
                    const ids = unsyncedCustomers.map(c => c.id);
                    await prisma.customer.updateMany({
                        where: { id: { in: ids } },
                        data: { dneSyncedAt: new Date() }
                    });
                    logger.info(`DNE MIGRATION → Marked ${ids.length} customers as synced`);
                }
            }

            // 2. Process Orders (Upsell DNE)
            const unsyncedOrders = await prisma.order.findMany({
                where: {
                    email: { not: null, not: '' },
                    dneSyncedAt: null
                },
                take: BATCH_SIZE
            });

            if (unsyncedOrders.length > 0) {
                const emails = unsyncedOrders.map(o => o.email);
                logger.info(`DNE MIGRATION → Syncing ${emails.length} Orders to Upsell DNE`);

                const result = await dneService.addToDNEList(config.snov.lists.dneUpsell, emails);
                if (result.success) {
                    const ids = unsyncedOrders.map(o => o.id);
                    await prisma.order.updateMany({
                        where: { id: { in: ids } },
                        data: { dneSyncedAt: new Date() }
                    });
                    logger.info(`DNE MIGRATION → Marked ${ids.length} orders as synced`);
                }
            }

            if (unsyncedCustomers.length === 0 && unsyncedOrders.length === 0) {
                logger.info('No unsynced records left for DNE migration');
            }

            logger.info('DNE SYNC COMPLETE');
        } catch (error) {
            logger.error('DNE migration job error:', error);
        } finally {
            isRunning = false;
        }
    });

    logger.info('DNE migration cron job started successfully');
}

module.exports = { startDNEMigrationJob };
