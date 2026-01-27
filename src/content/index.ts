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
        }
    }
});

