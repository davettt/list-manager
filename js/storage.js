// ===================================
// Filesystem Storage Wrapper
// Replaces localStorage with persistent filesystem storage
// ===================================

const Storage = (function () {
    'use strict';

    const CURRENT_VERSION = '1.0.0';

    /**
     * Default settings object
     */
    const DEFAULT_SETTINGS = {
        display: {
            view: 'grid',
            theme: 'light',
            itemsPerPage: 20
        },
        ai: {
            enabled: false,
            autoSuggest: false,
            provider: 'claude',
            model: '',
            language: 'en'
        },
        version: CURRENT_VERSION
    };

    /**
     * Initialize storage with defaults if needed
     */
    async function initStorage() {
        try {
            // Fetch current settings - server will return defaults if file doesn't exist
            const settings = await getSettings();

            // Ensure settings are saved
            if (!settings || !settings.version) {
                await saveSettings(DEFAULT_SETTINGS);
            }

            // Fetch lists - server will return [] if file doesn't exist
            const lists = await getLists();
            if (!lists) {
                await saveLists([]);
            }

            return true;
        } catch (error) {
            console.error('Storage initialization failed:', error);
            return false;
        }
    }

    /**
     * Check if storage is available (server is running)
     * @returns {Promise<boolean>} True if available
     */
    async function isStorageAvailable() {
        try {
            const response = await fetch('/api/health');
            return response.ok;
        } catch (_e) {
            return false;
        }
    }

    /**
     * Get all lists from storage
     * @returns {Promise<Array>} Array of list objects
     */
    async function getLists() {
        try {
            const response = await fetch('/api/data/lists');
            if (!response.ok) {
                throw new Error('Failed to fetch lists');
            }
            return await response.json();
        } catch (error) {
            console.error('Error getting lists:', error);
            return [];
        }
    }

    /**
     * Save all lists to storage
     * @param {Array} lists - Array of list objects
     * @returns {Promise<boolean>} Success status
     */
    async function saveLists(lists) {
        try {
            const response = await fetch('/api/data/lists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lists)
            });

            if (!response.ok) {
                throw new Error('Failed to save lists');
            }

            return true;
        } catch (error) {
            console.error('Error saving lists:', error);
            throw error;
        }
    }

    /**
     * Get a single list by ID
     * @param {string} id - List ID
     * @returns {Promise<Object|null>} List object or null
     */
    async function getListById(id) {
        const lists = await getLists();
        return lists.find(list => list.id === id) || null;
    }

    /**
     * Add a new list
     * @param {Object} list - List object
     * @returns {Promise<boolean>} Success status
     */
    async function addList(list) {
        try {
            const lists = await getLists();
            lists.push(list);
            return await saveLists(lists);
        } catch (error) {
            console.error('Error adding list:', error);
            throw error;
        }
    }

    /**
     * Update an existing list
     * @param {string} id - List ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<boolean>} Success status
     */
    async function updateList(id, updates) {
        try {
            const lists = await getLists();
            const index = lists.findIndex(list => list.id === id);

            if (index === -1) {
                throw new Error('List not found');
            }

            // Properly merge metadata
            const updatedMetadata = {
                ...lists[index].metadata,
                ...(updates.metadata || {}),
                modified: new Date().toISOString()
            };

            // Remove metadata from updates to avoid overwriting
            const { metadata: _metadata, ...otherUpdates } = updates;

            lists[index] = {
                ...lists[index],
                ...otherUpdates,
                metadata: updatedMetadata
            };

            return await saveLists(lists);
        } catch (error) {
            console.error('Error updating list:', error);
            throw error;
        }
    }

    /**
     * Delete a list
     * @param {string} id - List ID
     * @returns {Promise<boolean>} Success status
     */
    async function deleteList(id) {
        try {
            // Call server DELETE endpoint (moves to trash)
            const response = await fetch(`/api/data/lists/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete list');
            }

            return true;
        } catch (error) {
            console.error('Error deleting list:', error);
            return false;
        }
    }

    /**
     * Get settings from storage
     * @returns {Promise<Object>} Settings object
     */
    async function getSettings() {
        try {
            const response = await fetch('/api/data/settings');
            if (!response.ok) {
                throw new Error('Failed to fetch settings');
            }

            const settings = await response.json();

            // Merge with defaults to ensure all keys exist
            return {
                ...DEFAULT_SETTINGS,
                ...settings,
                display: {
                    ...DEFAULT_SETTINGS.display,
                    ...(settings.display || {})
                },
                ai: {
                    ...DEFAULT_SETTINGS.ai,
                    ...(settings.ai || {})
                }
            };
        } catch (error) {
            console.error('Error getting settings:', error);
            return DEFAULT_SETTINGS;
        }
    }

    /**
     * Save settings to storage
     * @param {Object} settings - Settings object
     * @returns {Promise<boolean>} Success status
     */
    async function saveSettings(settings) {
        try {
            const response = await fetch('/api/data/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            if (!response.ok) {
                throw new Error('Failed to save settings');
            }

            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }

    /**
     * Update specific setting
     * @param {string} key - Setting key (e.g., 'ai.enabled', 'display.theme')
     * @param {*} value - New value
     * @returns {Promise<boolean>} Success status
     */
    async function updateSetting(key, value) {
        try {
            const settings = await getSettings();

            // Handle nested keys (e.g., 'display.theme')
            const keys = key.split('.');
            let obj = settings;

            for (let i = 0; i < keys.length - 1; i++) {
                if (!obj[keys[i]]) {
                    obj[keys[i]] = {};
                }
                obj = obj[keys[i]];
            }

            obj[keys[keys.length - 1]] = value;

            return await saveSettings(settings);
        } catch (error) {
            console.error('Error updating setting:', error);
            return false;
        }
    }

    /**
     * Get API configuration (checks if key exists without exposing it)
     * @returns {Promise<Object>} API config (hasKey, provider, model)
     */
    async function getApiConfig() {
        try {
            const response = await fetch('/api/data/api-config');
            if (!response.ok) {
                throw new Error('Failed to fetch API config');
            }
            return await response.json();
        } catch (error) {
            console.error('Error getting API config:', error);
            return { hasKey: false, provider: 'claude', model: '' };
        }
    }

    /**
     * Save API key to .env.local
     * @param {string} provider - Provider name
     * @param {string} apiKey - API key
     * @param {string} model - Model name (optional)
     * @returns {Promise<boolean>} Success status
     */
    async function saveApiKey(provider, apiKey, model = '') {
        try {
            const response = await fetch('/api/data/api-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, apiKey, model })
            });

            if (!response.ok) {
                throw new Error('Failed to save API key');
            }

            return true;
        } catch (error) {
            console.error('Error saving API key:', error);
            throw error;
        }
    }

    /**
     * Export all data
     * @returns {Promise<Object>} All data for export
     */
    async function exportData() {
        const lists = await getLists();
        const settings = await getSettings();

        // Fetch notes with full content
        let notes = [];
        try {
            const response = await fetch('/api/data/notes/export');
            if (response.ok) {
                notes = await response.json();
            }
        } catch (error) {
            console.error('Error fetching notes for export:', error);
        }

        return {
            version: CURRENT_VERSION,
            exportDate: new Date().toISOString(),
            lists: lists,
            notes: notes,
            settings: settings
        };
    }

    /**
     * Import data - ADDS to existing data (does not replace)
     * @param {Object} data - Data to import
     * @returns {Promise<Object>} Result with success status and message
     */
    async function importData(data) {
        try {
            // Validate structure
            if (!data || typeof data !== 'object') {
                return { success: false, message: 'Invalid data format' };
            }

            const hasLists = Array.isArray(data.lists);
            const hasNotes = Array.isArray(data.notes);

            if (!hasLists && !hasNotes) {
                return { success: false, message: 'No lists or notes found in import file' };
            }

            let listsImported = 0;
            let notesImported = 0;

            // Import lists if present - APPEND to existing with new IDs
            if (hasLists && data.lists.length > 0) {
                // Validate each list has required fields
                for (const list of data.lists) {
                    if (!list.name || !Array.isArray(list.items)) {
                        return { success: false, message: 'Invalid list structure' };
                    }
                }

                // Get existing lists
                const existingLists = await getLists();

                // Add each imported list with a new ID to avoid conflicts
                for (const list of data.lists) {
                    const newList = {
                        ...list,
                        id: crypto.randomUUID(), // Generate new ID
                        items: list.items.map(item => ({
                            ...item,
                            id: crypto.randomUUID() // New IDs for items too
                        })),
                        metadata: {
                            ...list.metadata,
                            created: list.metadata?.created || new Date().toISOString(),
                            modified: new Date().toISOString()
                        }
                    };
                    existingLists.push(newList);
                    listsImported++;
                }

                await saveLists(existingLists);
            }

            // Import notes if present - APPEND to existing (server handles new IDs)
            if (hasNotes && data.notes.length > 0) {
                const response = await fetch('/api/data/notes/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notes: data.notes })
                });

                if (response.ok) {
                    const result = await response.json();
                    notesImported = result.count || data.notes.length;
                }
            }

            // Import settings if provided - merge with existing
            if (data.settings && typeof data.settings === 'object') {
                const currentSettings = await getSettings();
                const mergedSettings = {
                    ...currentSettings,
                    ...data.settings
                };
                await saveSettings(mergedSettings);
            }

            // Build success message
            const parts = [];
            if (listsImported > 0) {
                parts.push(`${listsImported} list(s)`);
            }
            if (notesImported > 0) {
                parts.push(`${notesImported} note(s)`);
            }

            return {
                success: true,
                message: `Successfully added ${parts.join(' and ')} to existing data`
            };
        } catch (error) {
            console.error('Error importing data:', error);
            return {
                success: false,
                message: 'Import failed: ' + error.message
            };
        }
    }

    /**
     * Clear all data (lists, notes, and settings)
     * @returns {Promise<boolean>} Success status
     */
    async function clearAllData() {
        try {
            // Clear lists
            await saveLists([]);

            // Clear notes
            await fetch('/api/data/notes', { method: 'DELETE' });

            // Reset settings to defaults
            await saveSettings(DEFAULT_SETTINGS);

            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    }

    /**
     * Get storage usage info
     * @returns {Promise<Object>} Storage usage info
     */
    async function getStorageInfo() {
        try {
            const lists = await getLists();

            return {
                listCount: lists.length,
                totalItems: lists.reduce((sum, list) => sum + (list.items?.length || 0), 0),
                storageType: 'filesystem'
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return {
                listCount: 0,
                totalItems: 0,
                storageType: 'filesystem'
            };
        }
    }

    /**
     * Get all valid categories
     * @returns {Promise<Array>} Array of category names
     */
    async function getCategories() {
        try {
            const response = await fetch('/api/data/categories');
            if (!response.ok) {
                throw new Error('Failed to fetch categories');
            }
            return await response.json();
        } catch (error) {
            console.error('Error getting categories:', error);
            return [];
        }
    }

    /**
     * Add a new category
     * @param {string} name - Category name
     * @returns {Promise<Object>} Response with success status and updated categories
     */
    async function addCategory(name) {
        try {
            const response = await fetch('/api/data/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add category');
            }

            return await response.json();
        } catch (error) {
            console.error('Error adding category:', error);
            throw error;
        }
    }

    /**
     * Delete a category
     * @param {string} name - Category name
     * @returns {Promise<Object>} Response with success status
     */
    async function deleteCategory(name) {
        try {
            // URL-encode to handle "/" in subcategory paths (e.g., "work/projects")
            const response = await fetch(`/api/data/categories/${encodeURIComponent(name)}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete category');
            }

            return await response.json();
        } catch (error) {
            console.error('Error deleting category:', error);
            throw error;
        }
    }

    /**
     * Get all trashed items
     * @returns {Promise<Array>} Array of trashed items with time remaining
     */
    async function getTrash() {
        try {
            const response = await fetch('/api/data/trash');
            if (!response.ok) {
                throw new Error('Failed to fetch trash');
            }
            return await response.json();
        } catch (error) {
            console.error('Error getting trash:', error);
            return [];
        }
    }

    /**
     * Restore item from trash
     * @param {string} type - 'list' or 'note'
     * @param {string} id - Item ID
     * @returns {Promise<boolean>} Success status
     */
    async function restoreFromTrash(type, id) {
        try {
            const response = await fetch(`/api/data/trash/${type}/${id}/restore`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to restore from trash');
            }

            return true;
        } catch (error) {
            console.error('Error restoring from trash:', error);
            return false;
        }
    }

    /**
     * Permanently delete item from trash
     * @param {string} type - 'list' or 'note'
     * @param {string} id - Item ID
     * @returns {Promise<boolean>} Success status
     */
    async function permanentlyDeleteFromTrash(type, id) {
        try {
            const response = await fetch(`/api/data/trash/${type}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to permanently delete from trash');
            }

            return true;
        } catch (error) {
            console.error('Error permanently deleting from trash:', error);
            return false;
        }
    }

    // Expose public API
    return {
        initStorage,
        isStorageAvailable,
        getLists,
        saveLists,
        getListById,
        addList,
        updateList,
        deleteList,
        getSettings,
        saveSettings,
        updateSetting,
        getApiConfig,
        saveApiKey,
        exportData,
        importData,
        clearAllData,
        getStorageInfo,
        getCategories,
        addCategory,
        deleteCategory,
        getTrash,
        restoreFromTrash,
        permanentlyDeleteFromTrash
    };
})();

// Expose to global scope
window.Storage = Storage;
