const prisma = require('../src/config/prisma');
const { config } = require('../src/config/env');
const { logger } = require('../src/utils/logger');
const dneService = require('../src/services/dneService');

async function manualDNEPush() {
    logger.info('Starting MANUAL DNE PUSH for current data');

    if (!config.snov.lists.dneWelcome || !config.snov.lists.dneUpsell) {
        logger.error('CRITICAL ERROR: SNOV_DNE_WELCOME or SNOV_DNE_UPSELL environment variables are missing!');
        logger.error(`Current config: Welcome DNE=${config.snov.lists.dneWelcome}, Upsell DNE=${config.snov.lists.dneUpsell}`);
        logger.error('Please add these to your Render environment variables or .env file.');
        process.exit(1);
    }

    logger.info(`Config active: Welcome DNE List ID=${config.snov.lists.dneWelcome}`);
    logger.info(`Config active: Upsell DNE List ID=${config.snov.lists.dneUpsell}`);

    try {
        // 1. Process Customers (Welcome DNE)
        const unsyncedCustomers = await prisma.customer.findMany({
            where: {
                email: { not: null },
                dneSyncedAt: null
            }
        });

        logger.info(`Found ${unsyncedCustomers.length} unsynced Customers`);
        let custCount = 0;
        for (const customer of unsyncedCustomers) {
            custCount++;
            if (!customer.email || customer.email.trim() === '') {
                logger.warn(`Skipping Customer ${custCount}/${unsyncedCustomers.length}: No email found for Shopify ID ${customer.shopifyCustomerId}`);
                // Still mark as synced so we don't keep picking it up
                await prisma.customer.update({
                    where: { id: customer.id },
                    data: { dneSyncedAt: new Date() }
                });
                continue;
            }

            logger.info(`Processing Customer ${custCount}/${unsyncedCustomers.length}: ${customer.email}`);
            const result = await dneService.addToDNEList(config.snov.lists.dneWelcome, customer.email);

            if (result.success) {
                await prisma.customer.update({
                    where: { id: customer.id },
                    data: { dneSyncedAt: new Date() }
                });
            } else if (result.error === 'rate_limit' || (result.message && result.message.includes('rate is limited'))) {
                logger.error('RATE LIMITED. Stopping manual push. Please try again in 5 minutes.');
                process.exit(1);
            } else {
                logger.warn(`Failed to sync customer ${customer.email}: ${result.message || JSON.stringify(result)}`);
            }
        }

        // 2. Process Orders (Upsell DNE)
        const unsyncedOrders = await prisma.order.findMany({
            where: {
                email: { not: null },
                dneSyncedAt: null
            }
        });

        logger.info(`Found ${unsyncedOrders.length} unsynced Orders`);
        let orderCount = 0;
        for (const order of unsyncedOrders) {
            orderCount++;
            if (!order.email || order.email.trim() === '') {
                logger.warn(`Skipping Order ${orderCount}/${unsyncedOrders.length}: No email found for Order ID ${order.orderId}`);
                // Still mark as synced
                await prisma.order.update({
                    where: { id: order.id },
                    data: { dneSyncedAt: new Date() }
                });
                continue;
            }

            logger.info(`Processing Order ${orderCount}/${unsyncedOrders.length}: ${order.email}`);
            const result = await dneService.addToDNEList(config.snov.lists.dneUpsell, order.email);

            if (result.success) {
                await prisma.order.update({
                    where: { id: order.id },
                    data: { dneSyncedAt: new Date() }
                });
            } else if (result.error === 'rate_limit' || (result.message && result.message.includes('rate is limited'))) {
                logger.error('RATE LIMITED. Stopping manual push. Please try again in 5 minutes.');
                process.exit(1);
            } else {
                logger.warn(`Failed to sync order ${order.email}: ${result.message || JSON.stringify(result)}`);
            }
        }

        logger.info('MANUAL DNE PUSH COMPLETE');
        process.exit(0);
    } catch (error) {
        logger.error('MANUAL DNE PUSH FAILED:', error);
        process.exit(1);
    }
}

manualDNEPush();
