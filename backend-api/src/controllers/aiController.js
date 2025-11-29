const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.generate = async (req, res) => {
    try {
        const { prompt, context } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({
                success: false,
                error: "Gemini API key not configured"
            });
        }

        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: "Prompt is required"
            });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        let fullPrompt = prompt;
        if (context) {
            fullPrompt = `Context: ${context}\n\nQuestion: ${prompt}`;
        }

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        res.json({
            success: true,
            data: text
        });

    } catch (error) {
        console.error("AI Generation Error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to generate AI response"
        });
    }
};
