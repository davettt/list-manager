// ===================================
// General Utility Functions
// ===================================

const Utils = (function () {
    'use strict';

    /**
     * Generate a UUID v4
     * @returns {string} UUID string
     */
    function generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    /**
     * Get current ISO timestamp
     * @returns {string} ISO timestamp
     */
    function getCurrentTimestamp() {
        return new Date().toISOString();
    }

    /**
     * Format ISO timestamp to readable date
     * @param {string} isoString - ISO timestamp
     * @returns {string} Formatted date
     */
    function formatDate(isoString) {
        if (!isoString) {
            return '';
        }

        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        // Just now
        if (diffMins < 1) {
            return 'Just now';
        }

        // Minutes ago
        if (diffMins < 60) {
            return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        }

        // Hours ago
        if (diffHours < 24) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        }

        // Days ago
        if (diffDays < 7) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        }

        // Formatted date
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }

    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    function truncate(text, maxLength = 50) {
        if (!text || text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    function debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Parse tags from comma-separated string
     * @param {string} tagsString - Comma-separated tags
     * @returns {string[]} Array of trimmed tags
     */
    function parseTags(tagsString) {
        if (!tagsString) {
            return [];
        }
        return tagsString
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
    }

    /**
     * Format tags array to comma-separated string
     * @param {string[]} tagsArray - Array of tags
     * @returns {string} Comma-separated tags
     */
    function formatTags(tagsArray) {
        if (!tagsArray || !Array.isArray(tagsArray)) {
            return '';
        }
        return tagsArray.join(', ');
    }

    /**
     * Sanitize HTML to prevent XSS
     * @param {string} text - Text to sanitize
     * @returns {string} Sanitized text
     */
    function sanitizeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Deep clone an object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Check if object is empty
     * @param {Object} obj - Object to check
     * @returns {boolean} True if empty
     */
    function isEmpty(obj) {
        return Object.keys(obj).length === 0;
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid
     */
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    /**
     * Download data as JSON file
     * @param {Object} data - Data to download
     * @param {string} filename - Filename
     */
    function downloadJson(data, filename = 'data.json') {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Read JSON file
     * @param {File} file - File to read
     * @returns {Promise<Object>} Parsed JSON data
     */
    function readJsonFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                try {
                    const data = JSON.parse(e.target.result);
                    resolve(data);
                } catch (error) {
                    reject(new Error('Invalid JSON file'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Sort array of objects by key
     * @param {Array} array - Array to sort
     * @param {string} key - Key to sort by (supports nested like 'metadata.modified')
     * @param {string} order - 'asc' or 'desc'
     * @returns {Array} Sorted array
     */
    function sortBy(array, key, order = 'asc') {
        return [...array].sort((a, b) => {
            // Handle nested keys like 'metadata.modified'
            const aVal = key.split('.').reduce((obj, k) => obj?.[k], a);
            const bVal = key.split('.').reduce((obj, k) => obj?.[k], b);

            if (aVal < bVal) {
                return order === 'asc' ? -1 : 1;
            }
            if (aVal > bVal) {
                return order === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    /**
     * Filter array by search query
     * @param {Array} array - Array to filter
     * @param {string} query - Search query
     * @param {string[]} keys - Keys to search in
     * @returns {Array} Filtered array
     */
    function searchFilter(array, query, keys) {
        if (!query || !query.trim()) {
            return array;
        }

        const lowerQuery = query.toLowerCase().trim();

        return array.filter(item => {
            return keys.some(key => {
                const value = item[key];
                if (Array.isArray(value)) {
                    // Special handling for items array (array of objects with 'text' property)
                    if (key === 'items' && value.length > 0 && typeof value[0] === 'object') {
                        return value.some(
                            v => v.text && String(v.text).toLowerCase().includes(lowerQuery)
                        );
                    }
                    // Regular array of strings
                    return value.some(v => String(v).toLowerCase().includes(lowerQuery));
                }
                return String(value).toLowerCase().includes(lowerQuery);
            });
        });
    }

    /**
     * Get unique values from array
     * @param {Array} array - Array
     * @returns {Array} Unique values
     */
    function unique(array) {
        return [...new Set(array)];
    }

    /**
     * Capitalize first letter of string
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    function capitalize(str) {
        if (!str) {
            return '';
        }
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Encode string to Base64
     * @param {string} str - String to encode
     * @returns {string} Base64 encoded string
     */
    function encodeBase64(str) {
        return btoa(str);
    }

    /**
     * Decode Base64 string
     * @param {string} str - Base64 string to decode
     * @returns {string} Decoded string
     */
    function decodeBase64(str) {
        try {
            return atob(str);
        } catch (e) {
            return '';
        }
    }

    /**
     * Check if date is past
     * @param {string} dateString - Date string
     * @returns {boolean} True if past
     */
    function isPastDate(dateString) {
        if (!dateString) {
            return false;
        }
        const date = new Date(dateString);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return date < now;
    }

    /**
     * Get days until date
     * @param {string} dateString - Date string
     * @returns {number} Days until date (negative if past)
     */
    function getDaysUntil(dateString) {
        if (!dateString) {
            return null;
        }
        const date = new Date(dateString);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
        const diffMs = date - now;
        return Math.ceil(diffMs / 86400000);
    }

    // Expose public API
    return {
        generateId,
        getCurrentTimestamp,
        formatDate,
        truncate,
        debounce,
        parseTags,
        formatTags,
        sanitizeHtml,
        deepClone,
        isEmpty,
        isValidEmail,
        downloadJson,
        readJsonFile,
        sortBy,
        searchFilter,
        unique,
        capitalize,
        encodeBase64,
        decodeBase64,
        isPastDate,
        getDaysUntil
    };
})();

// Expose to global scope
window.Utils = Utils;
