/**
 * Notes AI Analysis
 * Handles TLDR generation and grammar checking for notes
 * Uses direct API calls to AI providers
 */

// eslint-disable-next-line no-unused-vars
const NotesAI = (() => {
    const state = {
        isAnalyzing: false
    };

    /**
     * Get API key and provider from app settings
     * Returns {apiKey: string, provider: string}
     */
    async function getAISettings() {
        try {
            // eslint-disable-next-line no-undef
            const settings = await Storage.getSettings();

            if (!settings) {
                throw new Error('Settings not available.');
            }

            const aiSettings = settings.ai || {};
            // eslint-disable-next-line no-undef
            const apiKey = Utils.decodeBase64(aiSettings.apiKey || settings.apiKey || '');

            if (!apiKey || !apiKey.trim()) {
                throw new Error('API key not configured. Please add your API key in settings.');
            }

            const provider = aiSettings.provider || 'claude';

            return { apiKey, provider };
        } catch (error) {
            if (error.message.includes('API key')) {
                throw error;
            }
            throw new Error('Failed to load AI settings. Please check your configuration.');
        }
    }

    /**
     * Make API call through local proxy (handles CORS)
     * @param {string} prompt - User prompt
     * @param {string} provider - Provider name (claude, openai, gemini)
     * @returns {Promise<string>} API response text
     */
    async function makeProxyApiCall(prompt, provider = 'claude') {
        const providers = {
            claude: {
                model: 'claude-haiku-4-5',
                maxTokens: 2000
            },
            openai: {
                model: 'gpt-4-turbo-preview',
                maxTokens: 2000
            },
            gemini: {
                model: 'gemini-pro',
                maxTokens: 2000
            }
        };

        const config = providers[provider];
        if (!config) {
            throw new Error(`Unknown provider: ${provider}`);
        }

        let requestBody;
        if (provider === 'claude') {
            requestBody = {
                model: config.model,
                max_tokens: config.maxTokens,
                messages: [{ role: 'user', content: prompt }]
            };
        } else if (provider === 'openai') {
            requestBody = {
                model: config.model,
                max_tokens: config.maxTokens,
                messages: [{ role: 'user', content: prompt }]
            };
        } else if (provider === 'gemini') {
            requestBody = {
                model: config.model,
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    maxOutputTokens: config.maxTokens
                }
            };
        }

        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData.error?.message || errorData.message || 'API request failed';
            throw new Error(errorMsg);
        }

        const data = await response.json();

        // Parse response based on provider
        let responseText;
        if (provider === 'claude') {
            if (!data.content || !data.content[0] || !data.content[0].text) {
                throw new Error('Invalid Claude API response format');
            }
            responseText = data.content[0].text;
        } else if (provider === 'openai') {
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid OpenAI API response format');
            }
            responseText = data.choices[0].message.content;
        } else if (provider === 'gemini') {
            if (
                !data.candidates ||
                !data.candidates[0] ||
                !data.candidates[0].content ||
                !data.candidates[0].content.parts ||
                !data.candidates[0].content.parts[0]
            ) {
                throw new Error('Invalid Gemini API response format');
            }
            responseText = data.candidates[0].content.parts[0].text;
        }

        return responseText;
    }

    /**
     * Generate TLDR (Too Long; Didn't Read) summary
     * @param {string} noteId - Note ID
     * @param {string} content - Note content
     */
    async function generateTLDR(noteId, content) {
        if (!content.trim()) {
            alert('Note is empty. Nothing to summarize.');
            return;
        }

        if (state.isAnalyzing) {
            alert('Analysis in progress. Please wait.');
            return;
        }

        state.isAnalyzing = true;
        // eslint-disable-next-line no-undef
        NotesEditor.updateStatus('Generating summary...');

        // Show loading modal immediately
        const loadingModal = showLoadingModal('Generating summary...');

        try {
            const { provider } = await getAISettings();

            const prompt = `Please create a concise TLDR (2-3 sentences) summarizing this note. Be clear and concise:\n\n${content}`;

            const summary = await makeProxyApiCall(prompt, provider);

            if (!summary || !summary.trim()) {
                throw new Error('No summary generated');
            }

            // Close loading modal and show summary
            if (loadingModal) {
                loadingModal.remove();
            }
            showSummaryModal(summary);

            // eslint-disable-next-line no-undef
            NotesEditor.updateStatus('Summary generated');
        } catch (error) {
            console.error('Error generating TLDR:', error);
            // eslint-disable-next-line no-undef
            NotesEditor.updateStatus('Error generating summary');
            if (loadingModal) {
                loadingModal.remove();
            }
            alert(`Error: ${error.message}`);
        } finally {
            state.isAnalyzing = false;
        }
    }

    /**
     * Check grammar and spelling
     * @param {string} noteId - Note ID
     * @param {string} content - Note content
     */
    async function checkGrammar(noteId, content) {
        if (!content.trim()) {
            alert('Note is empty. Nothing to check.');
            return;
        }

        if (state.isAnalyzing) {
            alert('Analysis in progress. Please wait.');
            return;
        }

        state.isAnalyzing = true;
        // eslint-disable-next-line no-undef
        NotesEditor.updateStatus('Checking grammar...');

        // Show loading modal immediately
        const loadingModal = showLoadingModal('Checking grammar...');

        try {
            const { provider } = await getAISettings();

            const prompt = `Please review this note for grammar, spelling, and clarity issues.

Return your response as ONLY valid JSON (no markdown, no extra text). The JSON must have this exact structure:
{
  "corrections": [
    {"issue": "description of the error", "location": "where in the text", "correction": "the exact change made"}
  ],
  "summary": "brief overall assessment",
  "correctedText": "the complete corrected version of the entire note with all changes applied"
}

IMPORTANT RULES:
1. ONLY include corrections in the "corrections" array for changes you actually made in "correctedText"
2. Do NOT include items that say "no change needed" or ask questions
3. Do NOT include items where nothing was changed
4. Every correction must have an exact, definitive change statement (not conditional)
5. The "correctedText" must be the COMPLETE, FULL note with ALL corrections applied
6. Preserve all formatting, structure, and length of the original

ORIGINAL:
${content}`;

            const feedback = await makeProxyApiCall(prompt, provider);

            if (!feedback || !feedback.trim()) {
                throw new Error('No feedback generated');
            }

            // Close loading modal and show feedback
            if (loadingModal) {
                loadingModal.remove();
            }
            showFeedbackModal(feedback);
            // eslint-disable-next-line no-undef
            NotesEditor.updateStatus('Grammar check complete');
        } catch (error) {
            console.error('Error checking grammar:', error);
            // eslint-disable-next-line no-undef
            NotesEditor.updateStatus('Error checking grammar');
            if (loadingModal) {
                loadingModal.remove();
            }
            alert(`Error: ${error.message}`);
        } finally {
            state.isAnalyzing = false;
        }
    }

    /**
     * Show loading modal with spinner
     */
    function showLoadingModal(message) {
        const modal = document.createElement('div');
        modal.className = 'ai-modal';
        modal.innerHTML = `
            <div class="ai-modal-content" style="max-width: 300px;">
                <div style="padding: 2rem; text-align: center;">
                    <div class="ai-spinner"></div>
                    <p style="margin-top: 1rem; color: var(--color-text-primary);">${escapeHtml(message)}</p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        return modal;
    }

    /**
     * Show summary modal
     */
    function showSummaryModal(summary) {
        const modal = document.createElement('div');
        modal.className = 'ai-modal';
        modal.innerHTML = `
            <div class="ai-modal-content">
                <div class="ai-modal-header">
                    <h3>Summary (TLDR)</h3>
                    <button class="ai-modal-close-icon" aria-label="Close">&times;</button>
                </div>
                <div class="ai-modal-body">
                    <p>${escapeHtml(summary)}</p>
                </div>
                <div class="ai-modal-footer">
                    <button class="btn btn-secondary ai-modal-copy">Copy</button>
                    <button class="btn btn-primary ai-modal-insert">Insert at Start</button>
                    <button class="btn btn-secondary ai-modal-close">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeIconBtn = modal.querySelector('.ai-modal-close-icon');
        const closeBtn = modal.querySelector('.ai-modal-close');
        const copyBtn = modal.querySelector('.ai-modal-copy');
        const insertBtn = modal.querySelector('.ai-modal-insert');

        // Handle close buttons
        if (closeIconBtn) {
            closeIconBtn.addEventListener('click', () => modal.remove());
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.remove());
        }
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(summary);
            alert('Summary copied to clipboard');
        });
        insertBtn.addEventListener('click', () => {
            const textarea = document.getElementById('note-content-textarea');
            textarea.value = `**Summary:** ${summary}\n\n${textarea.value}`;
            modal.remove();
            // Trigger input event to update preview
            // eslint-disable-next-line no-undef
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }

    /**
     * Show feedback modal
     */
    function showFeedbackModal(feedback) {
        let correctedText = null;
        let displayHtml = '';
        let feedbackForClipboard = feedback;
        let parseError = false;

        // Try to parse as JSON
        try {
            // Handle JSON wrapped in markdown code blocks
            let jsonString = feedback;
            const jsonMatch = feedback.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
                jsonString = jsonMatch[1].trim();
            }

            const parsed = JSON.parse(jsonString);

            // Extract corrected text
            if (parsed.correctedText) {
                correctedText = parsed.correctedText;
            }

            // Build HTML display
            displayHtml = '<div>';

            // Display summary
            if (parsed.summary) {
                displayHtml += `<p><strong>Overall Assessment:</strong> ${escapeHtml(parsed.summary)}</p>`;
            }

            // Display corrections as table if any
            if (parsed.corrections && parsed.corrections.length > 0) {
                displayHtml +=
                    '<h3 style="margin: 1.5rem 0 0.75rem 0; color: var(--color-text-primary);">Corrections</h3>';
                displayHtml +=
                    '<table style="width: 100%; border-collapse: collapse; margin: 1rem 0; border: 1px solid var(--color-border-primary);">';
                displayHtml +=
                    '<tr style="background-color: var(--color-background-secondary);"><th style="padding: 0.75rem; border: 1px solid var(--color-border-primary); text-align: left;">Issue</th><th style="padding: 0.75rem; border: 1px solid var(--color-border-primary); text-align: left;">Location</th><th style="padding: 0.75rem; border: 1px solid var(--color-border-primary); text-align: left;">Correction</th></tr>';

                parsed.corrections.forEach(correction => {
                    const issue = escapeHtml(correction.issue || '');
                    const location = escapeHtml(correction.location || '');
                    const correctionText = escapeHtml(correction.correction || '');
                    displayHtml += `<tr><td style="padding: 0.75rem; border: 1px solid var(--color-border-primary);">${issue}</td><td style="padding: 0.75rem; border: 1px solid var(--color-border-primary);">${location}</td><td style="padding: 0.75rem; border: 1px solid var(--color-border-primary);">${correctionText}</td></tr>`;
                });

                displayHtml += '</table>';
            } else {
                displayHtml +=
                    '<p style="color: var(--color-text-secondary);">No corrections needed - text is well-written!</p>';
            }

            displayHtml += '</div>';

            // For clipboard, provide a formatted text version
            feedbackForClipboard = 'Grammar & Spelling Review\n\n';
            if (parsed.summary) {
                feedbackForClipboard += `Overall Assessment:\n${parsed.summary}\n\n`;
            }
            if (parsed.corrections && parsed.corrections.length > 0) {
                feedbackForClipboard += 'Corrections:\n';
                parsed.corrections.forEach(correction => {
                    feedbackForClipboard += `- ${correction.issue} (${correction.location}): ${correction.correction}\n`;
                });
            }
        } catch (e) {
            // JSON parsing failed
            parseError = true;
            displayHtml = `<div style="color: var(--color-text-error); padding: 1rem; background: var(--color-background-error); border-radius: var(--border-radius); margin-bottom: 1rem;">
                <strong>Error:</strong> Failed to parse AI response. Please try the grammar check again.
            </div>`;
        }

        const modal = document.createElement('div');
        modal.className = 'ai-modal';
        modal.innerHTML = `
            <div class="ai-modal-content ai-modal-content-wide">
                <div class="ai-modal-header">
                    <h3>Grammar & Spelling Review</h3>
                    <button class="ai-modal-close-icon" aria-label="Close">&times;</button>
                </div>
                <div class="ai-modal-body">
                    <div style="font-size: 0.95rem;">
                        ${displayHtml}
                    </div>
                </div>
                <div class="ai-modal-footer">
                    <button class="btn btn-secondary ai-modal-copy-feedback">Copy Feedback</button>
                    <button class="btn btn-primary ai-modal-apply">Apply Changes</button>
                    <button class="btn btn-secondary ai-modal-close">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeIconBtn = modal.querySelector('.ai-modal-close-icon');
        const closeBtn = modal.querySelector('.ai-modal-close');
        const copyBtn = modal.querySelector('.ai-modal-copy-feedback');
        const applyBtn = modal.querySelector('.ai-modal-apply');

        // Disable apply button if JSON parsing failed or no corrected text
        if (parseError || !correctedText) {
            applyBtn.disabled = true;
            applyBtn.style.opacity = '0.5';
            applyBtn.title = 'Could not parse corrected text. Please try again.';
        }

        // Handle close buttons
        if (closeIconBtn) {
            closeIconBtn.addEventListener('click', () => modal.remove());
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.remove());
        }
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(feedbackForClipboard);
            alert('Feedback copied to clipboard');
        });
        applyBtn.addEventListener('click', () => {
            if (correctedText) {
                const textarea = document.getElementById('note-content-textarea');
                textarea.value = correctedText;
                modal.remove();
                // Trigger input event to update preview
                // eslint-disable-next-line no-undef
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    }

    /**
     * Helper: Escape HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Public API
     */
    return {
        generateTLDR,
        checkGrammar
    };
})();

// Hook up AI buttons to notes editor
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const tldrBtn = document.getElementById('note-ai-tldr-btn');
        const grammarBtn = document.getElementById('note-ai-grammar-btn');

        if (tldrBtn) {
            tldrBtn.addEventListener('click', () => {
                // eslint-disable-next-line no-undef
                const noteId = NotesEditor.getCurrentNoteId();
                const content = document.getElementById('note-content-textarea').value;
                if (noteId && content) {
                    // eslint-disable-next-line no-undef
                    NotesAI.generateTLDR(noteId, content);
                }
            });
        }

        if (grammarBtn) {
            grammarBtn.addEventListener('click', () => {
                // eslint-disable-next-line no-undef
                const noteId = NotesEditor.getCurrentNoteId();
                const content = document.getElementById('note-content-textarea').value;
                if (noteId && content) {
                    // eslint-disable-next-line no-undef
                    NotesAI.checkGrammar(noteId, content);
                }
            });
        }
    }, 100);
});
