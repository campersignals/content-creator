const apiKey = "AIzaSyB3M1ylmP7HciWfJa_vFckNf_F0aIht1Go";

async function checkModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    console.log("Fetching models from:", url.replace(apiKey, "HIDDEN_KEY"));

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("API Error:", JSON.stringify(data.error, null, 2));
        } else {
            console.log("Available Models:");
            if (data.models) {
                data.models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`));
            } else {
                console.log("No models found in response:", data);
            }
        }
    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

checkModels();
