/**
 * Notes App
 * Main application logic for notes management
 */

// eslint-disable-next-line no-unused-vars
const NotesApp = (() => {
    // Note categories - single source of truth
    const NOTE_CATEGORIES = ['personal', 'travel', 'health', 'work', 'projects', 'ideas', 'other'];

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
        notesSearchInput: () => document.getElementById('notes-search-input'),
        deleteBtn: () => document.getElementById('note-delete-btn'),
        categoryFilter: () => document.getElementById('note-category-filter'),
        favoritesFilter: () => document.getElementById('notes-favorites-filter')
    };

    /**
     * Populate category dropdown with categories from NOTE_CATEGORIES
     */
    function populateCategoryDropdown() {
        const select = document.getElementById('note-category-select');
        if (!select) {
            return;
        }

        // Clear existing options
        select.innerHTML = '';

        // Add categories as options
        NOTE_CATEGORIES.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            select.appendChild(option);
        });
    }

    /**
     * Initialize the notes app
     */
    async function initialize() {
        setupTabSwitching();
        setupEventListeners();
        populateCategoryDropdown();
        // Restore sidebar state early to prevent visual flashing
        restoreSidebarState();
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
        const listsFooter = document.getElementById('lists-footer-actions');
        const notesFooter = document.getElementById('notes-footer-actions');

        if (listsTabBtn && notesTabBtn && listsView && notesView) {
            listsTabBtn.addEventListener('click', () => {
                listsTabBtn.classList.add('active');
                notesTabBtn.classList.remove('active');
                listsView.style.display = 'block';
                notesView.style.display = 'none';
                if (listsFooter && notesFooter) {
                    listsFooter.style.display = 'flex';
                    notesFooter.style.display = 'none';
                }
                // Remove notes-active class from main-content
                const mainContent = document.querySelector('main > .main-content');
                if (mainContent) {
                    mainContent.classList.remove('notes-active');
                }
                // eslint-disable-next-line no-undef
                NotesEditor.clearEditor();
            });

            notesTabBtn.addEventListener('click', () => {
                notesTabBtn.classList.add('active');
                listsTabBtn.classList.remove('active');
                listsView.style.display = 'none';
                notesView.style.display = 'block';
                if (listsFooter && notesFooter) {
                    listsFooter.style.display = 'none';
                    notesFooter.style.display = 'flex';
                }
                // Add class to main-content to remove padding
                const mainContent = document.querySelector('main > .main-content');
                if (mainContent) {
                    mainContent.classList.add('notes-active');
                }
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

        // Sidebar toggle button
        const sidebarToggle = document.getElementById('notes-sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', toggleSidebar);
        }

        // Sidebar close button
        const sidebarClose = document.getElementById('notes-sidebar-close');
        if (sidebarClose) {
            sidebarClose.addEventListener('click', closeSidebar);
        }

        // Notes footer buttons
        document.getElementById('notes-import-btn')?.addEventListener('click', importNotes);
        document.getElementById('notes-export-btn')?.addEventListener('click', exportNotes);
    }

    /**
     * Close sidebar
     */
    function closeSidebar() {
        const sidebar = document.getElementById('notes-sidebar');
        if (sidebar) {
            sidebar.classList.add('collapsed');
            // Store sidebar state in localStorage
            localStorage.setItem('sidebarCollapsed', 'true');
        }
    }

    /**
     * Toggle sidebar collapse/expand
     */
    function toggleSidebar() {
        const sidebar = document.getElementById('notes-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
            // Store sidebar state in localStorage
            const sidebarCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
        }
    }

    /**
     * Restore sidebar state from localStorage
     */
    function restoreSidebarState() {
        const sidebar = document.getElementById('notes-sidebar');
        if (sidebar) {
            const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (sidebarCollapsed) {
                sidebar.classList.add('collapsed');
            }
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
            // Restore category expansion state after rendering
            setTimeout(() => {
                restoreCategoryState();
            }, 0);
        } catch (error) {
            console.error('Error loading notes:', error);
            showToast('Error loading notes', 'error');
        }
    }

    /**
     * Group notes by category
     */
    function groupNotesByCategory(notes) {
        const groups = {};

        // Initialize empty groups for all categories
        NOTE_CATEGORIES.forEach(cat => {
            groups[cat] = [];
        });

        // Group notes by category
        notes.forEach(note => {
            const category = note.category || 'other';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(note);
        });

        // Sort notes within each category by modified date (most recent first)
        Object.keys(groups).forEach(category => {
            groups[category].sort((a, b) => {
                return new Date(b.metadata.modified) - new Date(a.metadata.modified);
            });
        });

        return groups;
    }

    /**
     * Render notes list as collapsible categories in sidebar
     */
    function renderNotesList() {
        const categoriesContainer = document.getElementById('notes-categories');

        if (!categoriesContainer) {
            return;
        }

        if (filteredNotes.length === 0) {
            categoriesContainer.innerHTML =
                '<div style="padding: 1rem; text-align: center; color: var(--color-text-muted); font-size: 0.85rem;">No notes found</div>';
            return;
        }

        // Group notes by category
        const groupedNotes = groupNotesByCategory(filteredNotes);
        const categoryOrder = ['personal', 'work', 'projects', 'ideas', 'other'];

        // Render categories
        let html = '';
        categoryOrder.forEach(category => {
            const notes = groupedNotes[category];
            if (notes.length === 0) {
                return;
            }

            // Format category name
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
            const categoryId = `category-${category}`;

            html += `
            <div class="category-group" data-category="${category}">
                <button class="category-header expanded" data-category="${category}" id="${categoryId}">
                    <span class="disclosure-icon">▼</span>
                    <span>${categoryName}</span>
                    <span style="font-size: 0.75rem; color: var(--color-text-muted); margin-left: auto;">${notes.length}</span>
                </button>
                <ul class="category-notes expanded">
                    ${notes
                        .map(
                            note => `
                    <li class="note-item" data-note-id="${note.id}">
                        <div class="note-item-content">
                            <div class="note-item-title">${Utils.sanitizeHtml(note.title)}</div>
                        </div>
                        <div class="note-item-meta">
                            <span class="note-item-date">${formatDate(note.metadata.modified)}</span>
                        </div>
                        ${note.favorite ? '<span class="note-item-favorite">★</span>' : ''}
                    </li>
                    `
                        )
                        .join('')}
                </ul>
            </div>
            `;
        });

        categoriesContainer.innerHTML = html;

        // Add event listeners for category headers
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', toggleCategory);
        });

        // Add click handlers for note items
        categoriesContainer.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('click', () => {
                const noteId = item.dataset.noteId;
                selectNote(noteId, item);
            });
        });
    }

    /**
     * Toggle category expansion
     */
    function toggleCategory(e) {
        const header = e.currentTarget;
        const category = header.dataset.category;
        const categoryGroup = header.closest('.category-group');
        const notesList = categoryGroup.querySelector('.category-notes');

        header.classList.toggle('expanded');
        header.classList.toggle('collapsed');
        notesList.classList.toggle('expanded');

        // Store expansion state in localStorage
        const expandedCategories = JSON.parse(localStorage.getItem('expandedCategories') || '{}');
        expandedCategories[category] = header.classList.contains('expanded');
        localStorage.setItem('expandedCategories', JSON.stringify(expandedCategories));
    }

    /**
     * Restore category expansion state from localStorage
     */
    function restoreCategoryState() {
        const expandedCategories = JSON.parse(localStorage.getItem('expandedCategories') || '{}');

        document.querySelectorAll('.category-header').forEach(header => {
            const category = header.dataset.category;
            const isExpanded = expandedCategories[category] !== false; // Default to expanded

            if (!isExpanded) {
                header.classList.remove('expanded');
                header.classList.add('collapsed');
                header
                    .closest('.category-group')
                    .querySelector('.category-notes')
                    .classList.remove('expanded');
            } else {
                header.classList.add('expanded');
                header.classList.remove('collapsed');
                header
                    .closest('.category-group')
                    .querySelector('.category-notes')
                    .classList.add('expanded');
            }
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
        // Restore category expansion state after rendering
        setTimeout(() => {
            restoreCategoryState();
        }, 0);
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

        // Auto-close sidebar when note is selected
        closeSidebar();
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

        if (!confirm('Delete this note? It will be moved to trash and recoverable for 14 days.')) {
            return;
        }

        try {
            // eslint-disable-next-line no-undef
            await NotesStorage.deleteNote(noteId);
            allNotes = allNotes.filter(n => n.id !== noteId);
            // eslint-disable-next-line no-undef
            NotesEditor.clearEditor();
            filterNotes();
            // eslint-disable-next-line no-undef
            UI.showToast('Note deleted', 'success');
        } catch (error) {
            console.error('Error deleting note:', error);
            // eslint-disable-next-line no-undef
            UI.showToast('Error deleting note', 'error');
        }
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
     * Export all notes
     */
    function exportNotes() {
        try {
            if (!allNotes || allNotes.length === 0) {
                showToast('No notes to export', 'info');
                return;
            }

            const notesData = {
                version: 1,
                exportDate: new Date().toISOString(),
                noteCount: allNotes.length,
                notes: allNotes
            };

            const dataStr = JSON.stringify(notesData, null, 2);

            // Validate data size (max 10MB)
            if (dataStr.length > 10 * 1024 * 1024) {
                showToast('Export data too large (max 10MB)', 'error');
                return;
            }

            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;

            // Sanitize filename - remove special characters
            const timestamp = new Date().toISOString().split('T')[0];
            link.download = `notes-export-${timestamp}.json`;
            link.click();
            URL.revokeObjectURL(url);

            showToast(`Exported ${allNotes.length} notes successfully`, 'success');
        } catch (error) {
            console.error('Error exporting notes:', error);
            showToast('Failed to export notes', 'error');
        }
    }

    /**
     * Import notes from file
     */
    function importNotes() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', async e => {
            try {
                const file = e.target.files?.[0];
                if (!file) {
                    return;
                }

                // Validate file size (max 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    showToast('File too large (max 10MB)', 'error');
                    return;
                }

                // Validate file type
                if (!file.type.includes('json') && !file.name.endsWith('.json')) {
                    showToast('Please select a valid JSON file', 'error');
                    return;
                }

                const text = await file.text();

                // Validate JSON format
                let importData;
                try {
                    importData = JSON.parse(text);
                } catch (parseError) {
                    showToast('Invalid JSON format', 'error');
                    return;
                }

                // Validate structure
                if (!importData.notes || !Array.isArray(importData.notes)) {
                    showToast('Invalid export format - missing notes array', 'error');
                    return;
                }

                // Validate note count
                if (importData.notes.length === 0) {
                    showToast('No notes in import file', 'info');
                    return;
                }

                if (importData.notes.length > 10000) {
                    showToast('Too many notes to import (max 10000)', 'error');
                    return;
                }

                // Validate that each note has required fields
                const invalidNotes = importData.notes.filter(
                    note => !note.id || !note.title || !note.metadata
                );

                if (invalidNotes.length > 0) {
                    showToast(
                        `${invalidNotes.length} notes have invalid format and will be skipped`,
                        'warning'
                    );
                }

                showToast(
                    `Ready to import ${importData.notes.length - invalidNotes.length} notes. This feature will be implemented soon.`,
                    'info'
                );
            } catch (error) {
                console.error('Error importing notes:', error);
                showToast('Failed to import notes', 'error');
            }
        });
        input.click();
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
        refreshNotesList,
        populateCategoryDropdown,
        NOTE_CATEGORIES
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    NotesApp.initialize();
});
