import { StoredTweet, InteractionHistory, Settings } from '../shared/types';

const KEYS = {
    POOL: 'candidatePool',
    HISTORY: 'interactionHistory',
};

export class StorageService {

    // --- Pool Management ---

    static async addToPool(tweets: StoredTweet[]): Promise<void> {
        const { [KEYS.POOL]: currentPool = [] } = await chrome.storage.local.get(KEYS.POOL);

        // Dedup by ID
        const existingIds = new Set(currentPool.map((t: StoredTweet) => t.id));
        const newTweets = tweets.filter(t => !existingIds.has(t.id));

        if (newTweets.length > 0) {
            const updatedPool = [...currentPool, ...newTweets];
            const trimmedPool = updatedPool.slice(-200);
            await chrome.storage.local.set({ [KEYS.POOL]: trimmedPool });
            console.log(`Added ${newTweets.length} tweets to pool.`);
        }
    }

    static async getPool(): Promise<StoredTweet[]> {
        const result = await chrome.storage.local.get(KEYS.POOL);
        return result[KEYS.POOL] || [];
    }

    static async popFromPool(): Promise<StoredTweet | null> {
        const pool = await this.getPool();
        if (pool.length === 0) return null;

        const candidate = pool.shift();
        await chrome.storage.local.set({ [KEYS.POOL]: pool });
        return candidate || null;
    }

    // --- History & Limits ---

    static async getHistory(): Promise<InteractionHistory> {
        const today = new Date().toISOString().split('T')[0];
        const result = await chrome.storage.local.get(KEYS.HISTORY);
        let history = result[KEYS.HISTORY] as InteractionHistory;

        if (!history || history.date !== today) {
            history = {
                date: today,
                likes: 0,
                replies: 0,
                retweets: 0,
                dms: 0,
                mentions: 0,
                interactedTweetIds: []
            };
            await chrome.storage.local.set({ [KEYS.HISTORY]: history });
        }

        return history;
    }

    static async canInteract(type: 'like' | 'reply' | 'retweet' | 'dm' | 'mention', limits: Settings['dailyLimits'], tweetId: string): Promise<{ allowed: boolean, reason?: string }> {
        const history = await this.getHistory();

        if (history.interactedTweetIds.includes(tweetId)) {
            return { allowed: false, reason: 'Already interacted' };
        }

        let current = 0;
        let limit = 0;

        if (type === 'like') { current = history.likes; limit = limits.like; }
        else if (type === 'reply') { current = history.replies; limit = limits.reply; }
        else if (type === 'retweet') { current = history.retweets; limit = limits.retweet; }
        else if (type === 'dm') { current = history.dms; limit = limits.dm; }
        else if (type === 'mention') { current = history.mentions; limit = limits.mention; }

        if (current >= limit) {
            return { allowed: false, reason: `Daily limit reached` };
        }

        return { allowed: true };
    }

    static async recordInteraction(type: 'like' | 'reply' | 'retweet' | 'dm' | 'mention', tweetId: string): Promise<void> {
        const history = await this.getHistory();
        history.interactedTweetIds.push(tweetId);

        if (type === 'like') history.likes++;
        else if (type === 'reply') history.replies++;
        else if (type === 'retweet') history.retweets++;
        else if (type === 'dm') history.dms++;
        else if (type === 'mention') history.mentions++;

        await chrome.storage.local.set({ [KEYS.HISTORY]: history });
    }
}
