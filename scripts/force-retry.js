const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function forceRetry() {
    console.log('Force retrying existing abandoned checkout data...');

    try {
        const result = await prisma.checkout.updateMany({
            where: { status: 'abandoned' },
            data: { status: 'pending' }
        });

        console.log(`Successfully updated ${result.count} checkouts to pending status.`);
        console.log('The cron job will now re-process these records on its next run.');
    } catch (error) {
        console.error('Failed to update checkout statuses:', error);
    } finally {
        await prisma.$disconnect();
    }
}

forceRetry();
