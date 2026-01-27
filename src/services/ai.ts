import { AISettings } from '../shared/types';

export async function generateReply(
    prompt: string,
    tweetText: string,
    settings: AISettings
): Promise<string> {
    if (!settings.apiKey) {
        throw new Error('No API Key provided');
    }

    const systemPrompt = `You are a helpful social media assistant. 
    Your task is to generate a short, friendly, and engaging reply to the following tweet.
    Do not use hashtags. Keep it under 280 characters.
    Tone: Casual, positive.
    IMPORTANT: You MUST write your reply in the SAME LANGUAGE as the tweet text.
    
    Tweet: "${tweetText}"`;

    try {
        const response = await fetch(settings.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
                model: settings.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt || "Write a reply." } // In future we can pass custom instructions
                ],
                max_tokens: 100,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`AI API Error (${response.status}):`, errorText);
            throw new Error(`AI API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content?.replace(/^"|"$/g, '') || '';

    } catch (error) {
        console.error('AI Service Error:', error);
        throw error; // Re-throw to handle in background
    }
}
