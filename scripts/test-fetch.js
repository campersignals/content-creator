const https = require('https');

async function testFetch() {
    console.log('🚀 Starting standalone Fetch test...');
    const url = 'https://www.google.com'; // Simple stable target

    try {
        console.log(`1. Fetching ${url}...`);

        // Native Node.js fetch (available in Node 18+)
        const response = await fetch(url);

        console.log(`✅ Response Status: ${response.status}`);
        const text = await response.text();
        console.log(`✅ Body Length: ${text.length}`);

        if (response.ok) {
            console.log('✅ Fetch Logic appears stable.');
        } else {
            console.error('❌ Fetch failed with bad status.');
            process.exit(1);
        }

    } catch (e) {
        console.error('❌ CRITICAL ERROR in standalone Fetch script:', e);
        process.exit(1);
    }
}

testFetch();
