// ===================================
// AI API Integration (Multi-Provider)
// Supports: Claude (Anthropic), ChatGPT (OpenAI), Gemini (Google)
// ===================================

const ClaudeAPI = (function () {
    'use strict';

    // Use proxy when running on localhost dev server, direct API otherwise
    const isLocalDev =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // Provider configurations
    const PROVIDERS = {
        claude: {
            name: 'Claude (Anthropic)',
            endpoint: isLocalDev
                ? '/api/ai?provider=claude'
                : 'https://api.anthropic.com/v1/messages',
            defaultModel: 'claude-sonnet-4-20250514',
            maxTokens: 1000,
            apiVersion: '2023-06-01'
        },
        openai: {
            name: 'ChatGPT (OpenAI)',
            endpoint: isLocalDev
                ? '/api/ai?provider=openai'
                : 'https://api.openai.com/v1/chat/completions',
            defaultModel: 'gpt-4-turbo-preview',
            maxTokens: 1000
        },
        gemini: {
            name: 'Gemini (Google)',
            endpoint: isLocalDev
                ? '/api/ai?provider=gemini'
                : 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
            defaultModel: 'gemini-pro',
            maxTokens: 1000
        }
    };

    /**
     * Make a request to AI API (supports multiple providers)
     * @param {string} apiKey - API key
     * @param {string} prompt - User prompt
     * @param {string} systemPrompt - System prompt
     * @param {string} provider - Provider name (claude, openai, gemini)
     * @param {string} model - Model name (optional, uses default if empty)
     * @returns {Promise<string>} API response text
     */
    async function makeApiRequest(
        apiKey,
        prompt,
        systemPrompt = '',
        provider = 'claude',
        model = ''
    ) {
        try {
            const config = PROVIDERS[provider];
            if (!config) {
                throw new Error(`Unknown provider: ${provider}`);
            }

            const selectedModel = model || config.defaultModel;
            const endpoint = config.endpoint;

            console.log('Making API request to:', provider);
            console.log('Using model:', selectedModel);
            console.log('Using proxy:', isLocalDev);

            // Format request based on provider
            let requestBody;
            const headers = { 'Content-Type': 'application/json' };

            if (provider === 'claude') {
                requestBody = {
                    model: selectedModel,
                    max_tokens: config.maxTokens,
                    messages: [{ role: 'user', content: prompt }]
                };
                if (systemPrompt) {
                    requestBody.system = systemPrompt;
                }
                if (!isLocalDev) {
                    headers['x-api-key'] = apiKey;
                    headers['anthropic-version'] = config.apiVersion;
                }
            } else if (provider === 'openai') {
                const messages = [];
                if (systemPrompt) {
                    messages.push({ role: 'system', content: systemPrompt });
                }
                messages.push({ role: 'user', content: prompt });

                requestBody = {
                    model: selectedModel,
                    max_tokens: config.maxTokens,
                    messages: messages
                };
                if (!isLocalDev) {
                    headers['Authorization'] = `Bearer ${apiKey}`;
                }
            } else if (provider === 'gemini') {
                const parts = [];
                if (systemPrompt) {
                    parts.push({ text: `${systemPrompt}\n\n${prompt}` });
                } else {
                    parts.push({ text: prompt });
                }

                requestBody = {
                    contents: [{ parts }],
                    generationConfig: {
                        maxOutputTokens: config.maxTokens
                    }
                };
                // Gemini uses API key in URL parameter when not using proxy
                if (!isLocalDev) {
                    // API key will be added to URL
                }
            }

            // When using proxy, server reads API key/provider from environment
            // Direct API calls include credentials in headers
            const fetchOptions = isLocalDev
                ? {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(requestBody)
                  }
                : {
                      method: 'POST',
                      headers,
                      body: JSON.stringify(requestBody)
                  };

            // For Gemini direct API, add key to URL
            let fetchUrl = endpoint;
            if (provider === 'gemini' && !isLocalDev) {
                fetchUrl += `?key=${apiKey}`;
            }

            const response = await fetch(fetchUrl, fetchOptions);

            console.log('API response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('API error response:', errorData);
                throw new ApiError(
                    response.status,
                    errorData.error?.message || 'API request failed'
                );
            }

            const data = await response.json();
            console.log('API response data:', data);

            // Parse response based on provider format
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
        } catch (error) {
            console.error('API request error:', error);
            if (error instanceof ApiError) {
                throw error;
            }
            // Check for CORS error
            if (
                error.message &&
                (error.message.includes('CORS') || error.message.includes('Failed to fetch'))
            ) {
                throw new ApiError(
                    0,
                    'AI features require the development server. Run: npm install && npm run dev'
                );
            }
            throw new ApiError(0, error.message || 'Network error');
        }
    }

    /**
     * Custom API Error class
     */
    class ApiError extends Error {
        constructor(status, message) {
            super(message);
            this.name = 'ApiError';
            this.status = status;
        }

        getUserMessage() {
            switch (this.status) {
                case 401:
                    return 'Invalid API key. Please check your settings.';
                case 429:
                    return 'Rate limit exceeded. Please try again later.';
                case 529:
                    return 'Claude is temporarily overloaded. Please try again.';
                default:
                    return `AI unavailable: ${this.message}`;
            }
        }
    }

    /**
     * Test API connection
     * @param {string} apiKey - API key
     * @param {string} provider - Provider name (claude, openai, gemini)
     * @param {string} model - Model name (optional)
     * @returns {Promise<Object>} Test result
     */
    async function testConnection(apiKey, provider = 'claude', model = '') {
        try {
            if (!apiKey || !apiKey.trim()) {
                return {
                    success: false,
                    message: 'API key is required'
                };
            }

            const prompt = 'Respond with just the word "OK"';
            const _response = await makeApiRequest(apiKey, prompt, '', provider, model);

            return {
                success: true,
                message: 'Connection successful!'
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof ApiError ? error.getUserMessage() : error.message
            };
        }
    }

    /**
     * Generate list item suggestions
     * @param {string} apiKey - API key
     * @param {Object} listData - List data (name, category, tags, existing items)
     * @param {string} provider - Provider name (claude, openai, gemini)
     * @param {string} model - Model name (optional)
     * @returns {Promise<Array>} Array of suggestion strings
     */
    async function generateListSuggestions(apiKey, listData, provider = 'claude', model = '') {
        try {
            const { name, category, tags, items } = listData;

            const existingItems =
                items && items.length > 0 ? items.map(item => item.text).join(', ') : 'none yet';

            const systemPrompt =
                'You are a helpful assistant that generates relevant list items. Always respond with valid JSON array of strings only, no markdown formatting.';

            const prompt = `Generate 5-10 relevant items for a list with these details:

List Name: ${name}
Category: ${category || 'not specified'}
Tags: ${tags && tags.length > 0 ? tags.join(', ') : 'none'}
Existing Items: ${existingItems}

Requirements:
- Generate items that are relevant to the list name and context
- Avoid duplicating existing items
- Keep items concise and actionable
- Return ONLY a JSON array of strings, no markdown, no explanation

Example format: ["Item 1", "Item 2", "Item 3"]`;

            const response = await makeApiRequest(apiKey, prompt, systemPrompt, provider, model);

            // Parse JSON from response
            const suggestions = parseJsonResponse(response);

            if (!Array.isArray(suggestions)) {
                throw new Error('Invalid suggestions format');
            }

            return suggestions.slice(0, 10); // Limit to 10 suggestions
        } catch (error) {
            throw error instanceof ApiError ? error : new Error('Failed to generate suggestions');
        }
    }

    /**
     * Expand a vague item into specific alternatives
     * @param {string} apiKey - API key
     * @param {string} itemText - Vague item text
     * @param {string} listContext - Context from list name/category
     * @param {string} provider - Provider name (claude, openai, gemini)
     * @param {string} model - Model name (optional)
     * @returns {Promise<Array>} Array of specific alternatives
     */
    async function expandItem(apiKey, itemText, listContext = '', provider = 'claude', model = '') {
        try {
            const systemPrompt =
                'You are a helpful assistant that expands vague tasks into specific, actionable items. Always respond with valid JSON array of strings only, no markdown formatting.';

            const contextInfo = listContext ? `\nList context: ${listContext}` : '';

            const prompt = `Expand this vague item into 3-5 specific, actionable alternatives:

Item: ${itemText}${contextInfo}

Requirements:
- Make items specific and actionable
- Keep them concise
- Return ONLY a JSON array of strings, no markdown, no explanation

Example format: ["Specific item 1", "Specific item 2", "Specific item 3"]`;

            const response = await makeApiRequest(apiKey, prompt, systemPrompt, provider, model);

            // Parse JSON from response
            const alternatives = parseJsonResponse(response);

            if (!Array.isArray(alternatives)) {
                throw new Error('Invalid alternatives format');
            }

            return alternatives.slice(0, 5); // Limit to 5 alternatives
        } catch (error) {
            throw error instanceof ApiError ? error : new Error('Failed to expand item');
        }
    }

    /**
     * Suggest category and tags for a list
     * @param {string} apiKey - API key
     * @param {string} listName - List name
     * @param {Array} items - List items
     * @param {string} provider - Provider name (claude, openai, gemini)
     * @param {string} model - Model name (optional)
     * @returns {Promise<Object>} Suggested category and tags
     */
    async function suggestCategorization(
        apiKey,
        listName,
        items = [],
        provider = 'claude',
        model = ''
    ) {
        try {
            const systemPrompt =
                'You are a helpful assistant that categorizes lists. Always respond with valid JSON only, no markdown formatting.';

            const itemsText =
                items.length > 0 ? items.map(item => item.text).join(', ') : 'no items yet';

            const prompt = `Suggest a category and 3 relevant tags for this list:

List Name: ${listName}
Items: ${itemsText}

Available categories: personal, work, travel, shopping, projects, food, health, other

Requirements:
- Choose the most appropriate category
- Suggest 3 relevant tags (lowercase, no spaces)
- Return ONLY a JSON object with this exact format, no markdown, no explanation:

{"category": "category_name", "tags": ["tag1", "tag2", "tag3"]}`;

            const response = await makeApiRequest(apiKey, prompt, systemPrompt, provider, model);

            // Parse JSON from response
            const categorization = parseJsonResponse(response);

            if (!categorization.category || !Array.isArray(categorization.tags)) {
                throw new Error('Invalid categorization format');
            }

            return {
                category: categorization.category,
                tags: categorization.tags.slice(0, 3)
            };
        } catch (error) {
            throw error instanceof ApiError ? error : new Error('Failed to suggest categorization');
        }
    }

    /**
     * Parse JSON from API response (handles markdown code blocks)
     * @param {string} response - API response text
     * @returns {*} Parsed JSON
     */
    function parseJsonResponse(response) {
        try {
            // Try direct parse first
            return JSON.parse(response);
        } catch (e) {
            // Try to extract JSON from markdown code block
            const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[1]);
            }

            // Try to extract JSON array or object
            const arrayMatch = response.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                return JSON.parse(arrayMatch[0]);
            }

            const objectMatch = response.match(/\{[\s\S]*\}/);
            if (objectMatch) {
                return JSON.parse(objectMatch[0]);
            }

            throw new Error('No valid JSON found in response');
        }
    }

    /**
     * Get user-friendly error message
     * @param {Error} error - Error object
     * @returns {string} User-friendly message
     */
    function getErrorMessage(error) {
        if (error instanceof ApiError) {
            return error.getUserMessage();
        }
        return error.message || 'An unknown error occurred';
    }

    /**
     * Get available AI providers
     * @returns {Object} Provider configurations
     */
    function getProviders() {
        return Object.keys(PROVIDERS).map(key => ({
            id: key,
            name: PROVIDERS[key].name,
            defaultModel: PROVIDERS[key].defaultModel
        }));
    }

    // Expose public API
    return {
        testConnection,
        generateListSuggestions,
        expandItem,
        suggestCategorization,
        getErrorMessage,
        getProviders,
        ApiError
    };
})();

// Expose to global scope
window.ClaudeAPI = ClaudeAPI;
