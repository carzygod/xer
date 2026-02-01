export interface TweetData {
    id: string; // usually derived from status URL
    author: string;
    text: string;
    element: HTMLElement;
}

export class TwitterActor {

    // Smooth scroll to bottom
    public scrollToBottom() {
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
    }

    // Extract visible tweets
    public getVisibleTweets(): TweetData[] {
        const articles = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
        const tweets: TweetData[] = [];

        articles.forEach((article) => {
            try {
                const element = article as HTMLElement;

                // Text
                const textNode = element.querySelector('div[data-testid="tweetText"]');
                const text = textNode ? textNode.textContent || '' : '';

                // Author (User-Name usually contains display name and handle)
                const userNode = element.querySelector('div[data-testid="User-Name"]');
                const author = userNode ? userNode.textContent || '' : '';

                // ID / Permalink
                // Usually found in the timestamp link: /username/status/123456...
                const timeLink = element.querySelector('time')?.closest('a');
                const href = timeLink?.getAttribute('href');

                // Robust extraction: match /status/(\d+)
                const match = href ? href.match(/status\/(\d+)/) : null;
                const id = match ? match[1] : '';

                if (id && text) {
                    tweets.push({ id, author, text, element });
                }
            } catch (e) {
                console.error('Error parsing tweet:', e);
            }
        });

        return tweets;
    }

    public async ensureTweetVisible(tweetId: string): Promise<HTMLElement | null> {
        const articles = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
        for (const article of articles) {
            const timeLink = article.querySelector('time')?.closest('a');
            const href = timeLink?.getAttribute('href');
            if (href && href.includes(`/status/${tweetId}`)) {
                (article as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(res => setTimeout(res, 500));
                return article as HTMLElement;
            }
        }

        // If not found, try to pull it into view by searching all anchors
        const allLinks = Array.from(document.querySelectorAll('a[href*="/status/"]'));
        for (const link of allLinks) {
            const href = link.getAttribute('href');
            if (href && href.includes(`/status/${tweetId}`)) {
                const article = link.closest('article[data-testid="tweet"]') as HTMLElement | null;
                if (article) {
                    article.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await new Promise(res => setTimeout(res, 500));
                    return article;
                }
            }
        }

        return null;
    }

    // Click Like button
    public async clickLike(element: HTMLElement): Promise<boolean> {
        const likeButton = element.querySelector('button[data-testid="like"]') as HTMLElement;
        const unlikeButton = element.querySelector('button[data-testid="unlike"]') as HTMLElement;

        if (unlikeButton) {
            console.log('Already liked.');
            return false;
        }

        if (likeButton) {
            // Try multiple click dispatch methods for React
            likeButton.click();

            // Dispatch explicit events just in case
            likeButton.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            likeButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            likeButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            likeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            console.log('Clicked Like button via Actor');
            return true;
        }
        console.log('Like button NOT found on element');
        return false;
        return false;
    }

    // Click Retweet button
    public async clickRetweet(element: HTMLElement): Promise<boolean> {
        const retweetButton = element.querySelector('button[data-testid="retweet"]') as HTMLElement;
        const unretweetButton = element.querySelector('button[data-testid="unretweet"]') as HTMLElement;

        if (unretweetButton) {
            console.log('Already retweeted.');
            return false;
        }

        if (retweetButton) {
            retweetButton.click();

            // Wait for dropdown menu
            await new Promise(r => setTimeout(r, 500));

            // Click "Retweet" in menu (data-testid="retweetConfirm")
            const confirmBtn = document.querySelector('div[data-testid="retweetConfirm"]') as HTMLElement;
            if (confirmBtn) {
                confirmBtn.click();
                return true;
            }
        }
        return false;
    }

    // Type Reply
    public async typeReply(element: HTMLElement, text: string): Promise<boolean> {
        const replyButton = element.querySelector('button[data-testid="reply"]') as HTMLElement;
        if (!replyButton) return false;

        replyButton.click();
        console.log('Opened reply modal, waiting for editor...');

        const selectorCandidates = [
            'div[data-testid^="tweetTextarea"]',
            '[contenteditable="true"][role="textbox"][aria-label*="Tweet"]',
            '[contenteditable="true"][role="textbox"]'
        ];

        let editor: HTMLElement | null = null;
        const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

        for (let attempt = 0; attempt < 12; attempt++) {
            for (const selector of selectorCandidates) {
                const candidate = document.querySelector(selector) as HTMLElement | null;
                if (candidate && candidate.isContentEditable) {
                    editor = candidate;
                    break;
                }
            }
            if (editor) break;
            await wait(400);
        }

        if (!editor) {
            console.error('Could not find reply editor');
            return false;
        }

        // 3. Focus and simulate typing (simplified)
        editor.focus();

        // Using execCommand is deprecated but often strongest for React inputs without native events
        document.execCommand('insertText', false, text);

        // 4. Dispatch events to be safe
        editor.dispatchEvent(new Event('input', { bubbles: true }));

        console.log('Typed text, waiting 5s before sending...');
        // 5. Wait for button enablement (User requested 5s delay after input)
        await new Promise(r => setTimeout(r, 5000));

        // 6. Click Tweet button (data-testid="tweetButton")
        const sendButton = document.querySelector('button[data-testid="tweetButton"]') as HTMLElement;
        if (sendButton) {
            sendButton.click();
            return true;
        }

        return false;
    }

    // --- DM Logic ---

    // Get list of unread conversations
    public getUnreadConversations(): HTMLElement[] {
        // Selector for conversations
        const conversations = Array.from(document.querySelectorAll('div[data-testid="conversation"]'));
        const unread: HTMLElement[] = [];

        conversations.forEach(conv => {
            // Unread indicator is usually an aria-label or a specific visual element.
            // A simple heuristic: check for the "unread" indicator element or aria-label="Unread"
            // Note: X DOM is obfuscated. Often an unread conversation has a distinct background color or an indicator dot.
            // Let's look for an element with specific background-color or aria-label containing "Unread".

            // Heuristic 1: Aria label on the thread?
            // Heuristic 2: A blue dot.

            // For now, let's look for specific unread badge often found inside.
            // Or easier: Just return ALL conversations for now if we want to reply to latest? 
            // - No, user wants AUTO REPLY, implies responding to NEW things.
            // Let's try to find an aria-label "Unread" on the conversation cell itself or children.

            if (conv.getAttribute('aria-label')?.includes('Unread') || conv.innerHTML.includes('r-14j79pv')) { // r-14j79pv is often the blue color class for dot, but brittle.
                // Let's rely on text content check? No.
                // Let's assume if we are scanning, we return the top one if we can track state.
                // BUT safest is checking attributes.
                unread.push(conv as HTMLElement);
            }
        });

        // Fallback: If no "Unread" detected explicitly, maybe return the top one if it hasn't been replied to? 
        // For 'substantial implementation', let's return all conversations and let the background script decide based on message content/author (deduplication).
        return unread;
    }

    public clickConversation(index: number): boolean {
        // Better to select from all to be safe on index
        const all = Array.from(document.querySelectorAll('div[data-testid="conversation"]'));
        if (all[index]) {
            (all[index] as HTMLElement).click();
            return true;
        }
        return false;
    }

    public async sendDm(text: string): Promise<boolean> {
        // 1. Find Input
        const input = document.querySelector('div[data-testid="dmComposerTextInput"]') as HTMLElement;
        if (!input) return false;

        // 2. Focus and Type
        input.focus();
        document.execCommand('insertText', false, text);
        input.dispatchEvent(new Event('input', { bubbles: true }));

        // 3. Wait a bit
        await new Promise(r => setTimeout(r, 2000));

        // 4. Click Send
        const sendBtn = document.querySelector('button[data-testid="dmComposerSendButton"]') as HTMLElement;
        if (sendBtn) {
            sendBtn.click();
            return true;
        }
        return false;
    }
}
