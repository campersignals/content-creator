const apiKey = process.env.GOOGLE_API_KEY;

async function generateImage() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;
    // Trying imagen-3.0 first as it's more likely to be stable, or check the list again.
    // The list had: models/imagen-4.0-generate-001 (predict)

    const url4 = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;

    console.log("Testing Imagen 4.0...");

    const body = {
        instances: [
            {
                prompt: "A futuristic city with flying cars, cyberpunk style"
            }
        ],
        parameters: {
            sampleCount: 1,
            aspectRatio: "1:1"
        }
    };

    try {
        const response = await fetch(url4, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (data.error) {
            console.error("API Error:", JSON.stringify(data.error, null, 2));
        } else {
            console.log("Success! Response keys:", Object.keys(data));
            if (data.predictions) {
                console.log("Received predictions.");
                // Don't print the huge base64
                console.log("Base64 length:", data.predictions[0].bytesBase64Encoded?.length);
            }
        }
    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

generateImage();
