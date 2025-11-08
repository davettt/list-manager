/**
 * Notes Editor
 * Handles split-pane editor, markdown preview, and debounced saving
 */

// eslint-disable-next-line no-unused-vars
const NotesEditor = (() => {
    const CONFIG = {
        DEBOUNCE_DELAY: 1000, // 1 second debounce for saving
        PREVIEW_DEBOUNCE: 300 // 300ms debounce for preview updates
    };

    const state = {
        currentNoteId: null,
        isDirty: false,
        debounceTimer: null,
        previewDebounceTimer: null,
        isSaving: false
    };

    // DOM elements
    const elements = {
        textarea: () => document.getElementById('note-content-textarea'),
        preview: () => document.getElementById('note-preview'),
        statusText: () => document.getElementById('note-status-text'),
        titleInput: () => document.getElementById('note-title-input'),
        categorySelect: () => document.getElementById('note-category-select'),
        favoriteCheckbox: () => document.getElementById('note-favorite-checkbox'),
        tldrBtn: () => document.getElementById('note-ai-tldr-btn'),
        grammarBtn: () => document.getElementById('note-ai-grammar-btn'),
        deleteBtn: () => document.getElementById('note-delete-btn'),
        editorContainer: () => document.getElementById('note-editor'),
        noNoteSelected: () => document.getElementById('no-note-selected')
    };

    /**
     * Initialize editor event listeners
     */
    function initializeEditorEvents() {
        const textarea = elements.textarea();
        if (!textarea) {
            return;
        }

        textarea.addEventListener('input', () => {
            state.isDirty = true;
            updateStatus('Unsaved changes');

            // Debounce preview update
            clearTimeout(state.previewDebounceTimer);
            state.previewDebounceTimer = setTimeout(() => {
                updatePreview();
            }, CONFIG.PREVIEW_DEBOUNCE);

            // Debounce auto-save
            clearTimeout(state.debounceTimer);
            state.debounceTimer = setTimeout(() => {
                if (state.isDirty) {
                    saveNote();
                }
            }, CONFIG.DEBOUNCE_DELAY);
        });

        // Title change
        const titleInput = elements.titleInput();
        if (titleInput) {
            titleInput.addEventListener('change', () => {
                if (state.currentNoteId) {
                    saveNoteMetadata();
                }
            });
        }

        // Category change
        const categorySelect = elements.categorySelect();
        if (categorySelect) {
            categorySelect.addEventListener('change', () => {
                if (state.currentNoteId) {
                    saveNoteMetadata();
                }
            });
        }

        // Favorite checkbox
        const favoriteCheckbox = elements.favoriteCheckbox();
        if (favoriteCheckbox) {
            favoriteCheckbox.addEventListener('change', () => {
                if (state.currentNoteId) {
                    saveNoteMetadata();
                }
            });
        }
    }

    /**
     * Update preview with rendered markdown
     */
    async function updatePreview() {
        const textarea = elements.textarea();
        const preview = elements.preview();
        if (!textarea || !preview) {
            return;
        }

        const content = textarea.value;

        try {
            if (!content.trim()) {
                preview.innerHTML = '';
                return;
            }

            // Use marked to render markdown
            // eslint-disable-next-line no-undef
            if (typeof marked === 'undefined') {
                preview.innerHTML = '<p style="color: #999;">Markdown library not loaded</p>';
                return;
            }

            // eslint-disable-next-line no-undef
            const html = marked.parse(content);
            preview.innerHTML = html;

            // Add syntax highlighting for code blocks if available
            preview.querySelectorAll('pre code').forEach(block => {
                block.classList.add('hljs');
            });
        } catch (error) {
            console.error('Error rendering markdown:', error);
            preview.innerHTML = '<p style="color: #f44;">Error rendering markdown</p>';
        }
    }

    /**
     * Save note content to server
     */
    async function saveNote() {
        if (!state.currentNoteId || state.isSaving) {
            return;
        }

        state.isSaving = true;
        updateStatus('Saving...');

        try {
            const content = elements.textarea().value;
            // eslint-disable-next-line no-undef
            await NotesStorage.updateNote(state.currentNoteId, { content });
            state.isDirty = false;
            updateStatus('All changes saved');
        } catch (error) {
            console.error('Error saving note:', error);
            updateStatus('Error saving changes');
        } finally {
            state.isSaving = false;
        }
    }

    /**
     * Save note metadata (title, category, favorite)
     */
    async function saveNoteMetadata() {
        if (!state.currentNoteId) {
            return;
        }

        try {
            const title = elements.titleInput().value;
            const category = elements.categorySelect().value;
            const favorite = elements.favoriteCheckbox().checked;

            // eslint-disable-next-line no-undef
            await NotesStorage.updateNote(state.currentNoteId, {
                title,
                category,
                favorite
            });
            updateStatus('Metadata saved');
            // Refresh the notes list to update the note card with new metadata
            // eslint-disable-next-line no-undef
            if (typeof NotesApp !== 'undefined' && NotesApp.refreshNotesList) {
                // eslint-disable-next-line no-undef
                NotesApp.refreshNotesList();
            }
        } catch (error) {
            console.error('Error saving metadata:', error);
            updateStatus('Error saving metadata');
        }
    }

    /**
     * Update status text
     */
    function updateStatus(text) {
        const statusText = elements.statusText();
        if (statusText) {
            statusText.textContent = text;
        }
    }

    /**
     * Load note into editor
     */
    async function loadNote(noteId) {
        try {
            state.currentNoteId = noteId;
            // eslint-disable-next-line no-undef
            const note = await NotesStorage.getNote(noteId);

            // Populate fields
            elements.titleInput().value = note.title;
            elements.categorySelect().value = note.category || 'personal';
            elements.favoriteCheckbox().checked = note.favorite || false;
            elements.textarea().value = note.content || '';

            // Update preview
            await updatePreview();

            // Clear dirty state
            state.isDirty = false;
            updateStatus('All changes saved');

            // Show editor, hide no-note-selected
            elements.editorContainer().style.display = 'flex';
            elements.noNoteSelected().style.display = 'none';

            // Set cursor to start without auto-scrolling
            const textarea = elements.textarea();
            textarea.setSelectionRange(0, 0);
            textarea.scrollTop = 0;
        } catch (error) {
            console.error('Error loading note:', error);
            updateStatus('Error loading note');
        }
    }

    /**
     * Clear editor
     */
    function clearEditor() {
        state.currentNoteId = null;
        state.isDirty = false;
        elements.titleInput().value = '';
        elements.categorySelect().value = 'personal';
        elements.favoriteCheckbox().checked = false;
        elements.textarea().value = '';
        elements.preview().innerHTML = '';
        updateStatus('');
        elements.editorContainer().style.display = 'none';
        elements.noNoteSelected().style.display = 'flex';
    }

    /**
     * Get current note ID
     */
    function getCurrentNoteId() {
        return state.currentNoteId;
    }

    /**
     * Initialize pane toggle buttons
     */
    function initializePaneToggles() {
        const editorOnlyBtn = document.getElementById('note-toggle-editor-only');
        const bothBtn = document.getElementById('note-toggle-both');
        const previewOnlyBtn = document.getElementById('note-toggle-preview-only');
        const editorPanes = document.querySelector('.editor-panes');

        if (!editorPanes || !editorOnlyBtn || !bothBtn || !previewOnlyBtn) {
            return;
        }

        function updateToggleButtons(mode) {
            editorOnlyBtn.classList.remove('active');
            bothBtn.classList.remove('active');
            previewOnlyBtn.classList.remove('active');

            if (mode === 'editor-only') {
                editorOnlyBtn.classList.add('active');
            } else if (mode === 'both') {
                bothBtn.classList.add('active');
            } else if (mode === 'preview-only') {
                previewOnlyBtn.classList.add('active');
            }
        }

        editorOnlyBtn.addEventListener('click', () => {
            editorPanes.className = 'editor-panes editor-only';
            updateToggleButtons('editor-only');
        });

        bothBtn.addEventListener('click', () => {
            editorPanes.className = 'editor-panes';
            updateToggleButtons('both');
        });

        previewOnlyBtn.addEventListener('click', () => {
            editorPanes.className = 'editor-panes preview-only';
            updateToggleButtons('preview-only');
        });
    }

    /**
     * Public API
     */
    return {
        initialize: () => {
            initializeEditorEvents();
            initializePaneToggles();
        },
        loadNote,
        clearEditor,
        getCurrentNoteId,
        updatePreview,
        saveNote,
        saveNoteMetadata,
        updateStatus
    };
})();
