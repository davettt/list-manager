/**
 * Notes Storage API Client
 * Handles all API calls for notes CRUD operations
 */

// eslint-disable-next-line no-unused-vars
const NotesStorage = (() => {
    const API_BASE = '/api/data';

    return {
        /**
         * Get all notes metadata
         */
        async getAllNotes() {
            try {
                const response = await fetch(`${API_BASE}/notes`);
                if (!response.ok) {
                    throw new Error('Failed to fetch notes');
                }
                return await response.json();
            } catch (error) {
                console.error('Error fetching notes:', error);
                throw error;
            }
        },

        /**
         * Create a new note
         * @param {string} title - Note title
         * @param {string} category - Note category
         * @param {array} tags - Note tags
         */
        async createNote(title, category = 'personal', tags = []) {
            try {
                const response = await fetch(`${API_BASE}/notes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, category, tags })
                });
                if (!response.ok) {
                    throw new Error('Failed to create note');
                }
                return await response.json();
            } catch (error) {
                console.error('Error creating note:', error);
                throw error;
            }
        },

        /**
         * Get a single note with content
         * @param {string} id - Note ID
         */
        async getNote(id) {
            try {
                const response = await fetch(`${API_BASE}/notes/${id}`);
                if (!response.ok) {
                    throw new Error('Note not found');
                }
                return await response.json();
            } catch (error) {
                console.error('Error fetching note:', error);
                throw error;
            }
        },

        /**
         * Update a note
         * @param {string} id - Note ID
         * @param {object} updates - Fields to update (title, category, tags, content, favorite)
         */
        async updateNote(id, updates) {
            try {
                const response = await fetch(`${API_BASE}/notes/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
                if (!response.ok) {
                    throw new Error('Failed to update note');
                }
                return await response.json();
            } catch (error) {
                console.error('Error updating note:', error);
                throw error;
            }
        },

        /**
         * Delete a note
         * @param {string} id - Note ID
         */
        async deleteNote(id) {
            try {
                const response = await fetch(`${API_BASE}/notes/${id}`, {
                    method: 'DELETE'
                });
                if (!response.ok) {
                    throw new Error('Failed to delete note');
                }
                return await response.json();
            } catch (error) {
                console.error('Error deleting note:', error);
                throw error;
            }
        },

        /**
         * Analyze note with AI
         * @param {string} id - Note ID
         * @param {string} action - 'tldr' | 'grammar'
         * @param {string} content - Note content to analyze
         */
        async analyzeNote(action, content) {
            try {
                // This will use the AI API proxy from the main app
                // For now, we'll just return the request structure
                // The actual implementation is in notes-editor.js
                return { action, content };
            } catch (error) {
                console.error('Error analyzing note:', error);
                throw error;
            }
        }
    };
})();
