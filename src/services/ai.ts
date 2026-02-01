import { AISettings } from '../shared/types';

type LanguageLabel = 'English' | 'Chinese' | 'Russian';

function detectLanguageFromText(text: string): LanguageLabel | null {
    if (!text) return null;
    const trimmed = text.replace(/\s+/g, '');
    if (!trimmed) return null;

    if (/[\p{Script=Han}]/u.test(trimmed)) {
        return 'Chinese';
    }
    if (/[\p{Script=Cyrillic}]/u.test(trimmed)) {
        return 'Russian';
    }
    if (/[A-Za-z]/.test(trimmed)) {
        return 'English';
    }

    return null;
}

export async function generateReply(
    prompt: string,
    tweetText: string,
    settings: AISettings
): Promise<string> {
    if (!settings.apiKey) {
        throw new Error('No API Key provided');
    }

    const detectedLanguage = detectLanguageFromText(tweetText);
    const enforcedLanguage = detectedLanguage ?? 'English';
    const languageNote = detectedLanguage
        ? `Tweet language detected: ${enforcedLanguage}.`
        : 'Tweet language could not be detected; reply in English.';

    const systemPrompt = `You are a helpful social media assistant who frames replies like a calm, fair-minded IT enthusiast.
    Your task is to produce a concise, technical-facing answer that reads like a measured, objective response from someone who understands developer workflows.
    You must match the language indicated by the tweet text. If the tweet only contains emoji or characters you cannot decode, respond in English.
    ${languageNote}
    Do not use hashtags, keep it under 280 characters, and avoid emotional exaggeration.

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
                    { role: "user", content: prompt || "Write a reply." }
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
        throw error;
    }
}
