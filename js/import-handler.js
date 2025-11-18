// ===================================
// Import Handler - Smart File Detection
// Handles both JSON backups and text file imports
// ===================================

const ImportHandler = (function () {
    'use strict';

    /**
     * Detect file type and read accordingly
     * @param {File} file - File to read
     * @returns {Promise<Object>} { type: 'json'|'text', data: Object|string }
     */
    async function detectAndReadFile(file) {
        const mimeType = file.type;
        const filename = file.name.toLowerCase();

        // Determine file type
        let fileType = 'text'; // default

        if (mimeType === 'application/json' || filename.endsWith('.json')) {
            fileType = 'json';
        } else if (
            mimeType === 'text/plain' ||
            mimeType === 'text/markdown' ||
            filename.endsWith('.txt') ||
            filename.endsWith('.md')
        ) {
            fileType = 'text';
        }

        // Read file content
        const content = await readFileAsText(file);

        // Try to parse as JSON first if extension is ambiguous
        if (fileType === 'text') {
            try {
                const jsonData = JSON.parse(content);
                // Check if it looks like our export format
                if (jsonData.lists && Array.isArray(jsonData.lists)) {
                    return { type: 'json', data: jsonData };
                }
            } catch (e) {
                // Not JSON, treat as text
            }
        }

        if (fileType === 'json') {
            try {
                const jsonData = JSON.parse(content);
                return { type: 'json', data: jsonData };
            } catch (error) {
                throw new Error('Invalid JSON file: ' + error.message);
            }
        }

        return { type: 'text', data: content };
    }

    /**
     * Read file as text
     * @param {File} file - File to read
     * @returns {Promise<string>} File content
     */
    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Parse text content into list items
     * Supports multiple formats:
     * - One item per line
     * - Separated by blank lines (multiline items)
     * @param {string} text - Text content
     * @returns {string[]} Array of item texts
     */
    function parseTextContent(text) {
        if (!text || !text.trim()) {
            return [];
        }

        // Check if content has blank line separators (multiline items)
        const hasBlankLineSeparators = text.includes('\n\n');

        if (hasBlankLineSeparators) {
            // Split by blank lines, treating each block as an item
            return text
                .split(/\n\s*\n/)
                .map(item => item.trim())
                .filter(item => item.length > 0);
        } else {
            // Split by newlines, each line is an item
            return text
                .split('\n')
                .map(item => item.trim())
                .filter(item => item.length > 0);
        }
    }

    /**
     * Convert parsed text to list JSON structure
     * @param {string[]} items - Array of item texts
     * @param {Object} config - Import configuration
     * @returns {Object} List object in correct format
     */
    function convertTextToList(items, config) {
        const now = Utils.getCurrentTimestamp();
        const listItems = items.map(text => ({
            id: Utils.generateId(),
            text: text,
            completed: false,
            notes: '',
            addedDate: now,
            source: 'import'
        }));

        return {
            id: Utils.generateId(),
            name: config.listName || 'Imported List',
            category: config.category || 'personal',
            tags: config.tags ? Utils.parseTags(config.tags) : [],
            priority: config.priority || 'none',
            deadline: config.deadline || null,
            favorite: false,
            items: listItems,
            metadata: {
                created: now,
                modified: now,
                itemCount: listItems.length,
                completedCount: 0
            }
        };
    }

    /**
     * Generate preview of imported items
     * @param {string[]} items - Array of item texts
     * @param {number} maxPreview - Maximum items to show in preview
     * @returns {Object} { preview: string[], total: number, truncated: boolean }
     */
    function generatePreview(items, maxPreview = 5) {
        return {
            preview: items.slice(0, maxPreview),
            total: items.length,
            truncated: items.length > maxPreview
        };
    }

    // Expose public API
    return {
        detectAndReadFile,
        parseTextContent,
        convertTextToList,
        generatePreview
    };
})();

// Expose to global scope
window.ImportHandler = ImportHandler;
