const { GoogleGenerativeAI } = require("@google/generative-ai");

async function main() {
    console.log('🚀 Starting standalone Gemini test...');

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error('❌ GOOGLE_API_KEY is missing in environment variables.');
        process.exit(1);
    }

    try {
        console.log('1. Initializing Client...');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        console.log('✅ Client initialized.');

        console.log('2. sending prompt...');
        const result = await model.generateContent("Schreibe nur das Wort 'Erfolg'.");
        const text = result.response.text();
        console.log(`✅ Gemini Response: ${text}`);

    } catch (e) {
        console.error('❌ CRITICAL ERROR in standalone Gemini script:', e);
        process.exit(1);
    }
}

main();
