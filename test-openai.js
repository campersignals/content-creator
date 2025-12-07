const OpenAI = require('openai');
// require('dotenv').config(); // Removed to avoid dependency

// Manual env parsing if dotenv not installed or using next env
const fs = require('fs');
const path = require('path');
try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
                process.env[key] = value;
            }
        });
    }
} catch (e) { }

async function testOpenAI() {
    console.log("Testing OpenAI Key...");
    if (!process.env.OPENAI_API_KEY) {
        console.error("No OPENAI_API_KEY found.");
        return;
    }

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: "Hello, are you working?" }],
            model: "gpt-3.5-turbo",
        });
        console.log("Success! Response:", completion.choices[0].message.content);
    } catch (error) {
        console.error("Authentication Error:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        }
    }
}

testOpenAI();
