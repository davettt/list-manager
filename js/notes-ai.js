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
            const language = aiSettings.language || 'en';

            return { apiKey, provider, language };
        } catch (error) {
            if (error.message.includes('API key')) {
                throw error;
            }
            throw new Error('Failed to load AI settings. Please check your configuration.');
        }
    }

    /**
     * Get language display name for prompt instructions
     * @param {string} languageCode - Language code (e.g., 'en-AU', 'es', 'fr')
     * @returns {string} Language display name
     */
    function getLanguageName(languageCode) {
        const languageNames = {
            en: 'English',
            'en-GB': 'British English',
            'en-AU': 'Australian English',
            es: 'Spanish',
            fr: 'French',
            de: 'German',
            it: 'Italian',
            pt: 'Portuguese',
            ja: 'Japanese',
            zh: 'Chinese',
            ru: 'Russian'
        };
        return languageNames[languageCode] || 'English';
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
            const { provider, language } = await getAISettings();

            const languageInstruction =
                language && language !== 'en'
                    ? `Please respond in ${getLanguageName(language)}. `
                    : '';
            const prompt = `${languageInstruction}Please create a concise TLDR (2-3 sentences) summarizing this note. Be clear and concise:\n\n${content}`;

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
     * Apply corrections to text for chunked notes
     * @param {string} text - Current text
     * @param {Array} corrections - Array of correction objects with {issue, location, correction}
     * @returns {string} Text with corrections applied
     */
    function applyCorrectionsToText(text, corrections) {
        if (!corrections || corrections.length === 0) {
            return text;
        }

        let result = text;

        // Process corrections from the end of the text backwards to maintain position integrity
        const sortedCorrections = corrections
            .filter(c => c.correction && typeof c.correction === 'string')
            .slice()
            .sort((a, b) => {
                // Sort by position in text (later first) to avoid offset issues
                const posA = result.indexOf(a.issue || '');
                const posB = result.indexOf(b.issue || '');
                return posB - posA;
            });

        for (const correction of sortedCorrections) {
            // The 'issue' field typically contains what was wrong
            // The 'correction' field contains what change was made
            const issue = correction.issue || '';
            const correctionDesc = correction.correction || '';

            // Try multiple patterns to extract old and new text
            let oldText = null;
            let newText = null;

            // Pattern 1: "Changed 'X' to 'Y'"
            let match = correctionDesc.match(
                /[Cc]hanged\s+['"']([^'"']+)['"']\s+to\s+['"']([^'"']+)['"']/
            );
            if (match) {
                [, oldText, newText] = match;
            }

            // Pattern 2: "Changed X to Y" (without quotes)
            if (!oldText) {
                match = correctionDesc.match(/[Cc]hanged\s+(\S+)\s+to\s+(\S+)/);
                if (match) {
                    [, oldText, newText] = match;
                }
            }

            // Pattern 3: Try to infer from issue field (sometimes it contains the problematic word)
            if (!oldText && issue) {
                // Look for the issue text in the document
                if (result.includes(issue)) {
                    oldText = issue;
                    // Try to find the correction in the correction description
                    const corrMatch = correctionDesc.match(
                        /(?:to|with)\s+['"']?([^'"']+?)['"']?(?:\s|$)/i
                    );
                    if (corrMatch) {
                        newText = corrMatch[1];
                    }
                }
            }

            // Apply the correction if we found what to replace
            if (oldText && newText) {
                result = result.replace(oldText, newText);
            }
        }

        return result;
    }

    /**
     * Split note into chunks for processing long notes
     * @param {string} content - Note content
     * @param {number} maxChunkSize - Maximum characters per chunk
     * @returns {Array<string>} Array of note chunks
     */
    function splitNoteIntoChunks(content, maxChunkSize = 3000) {
        const chunks = [];
        let currentChunk = '';

        // Split by paragraphs (double newlines) to preserve structure
        const paragraphs = content.split(/\n\n+/);

        for (const paragraph of paragraphs) {
            if ((currentChunk + paragraph).length > maxChunkSize && currentChunk.length > 0) {
                // Current chunk is full, save it and start a new one
                chunks.push(currentChunk.trim());
                currentChunk = paragraph;
            } else {
                // Add paragraph to current chunk
                currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
            }
        }

        // Add remaining chunk
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
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
            const { provider, language } = await getAISettings();
            const languageInstruction =
                language && language !== 'en'
                    ? `Please respond in ${getLanguageName(language)}. `
                    : '';

            // For long notes, use chunk-based processing
            const chunks = content.length > 4000 ? splitNoteIntoChunks(content, 3000) : [content];
            const isChunked = chunks.length > 1;

            let allCorrections = [];
            let allCorrectedText = content;

            if (isChunked) {
                // eslint-disable-next-line no-undef
                NotesEditor.updateStatus(`Checking grammar (1/${chunks.length})...`);
            }

            for (let i = 0; i < chunks.length; i++) {
                const chunkText = chunks[i];
                const chunkNumber = i + 1;

                if (isChunked) {
                    // eslint-disable-next-line no-undef
                    NotesEditor.updateStatus(
                        `Checking grammar (${chunkNumber}/${chunks.length})...`
                    );
                }

                const prompt = isChunked
                    ? `${languageInstruction}Please review this section of a note for grammar, spelling, and clarity issues. This is section ${chunkNumber}/${chunks.length}.

Return ONLY valid JSON with this structure (no markdown):
{"corrections": [{"issue": "error description", "location": "where", "correction": "change"}], "summary": "brief"}

Focus on this section only. Include ONLY real grammar/spelling errors. Keep corrections concise.

SECTION:
${chunkText}`
                    : `${languageInstruction}Please review this note for grammar, spelling, and clarity issues.

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
${chunkText}`;

                const feedback = await makeProxyApiCall(prompt, provider);

                if (!feedback || !feedback.trim()) {
                    continue; // Skip this chunk if no feedback
                }

                // Try to extract corrections from feedback
                try {
                    let jsonString = feedback;

                    // Method 1: Try to extract from markdown code blocks
                    const jsonMatch = feedback.match(/```(?:json)?\s*([\s\S]*?)```/);
                    if (jsonMatch && jsonMatch[1]) {
                        jsonString = jsonMatch[1].trim();
                    } else {
                        // Method 2: If that didn't work, find first { and last }
                        const firstBrace = feedback.indexOf('{');
                        const lastBrace = feedback.lastIndexOf('}');
                        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                            jsonString = feedback.substring(firstBrace, lastBrace + 1);
                        }
                    }

                    const parsed = JSON.parse(jsonString);

                    // Collect corrections
                    if (parsed.corrections && Array.isArray(parsed.corrections)) {
                        // Add chunk number to location if chunked
                        if (isChunked) {
                            parsed.corrections.forEach(c => {
                                c.location = `Section ${chunkNumber}: ${c.location}`;
                            });
                        }
                        allCorrections = allCorrections.concat(parsed.corrections);
                    }

                    // Use corrected text from AI (for all notes, chunked or not)
                    if (parsed.correctedText) {
                        if (isChunked) {
                            // For chunked notes, apply corrections to the stored corrected text
                            allCorrectedText = applyCorrectionsToText(
                                allCorrectedText,
                                parsed.corrections || []
                            );
                        } else {
                            // For non-chunked, use the full corrected text
                            allCorrectedText = parsed.correctedText;
                        }
                    }
                } catch (e) {
                    // Continue with other chunks if one fails
                    console.error(`Failed to parse chunk ${chunkNumber}:`, e.message);
                }
            }

            // Filter out corrections that don't exist in the original text (prevents false positives)
            const validCorrections = allCorrections.filter(correction => {
                const issue = correction.issue || '';
                // Check if the issue text actually appears in the original content
                if (issue && content.includes(issue)) {
                    return true;
                }
                // Also check common variations
                if (issue) {
                    // Case-insensitive search
                    const lowerContent = content.toLowerCase();
                    const lowerIssue = issue.toLowerCase();
                    return lowerContent.includes(lowerIssue);
                }
                return false;
            });

            // Build combined feedback
            const combinedFeedback = JSON.stringify({
                corrections: validCorrections.length > 0 ? validCorrections : allCorrections, // Fall back to all if none match exactly
                summary: isChunked
                    ? `Checked ${chunks.length} sections of the note`
                    : 'Grammar and spelling review complete',
                correctedText: allCorrectedText
            });

            // Close loading modal and show feedback
            if (loadingModal) {
                loadingModal.remove();
            }
            showFeedbackModal(combinedFeedback, content, isChunked);
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
                    <p style="margin-top: 1rem; color: var(--color-text-primary);">${Utils.sanitizeHtml(message)}</p>
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
                    <p>${Utils.sanitizeHtml(summary)}</p>
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
     * @param {string} feedback - Feedback JSON string
     * @param {string} originalText - Original note text
     * @param {boolean} isChunked - Whether the note was processed in chunks
     */
    function showFeedbackModal(feedback, originalText, isChunked = false) {
        let correctedText = null;
        let displayHtml = '';
        let feedbackForClipboard = feedback;
        let parseError = false;
        let currentNoteId = null;

        // Get current note ID
        // eslint-disable-next-line no-undef
        currentNoteId = NotesEditor.getCurrentNoteId();

        // Try to parse as JSON
        try {
            let jsonString = feedback;

            // Method 1: Try to extract from markdown code blocks
            const jsonMatch = feedback.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch && jsonMatch[1]) {
                jsonString = jsonMatch[1].trim();
            } else {
                // Method 2: If that didn't work, find first { and last }
                const firstBrace = feedback.indexOf('{');
                const lastBrace = feedback.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    jsonString = feedback.substring(firstBrace, lastBrace + 1);
                }
                // If still no luck, just use feedback as-is and let JSON.parse fail
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
                displayHtml += `<p><strong>Overall Assessment:</strong> ${Utils.sanitizeHtml(parsed.summary)}</p>`;
            }

            // Show message for chunked notes
            if (isChunked) {
                displayHtml += `<p style="background-color: var(--color-background-secondary); padding: 0.75rem; border-radius: 4px; font-size: 0.9rem; color: var(--color-text-secondary); margin: 0.75rem 0;">
                    <strong>Note:</strong> Long notes are checked in multiple sections. Preview of changes is not available for multi-section reviews, but you can review all corrections below.
                </p>`;
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
                    const issue = Utils.sanitizeHtml(correction.issue || '');
                    const location = Utils.sanitizeHtml(correction.location || '');
                    const correctionText = Utils.sanitizeHtml(correction.correction || '');
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
            console.error('JSON parse error:', e.message);
            console.error(
                'This is likely because your note is too long for the AI to process completely.'
            );
            parseError = true;

            // Try to salvage what we can from the incomplete JSON
            try {
                // Find all corrections that are complete
                const correctionMatches = feedback.match(
                    /"issue":\s*"([^"]+)"[\s\S]*?"location":\s*"([^"]+)"[\s\S]*?"correction":\s*"([^"]+)"/g
                );

                if (correctionMatches && correctionMatches.length > 0) {
                    // We can extract some corrections even if JSON is incomplete
                    displayHtml = '<div>';
                    displayHtml +=
                        '<p style="color: var(--color-text-secondary); font-size: 0.9rem; margin-bottom: 1rem;"><em>Note: The response was truncated. Showing partial results:</em></p>';
                    displayHtml +=
                        '<h3 style="margin: 1.5rem 0 0.75rem 0; color: var(--color-text-primary);">Corrections Found</h3>';
                    displayHtml +=
                        '<table style="width: 100%; border-collapse: collapse; margin: 1rem 0; border: 1px solid var(--color-border-primary);">';
                    displayHtml +=
                        '<tr style="background-color: var(--color-background-secondary);"><th style="padding: 0.75rem; border: 1px solid var(--color-border-primary); text-align: left;">Issue</th><th style="padding: 0.75rem; border: 1px solid var(--color-border-primary); text-align: left;">Location</th><th style="padding: 0.75rem; border: 1px solid var(--color-border-primary); text-align: left;">Correction</th></tr>';

                    correctionMatches.forEach(match => {
                        const issue = match.match(/"issue":\s*"([^"]+)"/)[1];
                        const location = match.match(/"location":\s*"([^"]+)"/)[1];
                        const correction = match.match(/"correction":\s*"([^"]+)"/)[1];
                        displayHtml += `<tr><td style="padding: 0.75rem; border: 1px solid var(--color-border-primary);">${Utils.sanitizeHtml(issue)}</td><td style="padding: 0.75rem; border: 1px solid var(--color-border-primary);">${Utils.sanitizeHtml(location)}</td><td style="padding: 0.75rem; border: 1px solid var(--color-border-primary);">${Utils.sanitizeHtml(correction)}</td></tr>`;
                    });

                    displayHtml += '</table>';
                    displayHtml +=
                        '<p style="color: var(--color-text-secondary); font-size: 0.85rem; margin-top: 1rem;"><strong>Tip:</strong> Your note is too long for the AI to process fully. Try breaking it into smaller sections and checking grammar on each part separately.</p>';
                    displayHtml += '</div>';
                } else {
                    throw new Error('Could not extract any corrections');
                }
            } catch (fallbackError) {
                // Last resort: just show the raw feedback
                const sanitizedFeedback = Utils.sanitizeHtml(feedback)
                    .replace(/\\n/g, '\n')
                    .replace(/```json\n?/g, '')
                    .replace(/```\n?/g, '');
                displayHtml = `<div style="padding: 1rem; background: var(--color-bg-secondary); border-radius: var(--border-radius); margin-bottom: 1rem;">
                    <strong style="color: var(--color-text-primary);">AI Feedback (Partial):</strong>
                    <p style="color: var(--color-text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem;">Note: Your note is too long. The AI response was truncated.</p>
                    <pre style="white-space: pre-wrap; font-family: inherit; margin-top: 0.5rem; color: var(--color-text-primary);">${sanitizedFeedback}</pre>
                </div>`;
            }
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
                    <div id="diff-preview-container"></div>
                </div>
                <div class="ai-modal-footer">
                    <button class="btn btn-secondary ai-modal-copy-feedback">Copy Feedback</button>
                    <button class="btn btn-primary ai-modal-preview-diff">Preview Changes</button>
                    <button class="btn btn-primary ai-modal-apply">Apply Changes</button>
                    <button class="btn btn-secondary ai-modal-close">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeIconBtn = modal.querySelector('.ai-modal-close-icon');
        const closeBtn = modal.querySelector('.ai-modal-close');
        const copyBtn = modal.querySelector('.ai-modal-copy-feedback');
        const previewDiffBtn = modal.querySelector('.ai-modal-preview-diff');
        const applyBtn = modal.querySelector('.ai-modal-apply');
        const diffPreviewContainer = modal.querySelector('#diff-preview-container');

        // Disable apply button if JSON parsing failed or no corrected text
        if (parseError || !correctedText || isChunked) {
            applyBtn.disabled = true;
            applyBtn.style.opacity = '0.5';
            if (isChunked) {
                applyBtn.title =
                    'Automatic correction not available for multi-section notes. Please review corrections and edit manually.';
            } else {
                applyBtn.title = 'Could not parse corrected text. Please try again.';
            }
            previewDiffBtn.disabled = true;
            previewDiffBtn.style.opacity = '0.5';
        }

        // Handle close buttons
        if (closeIconBtn) {
            closeIconBtn.addEventListener('click', () => modal.remove());
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.remove());
        }
        copyBtn.addEventListener('click', () => {
            // Try modern Clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard
                    .writeText(feedbackForClipboard)
                    .then(() => {
                        alert('Feedback copied to clipboard');
                    })
                    .catch(() => {
                        copyViaFallback();
                    });
            } else {
                // Fallback for HTTP or older browsers
                copyViaFallback();
            }
        });

        /**
         * Fallback copy method using execCommand (works over HTTP)
         */
        function copyViaFallback() {
            const textarea = document.createElement('textarea');
            textarea.value = feedbackForClipboard;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                alert('Feedback copied to clipboard');
            } catch (error) {
                alert('Failed to copy. Please copy the feedback manually.');
            }
            document.body.removeChild(textarea);
        }
        previewDiffBtn.addEventListener('click', () => {
            // Show/hide diff preview
            if (diffPreviewContainer.innerHTML) {
                diffPreviewContainer.innerHTML = '';
                previewDiffBtn.textContent = 'Preview Changes';
            } else {
                const diffHtml = generateDiffHtml(originalText, correctedText);
                diffPreviewContainer.innerHTML = `
                    <div style="margin-top: 1.5rem; border-top: 1px solid var(--color-border-primary); padding-top: 1rem;">
                        <h3 style="margin: 0 0 0.75rem 0; color: var(--color-text-primary);">Preview: What will change</h3>
                        <p style="margin: 0 0 0.5rem 0; font-size: 0.85rem; color: var(--color-text-secondary);">
                            <span style="color: #dc3545;">— Removed</span> | <span style="color: #28a745;">+ Added</span>
                        </p>
                        ${diffHtml}
                    </div>
                `;
                previewDiffBtn.textContent = 'Hide Preview';
            }
        });
        applyBtn.addEventListener('click', () => {
            if (correctedText) {
                // Save backup first, then apply changes
                // eslint-disable-next-line no-undef
                NotesStorage.saveBackup(currentNoteId, originalText)
                    .then(() => {
                        const textarea = document.getElementById('note-content-textarea');
                        textarea.value = correctedText;
                        modal.remove();
                        // Trigger input event to update preview
                        // eslint-disable-next-line no-undef
                        textarea.dispatchEvent(new Event('input', { bubbles: true }));
                        // Show confirmation message
                        // eslint-disable-next-line no-undef
                        NotesEditor.updateStatus(
                            'Changes applied. Backup saved - you can restore from backup if needed.'
                        );
                        // Update backup button visibility to show the newly created backup
                        // eslint-disable-next-line no-undef
                        NotesEditor.updateBackupButtonVisibility(currentNoteId);
                    })
                    .catch(error => {
                        console.error('Error saving backup:', error);
                        // Still apply changes even if backup fails
                        const textarea = document.getElementById('note-content-textarea');
                        textarea.value = correctedText;
                        modal.remove();
                        textarea.dispatchEvent(new Event('input', { bubbles: true }));
                        alert('Warning: Changes applied but backup could not be saved.');
                    });
            }
        });
    }

    /**
     * Simple word-level diff for better change visualization
     */
    function getWordDiff(origLine, corrLine) {
        const origWords = origLine.split(/(\s+|[.,!?;:-])/);
        const corrWords = corrLine.split(/(\s+|[.,!?;:-])/);

        let origHtml = '';
        let corrHtml = '';
        let origIdx = 0;
        let corrIdx = 0;

        while (origIdx < origWords.length || corrIdx < corrWords.length) {
            const origWord = origIdx < origWords.length ? origWords[origIdx] : null;
            const corrWord = corrIdx < corrWords.length ? corrWords[corrIdx] : null;

            if (origWord === corrWord) {
                // Words match
                origHtml += Utils.sanitizeHtml(origWord || '');
                corrHtml += Utils.sanitizeHtml(corrWord || '');
                origIdx++;
                corrIdx++;
            } else if (!origWord) {
                // Word added in corrected version
                corrHtml += `<span style="background-color: rgba(40, 167, 69, 0.3); color: #28a745; font-weight: bold;">${Utils.sanitizeHtml(corrWord)}</span>`;
                corrIdx++;
            } else if (!corrWord) {
                // Word removed
                origHtml += `<span style="background-color: rgba(220, 53, 69, 0.3); color: #dc3545; text-decoration: line-through;">${Utils.sanitizeHtml(origWord)}</span>`;
                origIdx++;
            } else {
                // Words differ - mark both as changed
                origHtml += `<span style="background-color: rgba(220, 53, 69, 0.3); color: #dc3545; text-decoration: line-through;">${Utils.sanitizeHtml(origWord)}</span>`;
                corrHtml += `<span style="background-color: rgba(40, 167, 69, 0.3); color: #28a745; font-weight: bold;">${Utils.sanitizeHtml(corrWord)}</span>`;
                origIdx++;
                corrIdx++;
            }
        }

        return { origHtml, corrHtml };
    }

    function generateDiffHtml(originalText, correctedText) {
        const originalLines = originalText.split('\n');
        const correctedLines = correctedText.split('\n');

        // Simple line diff with word-level highlighting for similar lines
        let diffHtml =
            '<div style="font-family: system-ui, -apple-system, sans-serif; font-size: 0.9rem; line-height: 1.8; background: var(--color-background-secondary); padding: 1rem; border-radius: var(--border-radius); max-height: 400px; overflow-y: auto;">';

        let originalIdx = 0;
        let correctedIdx = 0;

        while (originalIdx < originalLines.length || correctedIdx < correctedLines.length) {
            const origLine = originalIdx < originalLines.length ? originalLines[originalIdx] : null;
            const corrLine =
                correctedIdx < correctedLines.length ? correctedLines[correctedIdx] : null;

            if (origLine === corrLine) {
                // Lines are the same
                diffHtml += `<div style="padding: 0.25rem 0; color: var(--color-text-secondary);">  ${Utils.sanitizeHtml(origLine)}</div>`;
                originalIdx++;
                correctedIdx++;
            } else if (origLine && (!corrLine || correctedIdx >= correctedLines.length)) {
                // Line was removed
                diffHtml += `<div style="padding: 0.25rem 0; background-color: rgba(220, 53, 69, 0.1);">- <span style="color: #dc3545;">${Utils.sanitizeHtml(origLine)}</span></div>`;
                originalIdx++;
            } else if (corrLine && (!origLine || originalIdx >= originalLines.length)) {
                // Line was added
                diffHtml += `<div style="padding: 0.25rem 0; background-color: rgba(40, 167, 69, 0.1);">+ <span style="color: #28a745;">${Utils.sanitizeHtml(corrLine)}</span></div>`;
                correctedIdx++;
            } else if (origLine && corrLine) {
                // Lines differ - check if they're similar (word-level diff)
                const similarity =
                    origLine.split('').filter((char, i) => char === corrLine[i]).length /
                    Math.max(origLine.length, corrLine.length);

                if (similarity > 0.7) {
                    // Lines are mostly similar - do word-level diff
                    const { origHtml, corrHtml } = getWordDiff(origLine, corrLine);
                    diffHtml += `<div style="padding: 0.25rem 0; background-color: rgba(220, 53, 69, 0.1);">- <span style="color: #dc3545;">${origHtml}</span></div>`;
                    diffHtml += `<div style="padding: 0.25rem 0; background-color: rgba(40, 167, 69, 0.1);">+ <span style="color: #28a745;">${corrHtml}</span></div>`;
                } else {
                    // Lines are very different - show full lines
                    diffHtml += `<div style="padding: 0.25rem 0; background-color: rgba(220, 53, 69, 0.1);">- <span style="color: #dc3545;">${Utils.sanitizeHtml(origLine)}</span></div>`;
                    diffHtml += `<div style="padding: 0.25rem 0; background-color: rgba(40, 167, 69, 0.1);">+ <span style="color: #28a745;">${Utils.sanitizeHtml(corrLine)}</span></div>`;
                }
                originalIdx++;
                correctedIdx++;
            }
        }

        diffHtml += '</div>';
        return diffHtml;
    }

    /**
     * Generate opposing viewpoints for critical thinking
     * @param {string} noteId - Note ID
     * @param {string} content - Note content
     */
    async function generateOpposite(noteId, content) {
        if (!content.trim()) {
            alert('Note is empty. Nothing to analyze.');
            return;
        }

        if (state.isAnalyzing) {
            alert('Analysis in progress. Please wait.');
            return;
        }

        state.isAnalyzing = true;
        // eslint-disable-next-line no-undef
        NotesEditor.updateStatus('Generating opposing viewpoints...');

        // Show loading modal immediately
        const loadingModal = showLoadingModal('Generating opposing viewpoints...');

        try {
            const { provider } = await getAISettings();

            // Use neutral English for consistency, not user's language variant
            const prompt = `Consider the opposite perspective or viewpoint from the following note. Generate 2-3 brief counter-arguments that challenge the main ideas. Keep each point to 1-3 sentences - clear and straightforward. Focus on questioning assumptions and exploring alternative angles:\n\n${content}`;

            const opposite = await makeProxyApiCall(prompt, provider);

            if (!opposite || !opposite.trim()) {
                throw new Error('No viewpoints generated');
            }

            // Close loading modal and show result
            if (loadingModal) {
                loadingModal.remove();
            }
            showOppositeModal(opposite);

            // eslint-disable-next-line no-undef
            NotesEditor.updateStatus('Opposing viewpoints generated');
        } catch (error) {
            console.error('Error generating opposite viewpoints:', error);
            // eslint-disable-next-line no-undef
            NotesEditor.updateStatus('Error generating viewpoints');
            if (loadingModal) {
                loadingModal.remove();
            }
            alert(`Error: ${error.message}`);
        } finally {
            state.isAnalyzing = false;
        }
    }

    /**
     * Show opposing viewpoints modal
     */
    function showOppositeModal(opposite) {
        const modal = document.createElement('div');
        modal.className = 'ai-modal';
        modal.innerHTML = `
            <div class="ai-modal-content">
                <div class="ai-modal-header">
                    <h3>Opposing Viewpoints</h3>
                    <button class="ai-modal-close-icon" aria-label="Close">&times;</button>
                </div>
                <div class="ai-modal-body">
                    <p>${Utils.sanitizeHtml(opposite)}</p>
                </div>
                <div class="ai-modal-footer">
                    <button class="btn btn-secondary ai-modal-copy">Copy</button>
                    <button class="btn btn-primary ai-modal-insert">Insert at End</button>
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
            navigator.clipboard.writeText(opposite);
            alert('Viewpoints copied to clipboard');
        });
        insertBtn.addEventListener('click', () => {
            const textarea = document.getElementById('note-content-textarea');
            textarea.value = `${textarea.value}\n\n**Alternative Perspectives:**\n${opposite}`;
            modal.remove();
            // Trigger input event to update preview
            // eslint-disable-next-line no-undef
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }

    /**
     * Improve writing - restructure, clarify, and enhance note quality
     */
    async function improveWriting(noteId, content) {
        if (!content.trim()) {
            alert('Note is empty. Nothing to improve.');
            return;
        }

        if (state.isAnalyzing) {
            alert('Analysis in progress. Please wait.');
            return;
        }

        state.isAnalyzing = true;
        // eslint-disable-next-line no-undef
        NotesEditor.updateStatus('Improving writing...');

        // Show loading modal immediately
        const loadingModal = showLoadingModal('Improving writing...');

        try {
            const { provider, language } = await getAISettings();
            const languageInstruction =
                language && language !== 'en'
                    ? `Please respond in ${getLanguageName(language)}. `
                    : '';

            const prompt = `${languageInstruction}Improve the following note by:
1. Clarifying the main ideas and making them more concise
2. Improving structure - organize thoughts logically with clear sections if needed
3. Enhancing clarity - use more precise language
4. Adding concrete examples where helpful to illustrate key points
5. Maintaining the original voice and intent while making it more polished

Return ONLY the improved version of the note. Do not add explanations, meta-commentary, or suggestions - just provide the enhanced text directly.

ORIGINAL NOTE:
${content}`;

            const improved = await makeProxyApiCall(prompt, provider);

            if (!improved || !improved.trim()) {
                throw new Error('No improved version generated');
            }

            // Close loading modal and show result
            if (loadingModal) {
                loadingModal.remove();
            }
            showImprovedWritingModal(improved, noteId, content);

            // eslint-disable-next-line no-undef
            NotesEditor.updateStatus('Writing improved');
        } catch (error) {
            console.error('Error improving writing:', error);
            // eslint-disable-next-line no-undef
            NotesEditor.updateStatus('Error improving writing');
            if (loadingModal) {
                loadingModal.remove();
            }
            alert(`Error: ${error.message}`);
        } finally {
            state.isAnalyzing = false;
        }
    }

    /**
     * Show improved writing modal with backup capability
     */
    function showImprovedWritingModal(improved, noteId, originalText) {
        const modal = document.createElement('div');
        modal.className = 'ai-modal';
        modal.innerHTML = `
            <div class="ai-modal-content">
                <div class="ai-modal-header">
                    <h3>Improved Writing</h3>
                    <button class="ai-modal-close-icon" aria-label="Close">&times;</button>
                </div>
                <div class="ai-modal-body">
                    <p>${Utils.sanitizeHtml(improved)}</p>
                </div>
                <div class="ai-modal-footer">
                    <button class="btn btn-secondary ai-modal-copy">Copy</button>
                    <button class="btn btn-primary ai-modal-apply">Apply</button>
                    <button class="btn btn-secondary ai-modal-close">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeIconBtn = modal.querySelector('.ai-modal-close-icon');
        const closeBtn = modal.querySelector('.ai-modal-close');
        const copyBtn = modal.querySelector('.ai-modal-copy');
        const applyBtn = modal.querySelector('.ai-modal-apply');

        // Handle close buttons
        if (closeIconBtn) {
            closeIconBtn.addEventListener('click', () => modal.remove());
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.remove());
        }

        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(improved);
            alert('Improved text copied to clipboard');
        });

        applyBtn.addEventListener('click', () => {
            // Save backup first, then apply changes
            // eslint-disable-next-line no-undef
            NotesStorage.saveBackup(noteId, originalText)
                .then(() => {
                    const textarea = document.getElementById('note-content-textarea');
                    textarea.value = improved;
                    modal.remove();
                    // Trigger input event to update preview
                    // eslint-disable-next-line no-undef
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    // Show confirmation message
                    // eslint-disable-next-line no-undef
                    NotesEditor.updateStatus(
                        'Changes applied. Backup saved - you can restore from backup if needed.'
                    );
                    // Update backup button visibility to show the newly created backup
                    // eslint-disable-next-line no-undef
                    NotesEditor.updateBackupButtonVisibility(noteId);
                })
                .catch(error => {
                    console.error('Error saving backup:', error);
                    // Still apply changes even if backup fails
                    const textarea = document.getElementById('note-content-textarea');
                    textarea.value = improved;
                    modal.remove();
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    alert('Warning: Changes applied but backup could not be saved.');
                });
        });
    }

    /**
     * Public API
     */
    return {
        generateTLDR,
        checkGrammar,
        generateOpposite,
        improveWriting
    };
})();

// Hook up AI dropdown menu to notes editor
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const optionsBtn = document.getElementById('note-ai-options-btn');
        const dropdownMenu = document.getElementById('note-ai-dropdown-menu');

        if (optionsBtn && dropdownMenu) {
            // Toggle dropdown visibility
            optionsBtn.addEventListener('click', e => {
                e.stopPropagation();
                const isVisible = dropdownMenu.style.display !== 'none';
                dropdownMenu.style.display = isVisible ? 'none' : 'block';
            });

            // Handle dropdown item clicks
            const dropdownItems = dropdownMenu.querySelectorAll('.ai-dropdown-item');
            dropdownItems.forEach(item => {
                item.addEventListener('click', e => {
                    e.stopPropagation();
                    const action = item.getAttribute('data-action');
                    // eslint-disable-next-line no-undef
                    const noteId = NotesEditor.getCurrentNoteId();
                    const content = document.getElementById('note-content-textarea').value;

                    if (!noteId || !content) {
                        alert('Please create a note first.');
                        return;
                    }

                    // Execute the selected action
                    switch (action) {
                        case 'grammar':
                            // eslint-disable-next-line no-undef
                            NotesAI.checkGrammar(noteId, content);
                            break;
                        case 'tldr':
                            // eslint-disable-next-line no-undef
                            NotesAI.generateTLDR(noteId, content);
                            break;
                        case 'opposite':
                            // eslint-disable-next-line no-undef
                            NotesAI.generateOpposite(noteId, content);
                            break;
                        case 'improve':
                            // eslint-disable-next-line no-undef
                            NotesAI.improveWriting(noteId, content);
                            break;
                    }

                    // Close dropdown after selection
                    dropdownMenu.style.display = 'none';
                });
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', e => {
                if (
                    !e.target.closest('#note-ai-options-btn') &&
                    !e.target.closest('#note-ai-dropdown-menu')
                ) {
                    dropdownMenu.style.display = 'none';
                }
            });
        }
    }, 100);
});
