export interface IntervalRange {
    min: number;
    max: number;
}

export interface AISettings {
    apiKey: string;
    apiUrl: string;
    model: string;
    embeddingsModel: string;
}

export interface StoredTweet {
    id: string;
    text: string;
    author: string;
    capturedAt: number;
}

export interface InteractionHistory {
    date: string; // YYYY-MM-DD
    likes: number;
    replies: number;
    retweets: number;
    dms: number;
    mentions: number;
    interactedTweetIds: string[];
}

export interface Settings {
    language: 'zh_CN' | 'zh_TW' | 'en' | 'ru';
    targetUrl: string;
    intervals: {
        scroll: IntervalRange;
        like: IntervalRange;
        reply: IntervalRange;
        retweet: IntervalRange;
        dm: IntervalRange;
        mention: IntervalRange;
    };
    dailyLimits: {
        like: number;
        reply: number;
        retweet: number;
        dm: number;
        mention: number;
    };
    ai: AISettings;
    autoReplyDms: boolean;
    autoReplyMentions: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
    language: 'zh_CN',
    targetUrl: 'https://x.com/home',
    intervals: {
        scroll: { min: 10, max: 30 },
        like: { min: 60, max: 180 },
        reply: { min: 60, max: 180 },
        retweet: { min: 180, max: 600 },
        dm: { min: 300, max: 900 },
        mention: { min: 300, max: 900 },
    },
    dailyLimits: {
        like: 50,
        reply: 20,
        retweet: 10,
        dm: 10,
        mention: 10,
    },
    ai: {
        apiKey: '',
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini',
        embeddingsModel: 'text-embedding-3-small',
    },
    autoReplyDms: false,
    autoReplyMentions: false,
};
