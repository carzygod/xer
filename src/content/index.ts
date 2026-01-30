import { TwitterActor } from './actor';

console.log('xer content script loaded');

const actor = new TwitterActor();

chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
    console.log('Content received:', message.type);

    if (message.type === 'SCROLL') {
        actor.scrollToBottom();
    }
    else if (message.type === 'SCAN') {
        const tweets = actor.getVisibleTweets();
        const now = Date.now();
        // Add capturedAt timestamp
        const payload = tweets.map(t => ({
            id: t.id,
            text: t.text,
            author: t.author,
            capturedAt: now
        }));
        sendResponse({ count: tweets.length, tweets: payload });
    }
    else if (message.type === 'EXECUTE_LIKE') {
        const tweets = actor.getVisibleTweets();
        // Simple logic: find tweet by ID or just index for now. 
        // In real app, we pass ID. For now, let's act on the first *unliked* tweet found or specific one.
        // Let's assume message.tweetId is passed.

        const target = tweets.find(t => t.id === message.tweetId);
        if (target) {
            actor.clickLike(target.element).then(success => {
                sendResponse({ success });
            });
            return true; // Keep channel open
        } else {
            sendResponse({ success: false, error: 'Tweet not found' });
        }
    }
    else if (message.type === 'EXECUTE_RETWEET') {
        const tweets = actor.getVisibleTweets();
        const target = tweets.find(t => t.id === message.tweetId);
        if (target) {
            actor.clickRetweet(target.element).then(success => {
                sendResponse({ success });
            });
            return true;
        } else {
            sendResponse({ success: false, error: 'Tweet not found for retweet' });
        }
    }
    else if (message.type === 'EXECUTE_REPLY') {
        const tweets = actor.getVisibleTweets();
        const target = tweets.find(t => t.id === message.tweetId);
        if (target && message.text) {
            actor.typeReply(target.element, message.text).then(success => {
                sendResponse({ success });
            });
            return true;
        } else {
            sendResponse({ success: false, error: 'Tweet not found for reply' });
        }
    }
    // --- DM HANDLERS ---
    else if (message.type === 'SCAN_DMS') {
        // Just return count of unread or all?
        // For simplicity, we just return the count of unread to let background know there is work.
        // In a real implementation we would extract text to generate context-aware reply.
        // For now, prompt will be generic "Reply to this DM".
        // Return indices of unread items relative to ALL conversations logic? 
        // Let's just say we found X unread.
        // The actor needs to keep track? No, stateless is better.
        // Let's return metadata.
        const all = Array.from(document.querySelectorAll('div[data-testid="conversation"]'));
        const unreadIndices = all.map((c, i) => {
            // Re-use logic from actor to identify unread, or expose utility.
            if (c.getAttribute('aria-label')?.includes('Unread') || c.innerHTML.includes('r-14j79pv')) return i;
            return -1;
        }).filter(i => i !== -1);

        sendResponse({ unreadIndices });
    }
    else if (message.type === 'EXECUTE_DM_REPLY') {
        const { index, text } = message;
        if (actor.clickConversation(index)) {
            // Wait for load
            setTimeout(async () => {
                const success = await actor.sendDm(text);
                sendResponse({ success });
            }, 2000);
            return true;
        } else {
            sendResponse({ success: false, error: 'Conversation not found' });
        }
    }
});

