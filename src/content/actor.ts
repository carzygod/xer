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

        // 1. Click Reply to open modal/inline box
        replyButton.click();
        console.log('Opened reply modal, waiting 5s...');
        await new Promise(r => setTimeout(r, 5000));

        // 2. Find input box (public-DraftEditor-content)
        // Note: this selector is tricky and changes often. Using a common one for now.
        const editor = document.querySelector('div[data-testid="tweetTextarea_0"]') as HTMLElement;
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
}
