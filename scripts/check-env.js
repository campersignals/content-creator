const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Load .env manually
try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["'](.*)["']$/, '$1'); // Remove quotes
                process.env[key] = value;
            }
        });
    }
} catch (e) {
    console.warn('Could not read .env file:', e);
}

async function checkEnv() {
    console.log('--- Environment Check ---');

    // Check GOOGLE_API_KEY
    if (!process.env.GOOGLE_API_KEY) {
        console.error('❌ GOOGLE_API_KEY is missing in .env file');
    } else {
        console.log('✅ GOOGLE_API_KEY is present');
        console.log(`   Key ends with: ...${process.env.GOOGLE_API_KEY.slice(-4)}`);
    }

    // Check DATABASE_URL
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is missing in .env file');
    } else {
        console.log('✅ DATABASE_URL is present');
    }

    // Check OPENAI_API_KEY
    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY is missing in .env file');
    } else {
        console.log('✅ OPENAI_API_KEY is present');
        console.log(`   Key ends with: ...${process.env.OPENAI_API_KEY.slice(-4)}`);
    }

    // Test Gemini Connection
    if (process.env.GOOGLE_API_KEY) {
        console.log('\n--- Testing Gemini Connection ---');
        try {
            const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

            const result = await model.generateContent('Hello, are you working? Respond with "Yes".');
            const response = await result.response;
            const text = response.text();

            console.log('✅ Gemini Connection Successful!');
            console.log('   Response:', text.trim());
        } catch (error) {
            console.error('❌ Gemini Connection Failed:', error.message);
        }
    }

    console.log('\n--- Check Complete ---');
}

checkEnv();
