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
     * Displays subcategories with visual hierarchy (indentation)
     */
    function populateCategoryDropdown() {
        const select = document.getElementById('note-category-select');
        if (!select) {
            return;
        }

        // Clear existing options
        select.innerHTML = '';

        // Sort categories for proper hierarchy display
        const sortedCategories = [...NOTE_CATEGORIES].sort();

        // Add categories as options
        sortedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;

            // Format display text with visual hierarchy
            const parts = category.split('/');
            if (parts.length > 1) {
                // Subcategory: add indent and format nicely
                const indent = '\u00A0\u00A0\u00A0\u00A0'; // Non-breaking spaces for indent
                const displayName = parts[parts.length - 1];
                option.textContent =
                    indent + '└ ' + displayName.charAt(0).toUpperCase() + displayName.slice(1);
            } else {
                // Root category
                option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            }
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
        // Position sidebar toggle button (after layout is ready)
        requestAnimationFrame(positionSidebarToggle);
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
        const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');

        if (listsTabBtn && notesTabBtn && listsView && notesView) {
            listsTabBtn.addEventListener('click', () => {
                listsTabBtn.classList.add('active');
                notesTabBtn.classList.remove('active');
                listsView.style.display = 'block';
                notesView.style.display = 'none';
                if (listsFooter) {
                    listsFooter.style.display = 'flex';
                }
                // Hide FAB and sidebar toggle on lists page
                if (notesFab) {
                    notesFab.style.display = 'none';
                }
                if (sidebarToggleBtn) {
                    sidebarToggleBtn.style.display = 'none';
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
                // Show FAB and sidebar toggle on notes page
                if (notesFab) {
                    notesFab.style.display = 'flex';
                }
                if (sidebarToggleBtn) {
                    sidebarToggleBtn.style.display = 'flex';
                    // Position toggle button after display change
                    requestAnimationFrame(positionSidebarToggle);
                }
                // Add class to main-content to remove padding
                const mainContent = document.querySelector('main > .main-content');
                if (mainContent) {
                    mainContent.classList.add('notes-active');
                }
            });

            // Reposition toggle button on window resize
            window.addEventListener('resize', positionSidebarToggle);
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
     * Position the sidebar toggle button relative to the sidebar
     */
    function positionSidebarToggle() {
        const notesView = document.getElementById('notes-view');
        const toggleBtn = document.getElementById('sidebar-toggle-btn');
        const fabContainer = document.getElementById('notes-fab');
        if (!notesView || !toggleBtn) {
            return;
        }

        // Only position if notes view is visible
        if (notesView.style.display === 'none') {
            return;
        }

        // Get the container inside notes-view (this is the positioned parent of the sidebar)
        const container = notesView.querySelector('.container');
        if (!container) {
            return;
        }

        const containerRect = container.getBoundingClientRect();
        // If container has no width, it's not laid out yet - retry
        if (containerRect.width === 0) {
            setTimeout(positionSidebarToggle, 50);
            return;
        }

        // Position buttons at the left edge of the container (CSS margin-left offsets further)
        toggleBtn.style.left = `${containerRect.left}px`;
        if (fabContainer) {
            fabContainer.style.left = `${containerRect.left}px`;
        }
    }

    /**
     * Initialize FAB (Floating Action Button)
     */
    function initializeFAB() {
        const fabContainer = document.getElementById('notes-fab');
        const fabTrigger = document.getElementById('notes-fab-trigger');
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

        // Sidebar toggle button (always visible)
        const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
        if (sidebarToggleBtn) {
            sidebarToggleBtn.addEventListener('click', toggleSidebar);
        }

        // Keyboard shortcuts (only when Notes tab is active)
        document.addEventListener('keydown', e => {
            // Only handle shortcuts when Notes view is visible
            const notesPage = document.getElementById('notes-page');
            if (!notesPage || notesPage.style.display === 'none') {
                return;
            }

            // Don't trigger if user is typing in an input/textarea
            const activeEl = document.activeElement;
            const isTyping =
                activeEl.tagName === 'INPUT' ||
                activeEl.tagName === 'TEXTAREA' ||
                activeEl.isContentEditable;

            // Cmd/Ctrl + B: Toggle sidebar
            if ((e.metaKey || e.ctrlKey) && e.key === 'b' && !e.shiftKey) {
                e.preventDefault();
                toggleSidebar();
            }

            // Cmd/Ctrl + N: New note (only if not typing)
            if ((e.metaKey || e.ctrlKey) && e.key === 'n' && !e.shiftKey && !isTyping) {
                e.preventDefault();
                const newNoteBtn = document.getElementById('new-note-btn');
                if (newNoteBtn) {
                    newNoteBtn.click();
                }
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
     * Build a category tree from flat path-based categories
     * e.g., ["work", "work/projects", "personal"] becomes:
     * { work: { _notes: [], children: { projects: { _notes: [], children: {} } } }, personal: { _notes: [], children: {} } }
     */
    function buildCategoryTree(notes, categories) {
        const tree = {};

        // Initialize tree structure from categories
        categories.forEach(categoryPath => {
            const parts = categoryPath.split('/');
            let current = tree;

            parts.forEach((part, index) => {
                if (!current[part]) {
                    current[part] = {
                        _notes: [],
                        _path: parts.slice(0, index + 1).join('/'),
                        _expanded: true,
                        children: {}
                    };
                }
                if (index < parts.length - 1) {
                    current = current[part].children;
                }
            });
        });

        // Add notes to their categories
        notes.forEach(note => {
            const categoryPath = note.category || 'other';
            const parts = categoryPath.split('/');
            let current = tree;

            // Navigate to the correct category
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (!current[part]) {
                    // Category doesn't exist, create it
                    current[part] = {
                        _notes: [],
                        _path: parts.slice(0, i + 1).join('/'),
                        _expanded: true,
                        children: {}
                    };
                }
                if (i === parts.length - 1) {
                    // Add note to this category
                    current[part]._notes.push(note);
                } else {
                    current = current[part].children;
                }
            }
        });

        // Sort notes within each category
        function sortNotesInTree(node) {
            Object.keys(node).forEach(key => {
                if (key.startsWith('_')) {
                    return;
                }

                const category = node[key];
                if (noteSortOrder === 'alphabetical') {
                    category._notes.sort((a, b) => a.title.localeCompare(b.title));
                } else {
                    category._notes.sort(
                        (a, b) => new Date(b.metadata.modified) - new Date(a.metadata.modified)
                    );
                }
                sortNotesInTree(category.children);
            });
        }
        sortNotesInTree(tree);

        return tree;
    }

    /**
     * Count total notes in a category tree node (including children)
     */
    function countNotesInCategory(categoryNode) {
        let count = categoryNode._notes.length;
        Object.keys(categoryNode.children).forEach(childKey => {
            count += countNotesInCategory(categoryNode.children[childKey]);
        });
        return count;
    }

    /**
     * Render a category tree node recursively
     */
    function renderCategoryNode(name, node, depth = 0) {
        const totalNotes = countNotesInCategory(node);
        const hasChildren = Object.keys(node.children).length > 0;
        const isInCategories = NOTE_CATEGORIES.includes(node._path);

        // Skip if no notes AND not a defined category AND no children
        // (show empty categories that exist in NOTE_CATEGORIES so users can add notes to them)
        if (totalNotes === 0 && !isInCategories && !hasChildren) {
            return '';
        }

        const categoryPath = node._path;
        const categoryName = name.charAt(0).toUpperCase() + name.slice(1);
        const categoryId = `category-${categoryPath.replace(/\//g, '-')}`;
        const indentClass = depth > 0 ? `depth-${depth}` : '';

        // Only show add button on root categories (depth 0) - max 2 levels allowed
        const addButton =
            depth < 1
                ? `<button class="category-add-btn" data-parent="${categoryPath}" title="Add subcategory">+</button>`
                : '';

        let html = `
        <div class="category-group ${indentClass}" data-category="${categoryPath}" data-depth="${depth}">
            <button class="category-header expanded" data-category="${categoryPath}" id="${categoryId}">
                <span class="disclosure-icon">▼</span>
                <span>${categoryName}</span>
                <span class="category-count">${totalNotes}</span>
                ${addButton}
            </button>
            <div class="category-content expanded">`;

        // Render children (subcategories) FIRST - only if depth < 1 (max 2 levels)
        if (hasChildren && depth < 1) {
            const childKeys = Object.keys(node.children).sort((a, b) => a.localeCompare(b));
            childKeys.forEach(childKey => {
                html += renderCategoryNode(childKey, node.children[childKey], depth + 1);
            });
        }

        // Render notes AFTER subcategories
        html += `
                <ul class="category-notes">
                    ${node._notes
                        .map(
                            note => `
                    <li class="note-item" data-note-id="${note.id}" draggable="true">
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
        </div>`;

        return html;
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

        // Build category tree
        const categoryTree = buildCategoryTree(filteredNotes, NOTE_CATEGORIES);

        // Get root categories (those without "/" in their path)
        const rootCategories = Object.keys(categoryTree).sort((a, b) => a.localeCompare(b));

        // Render categories
        let html = '';
        rootCategories.forEach(categoryName => {
            html += renderCategoryNode(categoryName, categoryTree[categoryName], 0);
        });

        // Add "Add Category" button at bottom
        html += `
        <div class="add-category-container">
            <button class="add-category-btn" id="add-root-category-btn">
                <span>+</span> Add Category
            </button>
        </div>`;

        categoriesContainer.innerHTML = html;

        // Add event listeners for category headers (click to toggle, not on add button)
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', e => {
                // Don't toggle if clicking the add button
                if (e.target.classList.contains('category-add-btn')) {
                    e.stopPropagation();
                    return;
                }
                toggleCategory(e);
            });
        });

        // Add click handlers for note items
        categoriesContainer.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('click', () => {
                const noteId = item.dataset.noteId;
                selectNote(noteId, item);
            });
        });

        // Add category button handlers
        document.querySelectorAll('.category-add-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const parentCategory = btn.dataset.parent;
                promptAddCategory(parentCategory);
            });
        });

        // Add root category button handler
        const addRootBtn = document.getElementById('add-root-category-btn');
        if (addRootBtn) {
            addRootBtn.addEventListener('click', () => promptAddCategory(null));
        }

        // Setup drag and drop
        setupDragAndDrop();

        // Restore category expansion state
        restoreCategoryState();
    }

    /**
     * Prompt user to add a new category
     */
    function promptAddCategory(parentCategory) {
        const categoryName = prompt(
            parentCategory ? `Add subcategory under "${parentCategory}":` : 'Add new category:'
        );

        if (!categoryName || !categoryName.trim()) {
            return;
        }

        const cleanName = categoryName
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-');
        const fullPath = parentCategory ? `${parentCategory}/${cleanName}` : cleanName;

        // Check max depth (2 levels)
        if (fullPath.split('/').length > 2) {
            showToast('Maximum category depth is 2 levels', 'error');
            return;
        }

        // Add category via API
        Storage.addCategory(fullPath)
            .then(() => {
                NOTE_CATEGORIES.push(fullPath);
                showToast(`Category "${cleanName}" added`, 'success');
                filterNotes(); // Re-render
            })
            .catch(err => {
                showToast(err.message || 'Failed to add category', 'error');
            });
    }

    /**
     * Setup drag and drop for notes
     */
    function setupDragAndDrop() {
        let draggedNoteId = null;

        // Make note items draggable
        document.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('dragstart', e => {
                draggedNoteId = item.dataset.noteId;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                document.querySelectorAll('.drop-target').forEach(el => {
                    el.classList.remove('drop-target');
                });
            });
        });

        // Make category headers drop targets
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('dragover', e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                header.classList.add('drop-target');
            });

            header.addEventListener('dragleave', () => {
                header.classList.remove('drop-target');
            });

            header.addEventListener('drop', async e => {
                e.preventDefault();
                header.classList.remove('drop-target');

                if (!draggedNoteId) {
                    return;
                }

                const targetCategory = header.dataset.category;
                const note = allNotes.find(n => n.id === draggedNoteId);

                if (note && note.category !== targetCategory) {
                    try {
                        await NotesStorage.updateNote(draggedNoteId, { category: targetCategory });
                        note.category = targetCategory;
                        showToast(`Moved to ${targetCategory}`, 'success');
                        filterNotes(); // Re-render
                    } catch (err) {
                        showToast('Failed to move note', 'error');
                    }
                }

                draggedNoteId = null;
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
        const content = categoryGroup.querySelector(':scope > .category-content');

        header.classList.toggle('expanded');
        header.classList.toggle('collapsed');
        if (content) {
            content.classList.toggle('expanded');
        }

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
            const content = header
                .closest('.category-group')
                .querySelector(':scope > .category-content');

            if (!isExpanded) {
                header.classList.remove('expanded');
                header.classList.add('collapsed');
                if (content) {
                    content.classList.remove('expanded');
                }
            } else {
                header.classList.add('expanded');
                header.classList.remove('collapsed');
                if (content) {
                    content.classList.add('expanded');
                }
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

        const includeTitleCheckbox = document.getElementById('pdf-include-title');
        const includeTitle = includeTitleCheckbox ? includeTitleCheckbox.checked : true;

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
            let createdDate;
            const dateValue = note.metadata?.created;
            if (dateValue && !isNaN(new Date(dateValue).getTime())) {
                createdDate = new Date(dateValue)
                    .toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    })
                    .replace(/\//g, '-');
            } else {
                // Fallback to today's date if created date is invalid
                createdDate = new Date()
                    .toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    })
                    .replace(/\//g, '-');
            }
            const filename = `${note.title}_${createdDate}.pdf`.replace(/[^a-z0-9._-]/gi, '_');

            const protocol = window.location.protocol;
            const host = window.location.host;

            // Get display settings for PDF export
            // eslint-disable-next-line no-undef
            const settings = await Storage.getSettings();
            const font = settings.display?.font || 'system';
            const paperSize = settings.display?.paperSize || 'a4';

            const apiUrl = `${protocol}//${host}/api/export/note/${noteId}/pdf?includeTitle=${includeTitle}&includeMetadata=${includeMetadata}&font=${font}&paperSize=${paperSize}`;
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
     * Export all notes (with full content)
     */
    async function exportNotes() {
        try {
            if (!allNotes || allNotes.length === 0) {
                showToast('No notes to export', 'info');
                return;
            }

            showToast('Preparing export...', 'info');

            // Fetch notes with full content from server
            const response = await fetch('/api/data/notes/export');
            if (!response.ok) {
                throw new Error('Failed to fetch notes');
            }
            const notesWithContent = await response.json();

            const notesData = {
                version: 1,
                exportDate: new Date().toISOString(),
                type: 'notes',
                noteCount: notesWithContent.length,
                notes: notesWithContent
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

            showToast(`Exported ${notesWithContent.length} notes successfully`, 'success');
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

                    // Filter out notes without required title field
                    const validNotes = importData.notes.filter(note => note.title);
                    const skippedCount = importData.notes.length - validNotes.length;

                    if (validNotes.length === 0) {
                        showToast('No valid notes found (notes must have a title)', 'error');
                        return;
                    }

                    if (skippedCount > 0) {
                        showToast(
                            `${skippedCount} notes without titles will be skipped`,
                            'warning'
                        );
                    }

                    showToast(`Importing ${validNotes.length} notes...`, 'info');

                    // Call bulk import endpoint (adds to existing notes with new IDs)
                    const response = await fetch('/api/data/notes/bulk', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ notes: validNotes })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to import notes');
                    }

                    const result = await response.json();

                    // Refresh the notes list
                    allNotes = await NotesStorage.getAllNotes();
                    filterNotes();

                    showToast(
                        `Successfully added ${result.count} note(s) to your collection`,
                        'success'
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
