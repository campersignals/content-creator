const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function main() {
    const dbUrl = process.env.DATABASE_URL;
    console.log('DEBUG: DATABASE_URL type:', typeof dbUrl);
    if (dbUrl) {
        console.log('DEBUG: DATABASE_URL starts with:', dbUrl.substring(0, 11));
        console.log('DEBUG: DATABASE_URL length:', dbUrl.length);
    } else {
        console.log('DEBUG: DATABASE_URL is undefined or empty');
    }
    console.log('🚀 Starting standalone DB write test...');

    try {
        console.log('1. Connecting to DB...');
        await prisma.$connect();
        console.log('✅ Connected.');

        console.log('2. Attempting to create Author...');
        const result = await prisma.author.create({
            data: {
                name: 'Test Author Standalone',
                url: 'https://example.com',
                style: 'Debug Style'
            }
        });
        console.log('✅ Author created:', result);

        console.log('3. Fetching Authors...');
        const count = await prisma.author.count();
        console.log(`✅ Total Authors in DB: ${count}`);

    } catch (e) {
        console.error('❌ CRITICAL ERROR in standalone script:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        console.log('🏁 Test finished.');
    }
}

main();
