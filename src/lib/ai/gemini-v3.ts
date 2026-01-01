import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
// We use process.env.GOOGLE_GENERATIVE_AI_API_KEY as the env var name to match existing setup
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
export const generateContentStreamV3 = async (
    prompt: string,
    systemPrompt: string,
    imageData?: string,
    mimeType?: string
): Promise<any> => {
    try {
        const parts: any[] = [];

        // Add image if present
        if (imageData) {
            // Remove data:image/xxx;base64, prefix if present
            const cleanBase64 = imageData.split(',')[1] || imageData;
            parts.push({
                inlineData: {
                    mimeType: mimeType || 'image/jpeg',
                    data: cleanBase64
                }
            });
        }

        // Add prompt
        parts.push({ text: prompt });

        const response = await ai.models.generateContentStream({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: parts
            },
            config: {
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                thinkingConfig: {
                    includeThoughts: true,
                },
            },
        });

        // Create a ReadableStream from the generator
        return new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of response) {
                        const candidates = chunk.candidates;
                        if (candidates && candidates[0] && candidates[0].content && candidates[0].content.parts) {
                            for (const part of candidates[0].content.parts) {
                                // Cast to any to check for 'thought' property
                                const p = part as any;

                                if (p.thought) {
                                    // Logic to handle thoughts will go here in the future
                                    // For now, we just log them to the server console for debugging
                                    // console.log('[Gemini 3.0 Thinking]:', p.text);
                                } else if (p.text) {
                                    // This is the actual content generation
                                    controller.enqueue(new TextEncoder().encode(p.text));
                                }
                            }
                        }
                    }
                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            }
        });

    } catch (error) {
        console.error("Gemini V3 generation failed:", error);
        throw error;
    }
};
