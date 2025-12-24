/**
 * Notes App
 * Main application logic for notes management
 */

/* global ImportHandler, NotesStorage */

// eslint-disable-next-line no-unused-vars
const NotesApp = (() => {
    // Note categories - loaded from API, default fallback
    let NOTE_CATEGORIES = ['personal', 'travel', 'health', 'work', 'projects', 'ideas', 'other'];

    let allNotes = [];
    // eslint-disable-next-line no-unused-vars
    let filteredNotes = [];
    let filterCategory = '';
    let filterFavoritesOnly = false;
    let noteSortOrder = 'alphabetical'; // 'alphabetical' or 'date'
    let categorySortOrder = 'alphabetical'; // 'alphabetical' or 'custom'

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
        // Load categories from API first
        await loadCategoriesFromAPI();
        setupTabSwitching();
        setupEventListeners();
        populateCategoryDropdown();
        // Restore sidebar state early to prevent visual flashing
        restoreSidebarState();
        // Initialize FAB
        initializeFAB();
        // Set initial button states
        updateSortButtonStates();
        updateCategorySortButtonStates();
        // eslint-disable-next-line no-undef
        NotesEditor.initialize();
        await loadNotes();
    }

    /**
     * Load categories from API
     */
    async function loadCategoriesFromAPI() {
        try {
            // eslint-disable-next-line no-undef
            const categories = await Storage.getCategories();
            if (categories && categories.length > 0) {
                NOTE_CATEGORIES = categories;
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            // Use default categories if loading fails
        }
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
        const notesFab = document.getElementById('notes-fab');

        if (listsTabBtn && notesTabBtn && listsView && notesView) {
            listsTabBtn.addEventListener('click', () => {
                listsTabBtn.classList.add('active');
                notesTabBtn.classList.remove('active');
                listsView.style.display = 'block';
                notesView.style.display = 'none';
                if (listsFooter) {
                    listsFooter.style.display = 'flex';
                }
                // Hide FAB on lists page
                if (notesFab) {
                    notesFab.style.display = 'none';
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
                if (listsFooter) {
                    listsFooter.style.display = 'none';
                }
                // Show FAB on notes page
                if (notesFab) {
                    notesFab.style.display = 'flex';
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

        // PDF export button
        const pdfExportBtn = document.getElementById('note-export-pdf-btn');
        if (pdfExportBtn) {
            pdfExportBtn.addEventListener('click', showPdfExportModal);
        }

        // PDF export modal buttons
        const pdfExportModal = document.getElementById('pdf-export-modal');
        const pdfExportCloseBtn = document.getElementById('pdf-export-close-btn');
        const pdfExportCancelBtn = document.getElementById('pdf-export-cancel-btn');
        const pdfExportConfirmBtn = document.getElementById('pdf-export-confirm-btn');

        if (pdfExportCloseBtn) {
            pdfExportCloseBtn.addEventListener('click', () => {
                if (pdfExportModal) {
                    pdfExportModal.style.display = 'none';
                }
            });
        }

        if (pdfExportCancelBtn) {
            pdfExportCancelBtn.addEventListener('click', () => {
                if (pdfExportModal) {
                    pdfExportModal.style.display = 'none';
                }
            });
        }

        if (pdfExportConfirmBtn) {
            pdfExportConfirmBtn.addEventListener('click', exportCurrentNoteToPdf);
        }

        // Close modal when clicking outside
        if (pdfExportModal) {
            pdfExportModal.addEventListener('click', e => {
                if (e.target === pdfExportModal) {
                    pdfExportModal.style.display = 'none';
                }
            });
        }

        // Sidebar close button
        const sidebarClose = document.getElementById('notes-sidebar-close');
        if (sidebarClose) {
            sidebarClose.addEventListener('click', closeSidebar);
        }

        // Notes footer buttons
        document.getElementById('notes-import-btn')?.addEventListener('click', importNotes);
        document.getElementById('notes-export-btn')?.addEventListener('click', exportNotes);

        // Sort buttons
        document.getElementById('notes-sort-alpha-btn')?.addEventListener('click', () => {
            noteSortOrder = 'alphabetical';
            updateSortButtonStates();
            filterNotes();
        });

        document.getElementById('notes-sort-date-btn')?.addEventListener('click', () => {
            noteSortOrder = 'date';
            updateSortButtonStates();
            filterNotes();
        });

        document.getElementById('notes-sort-category-alpha-btn')?.addEventListener('click', () => {
            categorySortOrder = 'alphabetical';
            updateCategorySortButtonStates();
            filterNotes();
        });

        document.getElementById('notes-sort-category-custom-btn')?.addEventListener('click', () => {
            categorySortOrder = 'custom';
            updateCategorySortButtonStates();
            filterNotes();
        });
    }

    /**
     * Update sort button active states for notes
     */
    function updateSortButtonStates() {
        const alphaBtn = document.getElementById('notes-sort-alpha-btn');
        const dateBtn = document.getElementById('notes-sort-date-btn');

        if (alphaBtn) {
            alphaBtn.classList.toggle('active', noteSortOrder === 'alphabetical');
        }
        if (dateBtn) {
            dateBtn.classList.toggle('active', noteSortOrder === 'date');
        }
    }

    /**
     * Update sort button active states for categories
     */
    function updateCategorySortButtonStates() {
        const alphaBtn = document.getElementById('notes-sort-category-alpha-btn');
        const customBtn = document.getElementById('notes-sort-category-custom-btn');

        if (alphaBtn) {
            alphaBtn.classList.toggle('active', categorySortOrder === 'alphabetical');
        }
        if (customBtn) {
            customBtn.classList.toggle('active', categorySortOrder === 'custom');
        }
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
     * Initialize FAB (Floating Action Button)
     */
    function initializeFAB() {
        const fabContainer = document.getElementById('notes-fab');
        const fabTrigger = document.getElementById('notes-fab-trigger');
        const fabToggleSidebar = document.getElementById('fab-toggle-sidebar');
        const fabNewNote = document.getElementById('fab-new-note');
        const fabImport = document.getElementById('fab-import');
        const fabExport = document.getElementById('fab-export');

        if (!fabTrigger) {
            return;
        }

        // Toggle FAB menu
        fabTrigger.addEventListener('click', e => {
            e.stopPropagation();
            fabContainer.classList.toggle('open');
        });

        // Close FAB when clicking outside
        document.addEventListener('click', e => {
            if (fabContainer && !fabContainer.contains(e.target)) {
                fabContainer.classList.remove('open');
            }
        });

        // FAB action: Toggle Sidebar
        if (fabToggleSidebar) {
            fabToggleSidebar.addEventListener('click', () => {
                toggleSidebar();
                fabContainer.classList.remove('open');
            });
        }

        // FAB action: New Note
        if (fabNewNote) {
            fabNewNote.addEventListener('click', () => {
                const newNoteBtn = document.getElementById('new-note-btn');
                if (newNoteBtn) {
                    newNoteBtn.click();
                }
                fabContainer.classList.remove('open');
            });
        }

        // FAB action: Import
        if (fabImport) {
            fabImport.addEventListener('click', () => {
                const importBtn = document.getElementById('notes-import-btn');
                if (importBtn) {
                    importBtn.click();
                }
                fabContainer.classList.remove('open');
            });
        }

        // FAB action: Export
        if (fabExport) {
            fabExport.addEventListener('click', () => {
                const exportBtn = document.getElementById('notes-export-btn');
                if (exportBtn) {
                    exportBtn.click();
                }
                fabContainer.classList.remove('open');
            });
        }

        // Close FAB on Escape key
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && fabContainer.classList.contains('open')) {
                fabContainer.classList.remove('open');
            }
        });
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

        // Sort notes within each category based on sort order
        Object.keys(groups).forEach(category => {
            if (noteSortOrder === 'alphabetical') {
                groups[category].sort((a, b) => {
                    return a.title.localeCompare(b.title);
                });
            } else {
                // Sort by modified date (most recent first)
                groups[category].sort((a, b) => {
                    return new Date(b.metadata.modified) - new Date(a.metadata.modified);
                });
            }
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

        // Sort categories based on sort order
        let categoryOrder;
        if (categorySortOrder === 'alphabetical') {
            categoryOrder = Object.keys(groupedNotes).sort((a, b) => a.localeCompare(b));
        } else {
            // Custom order (from API)
            categoryOrder = NOTE_CATEGORIES.filter(cat => cat in groupedNotes);
        }

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
     * Show PDF export options modal
     */
    function showPdfExportModal() {
        // eslint-disable-next-line no-undef
        const noteId = NotesEditor.getCurrentNoteId();
        if (!noteId) {
            // eslint-disable-next-line no-undef
            UI.showToast('Please select a note first', 'error');
            return;
        }

        const pdfExportModal = document.getElementById('pdf-export-modal');
        if (pdfExportModal) {
            pdfExportModal.style.display = 'flex';
        }
    }

    /**
     * Export current note to PDF
     */
    async function exportCurrentNoteToPdf() {
        // eslint-disable-next-line no-undef
        const noteId = NotesEditor.getCurrentNoteId();
        if (!noteId) {
            // eslint-disable-next-line no-undef
            UI.showToast('Please select a note first', 'error');
            return;
        }

        const includeMetadataCheckbox = document.getElementById('pdf-include-metadata');
        const includeMetadata = includeMetadataCheckbox ? includeMetadataCheckbox.checked : true;

        const pdfExportModal = document.getElementById('pdf-export-modal');
        if (pdfExportModal) {
            pdfExportModal.style.display = 'none';
        }

        try {
            console.log('Starting PDF export for note:', noteId);

            // Get note info for filename
            const note = allNotes.find(n => n.id === noteId);
            if (!note) {
                // eslint-disable-next-line no-undef
                UI.showToast('Note not found', 'error');
                return;
            }

            // Generate curl command
            const createdDate = new Date(note.metadata.created)
                .toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                })
                .replace(/\//g, '-');
            const filename = `${note.title}_${createdDate}.pdf`.replace(/[^a-z0-9._-]/gi, '_');

            const protocol = window.location.protocol;
            const host = window.location.host;
            const apiUrl = `${protocol}//${host}/api/export/note/${noteId}/pdf?includeMetadata=${includeMetadata}`;
            const curlCommand = `curl -o "${filename}" "${apiUrl}"`;

            // Show curl command in a modal
            showCurlCommandModal(curlCommand, filename);
        } catch (error) {
            console.error('Error exporting note to PDF:', error);
            // eslint-disable-next-line no-undef
            UI.showToast('Error exporting PDF: ' + error.message, 'error');
        }
    }

    /**
     * Show curl command in a modal
     */
    function showCurlCommandModal(curlCommand, filename) {
        // Create a custom modal to show the command better
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.id = 'curl-command-modal';

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px; background: white;">
                <div class="modal-header">
                    <h2>Download PDF via Terminal</h2>
                    <button class="icon-btn" id="curl-close-btn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 15px; color: #333;">Copy this command and run it in your terminal to download the PDF:</p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #ddd;">
                        <code style="word-break: break-all; font-family: monospace; font-size: 12px; color: #000; display: block; white-space: pre-wrap;" id="curl-command-text">${curlCommand}</code>
                    </div>
                    <p style="color: #666; font-size: 13px; margin-bottom: 15px;">The file will be saved as: <strong>${filename}</strong></p>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" id="curl-cancel-btn">Close</button>
                        <button class="btn btn-primary" id="curl-copy-btn">Copy Command</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        document.getElementById('curl-close-btn').addEventListener('click', () => {
            modal.style.display = 'none';
            setTimeout(() => modal.remove(), 300);
        });

        document.getElementById('curl-cancel-btn').addEventListener('click', () => {
            modal.style.display = 'none';
            setTimeout(() => modal.remove(), 300);
        });

        document.getElementById('curl-copy-btn').addEventListener('click', () => {
            try {
                // Try using the modern Clipboard API
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard
                        .writeText(curlCommand)
                        .then(() => {
                            // eslint-disable-next-line no-undef
                            UI.showToast('Curl command copied to clipboard!', 'success');
                        })
                        .catch(() => {
                            fallbackCopy();
                        });
                } else {
                    fallbackCopy();
                }
            } catch (err) {
                fallbackCopy();
            }

            function fallbackCopy() {
                // Fallback: select and copy manually
                const textElement = document.getElementById('curl-command-text');
                const range = document.createRange();
                range.selectNodeContents(textElement);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                try {
                    document.execCommand('copy');
                    // eslint-disable-next-line no-undef
                    UI.showToast('Curl command copied to clipboard!', 'success');
                } catch (err) {
                    // eslint-disable-next-line no-undef
                    UI.showToast('Please copy the command manually', 'warning');
                }
            }
        });

        // Close when clicking outside
        modal.addEventListener('click', e => {
            if (e.target === modal) {
                modal.style.display = 'none';
                setTimeout(() => modal.remove(), 300);
            }
        });

        // eslint-disable-next-line no-undef
        UI.showToast('PDF download command ready - check the modal', 'success');
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
        input.accept = '.json,.txt,.md';
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

                // Detect file type and read
                const { type, data } = await ImportHandler.detectAndReadFile(file);

                if (type === 'json') {
                    // Handle JSON import
                    const importData = data;

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
                } else {
                    // Handle text import - create a single note from the content
                    const noteTitle = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
                    const noteContent = data.trim();

                    if (!noteContent) {
                        showToast('File is empty', 'warning');
                        return;
                    }

                    try {
                        const newNote = await NotesStorage.createNote(noteTitle, 'personal', []);
                        await NotesStorage.updateNote(newNote.id, { content: noteContent });

                        // Fetch the fresh note data from server to ensure all fields are populated
                        const importedNote = await NotesStorage.getNote(newNote.id);
                        allNotes.push(importedNote);
                        filterNotes();
                        await selectNote(newNote.id);
                        showToast(`Note "${noteTitle}" imported successfully`, 'success');
                    } catch (error) {
                        console.error('Error importing text as note:', error);
                        showToast('Failed to import text as note', 'error');
                    }
                }
            } catch (error) {
                console.error('Error importing notes:', error);
                showToast(error.message || 'Failed to import notes', 'error');
            }
        });
        input.click();
    }

    /**
     * Update a note in the local allNotes array
     */
    function updateNoteInList(noteId, updatedNote) {
        const index = allNotes.findIndex(n => n.id === noteId);
        if (index !== -1) {
            allNotes[index] = updatedNote;
        }
    }

    /**
     * Refresh categories from API (called when categories change in settings)
     */
    async function refreshCategories() {
        await loadCategoriesFromAPI();
        populateCategoryDropdown();
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
        updateNoteInList,
        refreshCategories,
        NOTE_CATEGORIES
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    NotesApp.initialize();
});
