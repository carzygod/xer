
import { Settings, DEFAULT_SETTINGS, StoredTweet } from '../shared/types';
import { generateReply } from '../services/ai';
import { StorageService } from '../services/storage';

// Background script state
let isRunning = false;
let settings: Settings = DEFAULT_SETTINGS;

// Initialize state from storage
chrome.storage.local.get(['isRunning', 'settings'], (result) => {
    if (result.isRunning !== undefined) isRunning = result.isRunning;
    if (result.settings) settings = result.settings;
});

// Listen for settings changes (Hot Reload)
chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings) {
        settings = changes.settings.newValue;
        console.log('Settings updated hot:', settings);
        if (isRunning) {
            scheduleNextAction();
        }
    }
});

// Timers
let timers: { [key: string]: ReturnType<typeof setTimeout> } = {};

function clearTimers() {
    Object.values(timers).forEach(t => clearTimeout(t));
    timers = {};
}

function getRandomDelay(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
}

// Enable Side Panel opening on action click
// @ts-ignore
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .catch((error) => console.error(error));
}

let activeTabId: number | null = null;

// Listen for messages from Side Panel
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'START_TASK') {
        // Update local settings if provided
        if (message.settings) {
            settings = message.settings;
            chrome.storage.local.set({ settings });
        }

        const urlToOpen = settings.targetUrl;

        // 1. Update state
        isRunning = true;

        // 2. Persist state
        chrome.storage.local.set({ isRunning: true });

        // 3. Open the target URL
        chrome.tabs.create({ url: urlToOpen, active: true }, (tab) => {
            if (tab.id) activeTabId = tab.id;
        });


        console.log('Task started with settings:', settings);

        // Start scheduler loop
        scheduleNextAction();
    }
    else if (message.type === 'PAUSE_TASK') {
        // 1. Update state
        isRunning = false;

        // 2. Persist state
        chrome.storage.local.set({ isRunning: false });

        // Clear any pending timers
        clearTimers();

        console.log('Task paused. isRunning:', isRunning);
    }
    else if (message.type === 'TEST_SCROLL') {
        performScrollAndScan(true);
    }
    else if (message.type === 'TEST_LIKE') {
        performLike(true);
    }
    else if (message.type === 'TEST_REPLY') {
        performReply(true);
    }
    else if (message.type === 'TEST_RETWEET') {
        performRetweet(true);
    }
    else if (message.type === 'TEST_DM') {
        performCheckDms(true);
    }
    else if (message.type === 'TEST_MENTION') {
        performCheckMentions(true);
    }
});

function scheduleNextAction() {
    if (!isRunning) return;

    // SCROLL
    if (!timers['scroll']) {
        const scrollDelay = getRandomDelay(settings.intervals.scroll.min, settings.intervals.scroll.max);
        console.log(`Scheduling scroll in ${scrollDelay / 1000}s`);
        timers['scroll'] = setTimeout(() => performScrollAndScan(), scrollDelay);
    }

    // LIKE
    if (!timers['like']) {
        const likeDelay = getRandomDelay(settings.intervals.like.min, settings.intervals.like.max);
        console.log(`Scheduling like in ${likeDelay / 1000}s`);
        timers['like'] = setTimeout(() => performLike(), likeDelay);
    }

    // REPLY
    if (!timers['reply']) {
        const replyDelay = getRandomDelay(settings.intervals.reply.min, settings.intervals.reply.max);
        console.log(`Scheduling reply in ${replyDelay / 1000}s`);
        timers['reply'] = setTimeout(() => performReply(), replyDelay);
    }

    // RETWEET
    if (!timers['retweet']) {
        const retweetDelay = getRandomDelay(settings.intervals.retweet.min, settings.intervals.retweet.max);
        console.log(`Scheduling retweet in ${retweetDelay / 1000}s`);
        timers['retweet'] = setTimeout(() => performRetweet(), retweetDelay);
    }

    // DM
    if (!timers['dm'] && settings.autoReplyDms) {
        const dmDelay = getRandomDelay(settings.intervals.dm.min, settings.intervals.dm.max);
        console.log(`Scheduling DM check in ${dmDelay / 1000}s`);
        timers['dm'] = setTimeout(() => performCheckDms(), dmDelay);
    }

    // MENTION
    if (!timers['mention'] && settings.autoReplyMentions) {
        const mentionDelay = getRandomDelay(settings.intervals.mention.min, settings.intervals.mention.max);
        console.log(`Scheduling Mention check in ${mentionDelay / 1000}s`);
        timers['mention'] = setTimeout(() => performCheckMentions(), mentionDelay);
    }
}

async function getTargetTab(isTest: boolean): Promise<number | null> {
    if (!isTest && activeTabId !== null) return activeTabId;
    if (isTest) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0 && tabs[0].id) return tabs[0].id;
    }
    return activeTabId;
}

// Helper to navigate and wait if needed
async function ensureNavigation(tabId: number, targetUrlPart: string): Promise<boolean> {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url?.includes(targetUrlPart)) {
        console.log(`Navigating to ${targetUrlPart}...`);
        await chrome.tabs.update(tabId, { url: `https://x.com${targetUrlPart}` });
        // Wait for load
        await new Promise(r => setTimeout(r, 6000)); // Simple 6s wait
        return true;
    }
    return true; // Already there
}

async function performScrollAndScan(isTest = false) {
    if (!isTest) delete timers['scroll'];
    if (!isRunning && !isTest) return;

    const targetTabId = await getTargetTab(isTest);
    if (!targetTabId) return;

    // Ensure we are on home for scrolling? Or just scroll wherever?
    // User expectation: Scroll main feed.
    // If we moved to Messages, we should probably move back to Home for scrolling OR just skip scrolling if not on Home.
    // For now: Just scroll wherever we are.

    console.log('Executing: SCROLL' + (isTest ? ' (TEST)' : ''));
    chrome.tabs.sendMessage(targetTabId, { type: 'SCROLL' });

    // Scan after scroll settles
    setTimeout(() => {
        if ((!isRunning && !isTest) || !targetTabId) return;
        chrome.tabs.sendMessage(targetTabId, { type: 'SCAN' }, async (response) => {
            if (response && response.tweets) {
                await StorageService.addToPool(response.tweets);
            }
        });
    }, 2000);

    // Reschedule
    if (!isTest) scheduleNextAction();
}

async function performLike(isTest = false) {
    if (!isTest) delete timers['like'];
    if (!isRunning && !isTest) return;

    const targetTabId = await getTargetTab(isTest);
    if (!targetTabId) return;

    console.log('Executing: LIKE attempt' + (isTest ? ' (TEST)' : ''));

    // 1. Scan currently visible tweets
    chrome.tabs.sendMessage(targetTabId, { type: 'SCAN' }, async (response) => {
        if (!response || !response.tweets || response.tweets.length === 0) {
            console.log('No visible tweets found for Like.');
            if (!isTest) scheduleNextAction();
            return;
        }

        const candidates: StoredTweet[] = response.tweets;
        let target: StoredTweet | null = null;

        // 2. Find first valid candidate
        for (const cand of candidates) {
            const check = await StorageService.canInteract('like', settings.dailyLimits, cand.id);
            if (check.allowed || isTest) {
                target = cand;
                break;
            } else {
                console.log(`Skipping candidate ${cand.id}: ${check.reason}`);
            }
        }

        if (!target) {
            console.log('No valid candidates (all liked or limited).');
            if (!isTest) scheduleNextAction();
            return;
        }

        // 3. Execute immediately
        console.log(`Attempting to Like: ${target.id}`);
        chrome.tabs.sendMessage(targetTabId, { type: 'EXECUTE_LIKE', tweetId: target.id }, async (res) => {
            if (res && res.success) {
                await StorageService.recordInteraction('like', target!.id);
                console.log('Like Success');
            } else {
                console.log('Like Failed');
            }
            if (!isTest) scheduleNextAction();
        });
    });
}

async function performReply(isTest = false) {
    if (!isTest) delete timers['reply'];
    if (!isRunning && !isTest) return;

    const targetTabId = await getTargetTab(isTest);
    if (!targetTabId) return;

    if (!settings.ai.apiKey) {
        console.log('Skipping Reply: No API Key');
        if (!isTest) scheduleNextAction();
        return;
    }

    console.log('Executing: REPLY attempt' + (isTest ? ' (TEST)' : ''));

    chrome.tabs.sendMessage(targetTabId, { type: 'SCAN' }, async (response) => {
        if (!response || !response.tweets || response.tweets.length === 0) {
            if (!isTest) scheduleNextAction();
            return;
        }

        const candidates: StoredTweet[] = response.tweets;
        let target: StoredTweet | null = null;

        for (const cand of candidates) {
            const check = await StorageService.canInteract('reply', settings.dailyLimits, cand.id);
            if (check.allowed || isTest) {
                target = cand;
                break;
            }
        }

        if (!target) {
            if (!isTest) scheduleNextAction();
            return;
        }

        console.log(`Attempting to Reply to: ${target.id}`);
        try {
            const replyText = await generateReply("Reply kindly", target.text, settings.ai);

            chrome.tabs.sendMessage(targetTabId, { type: 'EXECUTE_REPLY', tweetId: target.id, text: replyText }, async (res) => {
                if (res && res.success) {
                    await StorageService.recordInteraction('reply', target!.id);
                    console.log('Reply Success');
                } else {
                    console.log('Reply Failed');
                }
                if (!isTest) scheduleNextAction();
            });
        } catch (e: any) {
            console.error('Reply Generation failed:', e);
            chrome.runtime.sendMessage({ type: 'SHOW_ERROR', message: e?.message || 'Reply Generation Failed' });
            if (!isTest) scheduleNextAction();
        }
    });
}

async function performRetweet(isTest = false) {
    if (!isTest) delete timers['retweet'];
    if (!isRunning && !isTest) return;

    const targetTabId = await getTargetTab(isTest);
    if (!targetTabId) return;

    console.log('Executing: RETWEET attempt' + (isTest ? ' (TEST)' : ''));

    chrome.tabs.sendMessage(targetTabId, { type: 'SCAN' }, async (response) => {
        if (!response || !response.tweets || response.tweets.length === 0) {
            if (!isTest) scheduleNextAction();
            return;
        }

        const candidates: StoredTweet[] = response.tweets;
        let target: StoredTweet | null = null;

        for (const cand of candidates) {
            const check = await StorageService.canInteract('retweet', settings.dailyLimits, cand.id);
            if (check.allowed || isTest) {
                target = cand;
                break;
            }
        }

        if (!target) {
            if (!isTest) scheduleNextAction();
            return;
        }

        console.log(`Attempting to Retweet: ${target.id}`);
        chrome.tabs.sendMessage(targetTabId, { type: 'EXECUTE_RETWEET', tweetId: target.id }, async (res) => {
            if (res && res.success) {
                await StorageService.recordInteraction('retweet', target!.id);
                console.log('Retweet Success');
            } else {
                console.log('Retweet Failed');
            }
            if (!isTest) scheduleNextAction();
        });
    });
}

// Helper to return to target URL (e.g. Home) after separate page actions
async function returnToTarget(tabId: number) {
    if (activeTabId !== tabId) return; // Only if matching
    const target = settings.targetUrl;
    if (!target) return;

    try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.url !== target && !tab.url?.includes('home')) { // Loose check for home
            console.log(`Returning to target: ${target}`);
            await chrome.tabs.update(tabId, { url: target });
            await new Promise(r => setTimeout(r, 5000)); // Wait for feed load
        }
    } catch (e) {
        console.error('Error returning to target:', e);
    }
}

async function performCheckDms(isTest = false) {
    if (!isTest) delete timers['dm'];
    if ((!isRunning && !isTest) || !settings.autoReplyDms) {
        if (!isTest) scheduleNextAction();
        return;
    }

    const targetTabId = await getTargetTab(isTest);
    if (!targetTabId) return;

    // 1. Navigate to Messages
    await ensureNavigation(targetTabId, '/messages');

    console.log('Executing: DM CHECK' + (isTest ? ' (TEST)' : ''));

    // 2. Scan for unread
    chrome.tabs.sendMessage(targetTabId, { type: 'SCAN_DMS' }, async (response) => {
        if (!response || !response.unreadIndices || response.unreadIndices.length === 0) {
            console.log('No unread DMs found.');
            if (!isTest) {
                await returnToTarget(targetTabId);
                scheduleNextAction();
            }
            return;
        }

        // 3. Process first unread
        const index = response.unreadIndices[0];

        const interactionId = `dm_${Date.now()}`;

        // Check limits
        const check = await StorageService.canInteract('dm', settings.dailyLimits, interactionId);
        if (!check.allowed && !isTest) {
            console.log('DM Limit reached');
            await returnToTarget(targetTabId);
            scheduleNextAction();
            return;
        }

        try {
            // Generate reply (Generic for now, or we could fetch last message content if extended)
            console.log(`Replying to DM index ${index}`);
            const replyText = await generateReply("Reply formally to a direct message acknowledging receipt.", "New Message", settings.ai);

            chrome.tabs.sendMessage(targetTabId, { type: 'EXECUTE_DM_REPLY', index, text: replyText }, async (res) => {
                if (res && res.success) {
                    await StorageService.recordInteraction('dm', interactionId);
                    console.log('DM Reply Success');
                } else {
                    console.log('DM Reply Failed');
                }
                if (!isTest) {
                    await returnToTarget(targetTabId);
                    scheduleNextAction();
                }
            });
        } catch (e) {
            console.error('DM Reply Error', e);
            chrome.runtime.sendMessage({ type: 'SHOW_ERROR', message: e?.message || 'DM Reply Failed' });
            if (!isTest) {
                await returnToTarget(targetTabId);
                scheduleNextAction();
            }
        }
    });
}

async function performCheckMentions(isTest = false) {
    if (!isTest) delete timers['mention'];
    if ((!isRunning && !isTest) || !settings.autoReplyMentions) {
        if (!isTest) scheduleNextAction();
        return;
    }

    const targetTabId = await getTargetTab(isTest);
    if (!targetTabId) return;

    // 1. Navigate to Mentions
    await ensureNavigation(targetTabId, '/notifications/mentions');

    console.log('Executing: MENTION CHECK' + (isTest ? ' (TEST)' : ''));

    // 2. Scan (reuse standard scan as it picks up articles)
    chrome.tabs.sendMessage(targetTabId, { type: 'SCAN' }, async (response) => {
        if (!response || !response.tweets || response.tweets.length === 0) {
            console.log('No mentions found.');
            if (!isTest) {
                await returnToTarget(targetTabId);
                scheduleNextAction();
            }
            return;
        }

        const candidates: StoredTweet[] = response.tweets;
        let target: StoredTweet | null = null;

        // 3. Find un-replied mention
        for (const cand of candidates) {
            const check = await StorageService.canInteract('mention', settings.dailyLimits, cand.id);
            if (check.allowed || isTest) {
                target = cand;
                break;
            }
        }

        if (!target) {
            if (!isTest) {
                await returnToTarget(targetTabId);
                scheduleNextAction();
            }
            return;
        }

        console.log(`Attempting to Reply to Mention: ${target.id}`);
        try {
            const replyText = await generateReply("Reply kindly to a mention", target.text, settings.ai);

            chrome.tabs.sendMessage(targetTabId, { type: 'EXECUTE_REPLY', tweetId: target.id, text: replyText }, async (res) => {
                if (res && res.success) {
                    await StorageService.recordInteraction('mention', target!.id);
                    console.log('Mention Reply Success');
                } else {
                    console.log('Mention Reply Failed');
                }
                if (!isTest) {
                    await returnToTarget(targetTabId);
                    scheduleNextAction();
                }
            });
        } catch (e: any) {
            console.error(e);
            chrome.runtime.sendMessage({ type: 'SHOW_ERROR', message: e?.message || 'Mention Reply Failed' });
            if (!isTest) {
                await returnToTarget(targetTabId);
                scheduleNextAction();
            }
        }
    });
}

console.log('xer background script initialized');
