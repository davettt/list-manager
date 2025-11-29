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
        },

        /**
         * Save a backup of note content
         * @param {string} id - Note ID
         * @param {string} content - Note content to backup
         */
        async saveBackup(id, content) {
            try {
                const response = await fetch(`${API_BASE}/notes/${id}/backup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content })
                });
                if (!response.ok) {
                    throw new Error('Failed to save backup');
                }
                return await response.json();
            } catch (error) {
                console.error('Error saving backup:', error);
                throw error;
            }
        },

        /**
         * Get latest backup of a note
         * @param {string} id - Note ID
         */
        async getBackup(id) {
            try {
                const response = await fetch(`${API_BASE}/notes/${id}/backup`);
                if (!response.ok) {
                    throw new Error('No backup available');
                }
                return await response.json();
            } catch (error) {
                console.error('Error retrieving backup:', error);
                throw error;
            }
        },

        /**
         * Check if a backup exists for a note
         * @param {string} id - Note ID
         */
        async hasBackup(id) {
            try {
                const response = await fetch(`${API_BASE}/notes/${id}/backup/exists`);
                if (!response.ok) {
                    throw new Error('Failed to check backup');
                }
                const data = await response.json();
                return data.exists;
            } catch (error) {
                console.error('Error checking backup:', error);
                return false;
            }
        },

        /**
         * Export note to PDF
         * @param {string} id - Note ID
         * @param {boolean} includeMetadata - Whether to include metadata in PDF (default: true)
         */
        async exportNoteToPdf(id, includeMetadata = true) {
            try {
                const url = '/api/export/note/' + id + '/pdf';
                console.log('Calling PDF export API:', url);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ includeMetadata })
                });

                console.log('PDF API response status:', response.status);
                console.log('PDF API response headers:', {
                    contentType: response.headers.get('content-type'),
                    contentDisposition: response.headers.get('content-disposition')
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('PDF API error response:', errorText);
                    throw new Error(
                        `Failed to export note to PDF: ${response.status} ${response.statusText}`
                    );
                }

                // Return blob for download handling
                const blob = await response.blob();
                console.log('PDF blob created, size:', blob.size, 'type:', blob.type);
                return blob;
            } catch (error) {
                console.error('Error exporting note to PDF:', error);
                throw error;
            }
        },

        /**
         * Get all trashed items
         * @returns {Promise<Array>} Array of trashed items with time remaining
         */
        async getTrash() {
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
        },

        /**
         * Restore item from trash
         * @param {string} type - 'list' or 'note'
         * @param {string} id - Item ID
         */
        async restoreFromTrash(type, id) {
            try {
                const response = await fetch(`/api/data/trash/${type}/${id}/restore`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                if (!response.ok) {
                    throw new Error('Failed to restore from trash');
                }
                return await response.json();
            } catch (error) {
                console.error('Error restoring from trash:', error);
                throw error;
            }
        },

        /**
         * Permanently delete item from trash
         * @param {string} type - 'list' or 'note'
         * @param {string} id - Item ID
         */
        async permanentlyDeleteFromTrash(type, id) {
            try {
                const response = await fetch(`/api/data/trash/${type}/${id}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                });
                if (!response.ok) {
                    throw new Error('Failed to permanently delete from trash');
                }
                return await response.json();
            } catch (error) {
                console.error('Error permanently deleting from trash:', error);
                throw error;
            }
        }
    };
})();
