/**
 * Notes App
 * Main application logic for notes management
 */

// eslint-disable-next-line no-unused-vars
const NotesApp = (() => {
    let allNotes = [];
    // eslint-disable-next-line no-unused-vars
    let filteredNotes = [];
    let filterCategory = '';
    let filterFavoritesOnly = false;

    // DOM elements
    const elements = {
        listsTabBtn: () => document.getElementById('lists-tab-btn'),
        notesTabBtn: () => document.getElementById('notes-tab-btn'),
        listsView: () => document.getElementById('lists-view'),
        notesView: () => document.getElementById('notes-view'),
        newNoteBtn: () => document.getElementById('new-note-btn'),
        notesList: () => document.getElementById('notes-list'),
        notesSearchInput: () => document.getElementById('notes-search-input'),
        deleteBtn: () => document.getElementById('note-delete-btn'),
        categoryFilter: () => document.getElementById('note-category-filter'),
        favoritesFilter: () => document.getElementById('notes-favorites-filter')
    };

    /**
     * Initialize the notes app
     */
    async function initialize() {
        setupTabSwitching();
        setupEventListeners();
        // eslint-disable-next-line no-undef
        NotesEditor.initialize();
        await loadNotes();
    }

    /**
     * Setup tab switching between Lists and Notes
     */
    function setupTabSwitching() {
        const listsTabBtn = elements.listsTabBtn();
        const notesTabBtn = elements.notesTabBtn();
        const listsView = elements.listsView();
        const notesView = elements.notesView();

        if (listsTabBtn && notesTabBtn && listsView && notesView) {
            listsTabBtn.addEventListener('click', () => {
                listsTabBtn.classList.add('active');
                notesTabBtn.classList.remove('active');
                listsView.style.display = 'block';
                notesView.style.display = 'none';
                // eslint-disable-next-line no-undef
                NotesEditor.clearEditor();
            });

            notesTabBtn.addEventListener('click', () => {
                notesTabBtn.classList.add('active');
                listsTabBtn.classList.remove('active');
                listsView.style.display = 'none';
                notesView.style.display = 'block';
            });
        }
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        const newNoteBtn = elements.newNoteBtn();
        if (newNoteBtn) {
            newNoteBtn.addEventListener('click', createNewNote);
        }

        const notesSearchInput = elements.notesSearchInput();
        if (notesSearchInput) {
            notesSearchInput.addEventListener('input', e => {
                filterNotes(e.target.value);
            });
        }

        const categoryFilter = elements.categoryFilter();
        if (categoryFilter) {
            categoryFilter.addEventListener('change', e => {
                filterCategory = e.target.value;
                filterNotes();
            });
        }

        const favoritesFilter = elements.favoritesFilter();
        if (favoritesFilter) {
            favoritesFilter.addEventListener('change', e => {
                filterFavoritesOnly = e.target.checked;
                filterNotes();
            });
        }

        const deleteBtn = elements.deleteBtn();
        if (deleteBtn) {
            deleteBtn.addEventListener('click', deleteCurrentNote);
        }
    }

    /**
     * Load all notes from server
     */
    async function loadNotes() {
        try {
            // eslint-disable-next-line no-undef
            allNotes = await NotesStorage.getAllNotes();
            filteredNotes = [...allNotes];
            renderNotesList();
        } catch (error) {
            console.error('Error loading notes:', error);
            showToast('Error loading notes', 'error');
        }
    }

    /**
     * Render notes list
     */
    function renderNotesList() {
        const notesList = elements.notesList();

        if (!notesList) {
            return;
        }

        if (filteredNotes.length === 0) {
            notesList.innerHTML =
                '<li style="padding: 1rem; text-align: center; color: var(--color-text-muted);">No notes found</li>';
            return;
        }

        // Sort by modified date, most recent first
        const sorted = [...filteredNotes].sort((a, b) => {
            return new Date(b.metadata.modified) - new Date(a.metadata.modified);
        });

        notesList.innerHTML = sorted
            .map(
                note => `
            <li class="note-item" data-note-id="${note.id}">
                <div class="note-item-content">
                    <div class="note-item-title">${escapeHtml(note.title)}</div>
                </div>
                <div class="note-item-meta">
                    <span class="note-item-date">${formatDate(note.metadata.modified)}</span>
                </div>
                ${note.favorite ? '<span class="note-item-favorite">★</span>' : ''}
            </li>
        `
            )
            .join('');

        // Add click handlers
        notesList.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('click', () => {
                const noteId = item.dataset.noteId;
                selectNote(noteId, item);
            });
        });
    }

    /**
     * Filter notes by search query, category, and favorites
     */
    function filterNotes(query = '') {
        let results = [...allNotes];

        // Apply search filter
        if (query && query.trim()) {
            const lowerQuery = query.toLowerCase();
            results = results.filter(
                note =>
                    note.title.toLowerCase().includes(lowerQuery) ||
                    note.category.toLowerCase().includes(lowerQuery)
            );
        }

        // Apply category filter
        if (filterCategory) {
            results = results.filter(note => note.category === filterCategory);
        }

        // Apply favorites filter
        if (filterFavoritesOnly) {
            results = results.filter(note => note.favorite);
        }

        filteredNotes = results;
        renderNotesList();
    }

    /**
     * Select a note and load it into editor
     */
    async function selectNote(noteId, element) {
        if (element) {
            // Remove active class from all items
            document.querySelectorAll('.note-item').forEach(item => {
                item.classList.remove('active');
            });
            // Add active class to clicked item
            element.classList.add('active');
        }
        // eslint-disable-next-line no-undef
        await NotesEditor.loadNote(noteId);
    }

    /**
     * Create new note
     */
    async function createNewNote() {
        try {
            const title = prompt('Enter note title:', 'Untitled Note');
            if (!title) {
                return;
            }

            // eslint-disable-next-line no-undef
            const newNote = await NotesStorage.createNote(title.trim(), 'personal', []);
            allNotes.push(newNote);
            filterNotes();
            await selectNote(newNote.id);
            showToast('Note created', 'success');
        } catch (error) {
            console.error('Error creating note:', error);
            showToast('Error creating note', 'error');
        }
    }

    /**
     * Delete current note
     */
    async function deleteCurrentNote() {
        // eslint-disable-next-line no-undef
        const noteId = NotesEditor.getCurrentNoteId();
        if (!noteId) {
            return;
        }

        if (!confirm('Are you sure you want to delete this note?')) {
            return;
        }

        try {
            // eslint-disable-next-line no-undef
            await NotesStorage.deleteNote(noteId);
            allNotes = allNotes.filter(n => n.id !== noteId);
            // eslint-disable-next-line no-undef
            NotesEditor.clearEditor();
            filterNotes();
            showToast('Note deleted', 'success');
        } catch (error) {
            console.error('Error deleting note:', error);
            showToast('Error deleting note', 'error');
        }
    }

    /**
     * Helper: Escape HTML special characters
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Helper: Format date
     */
    function formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else if (date.getFullYear() === today.getFullYear()) {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else {
            return date.toLocaleDateString('en-US', {
                year: '2-digit',
                month: 'short',
                day: 'numeric'
            });
        }
    }

    /**
     * Helper: Show toast message (uses existing app toast if available)
     */
    function showToast(message, type = 'info') {
        // eslint-disable-next-line no-undef
        if (typeof Toast !== 'undefined' && Toast.show) {
            // eslint-disable-next-line no-undef
            Toast.show(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    /**
     * Refresh notes list (call when a note's metadata changes)
     */
    function refreshNotesList() {
        filterNotes();
    }

    /**
     * Public API
     */
    return {
        initialize,
        loadNotes,
        renderNotesList,
        selectNote,
        createNewNote,
        deleteCurrentNote,
        refreshNotesList
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    NotesApp.initialize();
});
