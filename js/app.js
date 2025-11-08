// ===================================
// List Manager - Main Application
// ===================================

(function () {
    'use strict';

    // ===================================
    // State Management
    // ===================================

    const state = {
        lists: [],
        currentList: null,
        settings: {},
        filters: {
            search: '',
            category: '',
            tag: '',
            favoritesOnly: false
        }
    };

    // ===================================
    // Initialization
    // ===================================

    document.addEventListener('DOMContentLoaded', () => {
        initApp();
    });

    async function initApp() {
        // Check storage availability
        const isAvailable = await Storage.isStorageAvailable();
        if (!isAvailable) {
            UI.showToast('Storage server is not available. Please run: npm run dev', 'error', 5000);
            return;
        }

        // Initialize storage
        await Storage.initStorage();

        // Check for localStorage data and offer migration
        await checkAndMigrateLocalStorage();

        // Load data
        await loadData();

        // Setup event listeners
        setupEventListeners();

        // Render initial view
        renderLists();

        // Apply saved theme
        UI.updateTheme(state.settings.display.theme);

        // Apply saved view mode
        UI.updateViewMode(state.settings.display.view);

        // Update AI button visibility
        updateAiButtonVisibility();
    }

    async function loadData() {
        state.lists = await Storage.getLists();
        state.settings = await Storage.getSettings();

        // Update filters UI
        UI.populateCategoryFilter(state.lists);
        UI.populateTagFilter(state.lists);
    }

    /**
     * Check for old localStorage data and offer to migrate to filesystem
     */
    async function checkAndMigrateLocalStorage() {
        try {
            // Check if localStorage has old data
            const oldLists = localStorage.getItem('lm_lists');
            const oldSettings = localStorage.getItem('lm_settings');

            if (!oldLists && !oldSettings) {
                // No old data to migrate
                return;
            }

            // Check if filesystem already has data
            const currentLists = await Storage.getLists();
            if (currentLists && currentLists.length > 0) {
                // Filesystem already has data, don't migrate
                // But offer to clear localStorage
                if (
                    UI.confirm(
                        'Old localStorage data detected, but you already have lists in the new storage. Clear old localStorage data?'
                    )
                ) {
                    localStorage.removeItem('lm_lists');
                    localStorage.removeItem('lm_settings');
                    UI.showToast('Old localStorage data cleared', 'success');
                }
                return;
            }

            // Offer migration
            if (
                !UI.confirm(
                    'Old localStorage data detected. Migrate to new filesystem storage? (Recommended for data safety)'
                )
            ) {
                return;
            }

            let migratedCount = 0;

            // Migrate lists
            if (oldLists) {
                try {
                    const lists = JSON.parse(oldLists);
                    if (Array.isArray(lists) && lists.length > 0) {
                        await Storage.saveLists(lists);
                        migratedCount += lists.length;
                    }
                } catch (e) {
                    console.error('Failed to migrate lists:', e);
                }
            }

            // Migrate settings
            if (oldSettings) {
                try {
                    const settings = JSON.parse(oldSettings);
                    if (settings && typeof settings === 'object') {
                        await Storage.saveSettings(settings);
                    }
                } catch (e) {
                    console.error('Failed to migrate settings:', e);
                }
            }

            // Clear localStorage after successful migration
            if (
                UI.confirm(
                    `Successfully migrated ${migratedCount} list(s). Clear old localStorage data?`
                )
            ) {
                localStorage.removeItem('lm_lists');
                localStorage.removeItem('lm_settings');
            }

            UI.showToast(`Migration complete! ${migratedCount} list(s) migrated.`, 'success');
        } catch (error) {
            console.error('Migration error:', error);
            UI.showToast('Migration failed. Please try exporting and importing manually.', 'error');
        }
    }

    // ===================================
    // Event Listeners
    // ===================================

    function setupEventListeners() {
        // Header buttons
        document.getElementById('settings-btn')?.addEventListener('click', openSettings);

        // Search and filters
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener(
                'input',
                Utils.debounce(e => {
                    state.filters.search = e.target.value;
                    renderLists();
                }, 300)
            );
        }

        document.getElementById('category-filter')?.addEventListener('change', e => {
            state.filters.category = e.target.value;
            renderLists();
        });

        document.getElementById('tag-filter')?.addEventListener('change', e => {
            state.filters.tag = e.target.value;
            renderLists();
        });

        document.getElementById('favorites-filter')?.addEventListener('change', e => {
            state.filters.favoritesOnly = e.target.checked;
            renderLists();
        });

        document.getElementById('view-toggle')?.addEventListener('click', toggleView);

        // Footer buttons
        document.getElementById('new-list-btn')?.addEventListener('click', createNewList);
        document.getElementById('empty-new-list-btn')?.addEventListener('click', createNewList);
        document.getElementById('import-btn')?.addEventListener('click', importData);
        document.getElementById('export-btn')?.addEventListener('click', exportData);

        // List modal
        document.getElementById('modal-back-btn')?.addEventListener('click', closeListModal);
        document
            .getElementById('modal-favorite-btn')
            ?.addEventListener('click', toggleCurrentListFavorite);
        document.getElementById('edit-list-btn')?.addEventListener('click', saveListChanges);
        document.getElementById('delete-list-btn')?.addEventListener('click', deleteCurrentList);
        document.getElementById('add-item-btn')?.addEventListener('click', addItem);
        document.getElementById('ai-suggest-btn')?.addEventListener('click', generateSuggestions);

        // Allow Enter key to add item
        document.getElementById('new-item-input')?.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                addItem();
            }
        });

        // Settings modal
        document.getElementById('settings-close-btn')?.addEventListener('click', closeSettings);
        document.getElementById('test-api-btn')?.addEventListener('click', testApiConnection);
        document.getElementById('theme-select')?.addEventListener('change', changeTheme);
        document
            .getElementById('ai-enabled-checkbox')
            ?.addEventListener('change', toggleAiFeatures);
        document.getElementById('export-all-btn')?.addEventListener('click', exportData);
        document.getElementById('import-data-btn')?.addEventListener('click', importData);
        document.getElementById('clear-all-btn')?.addEventListener('click', clearAllData);

        // AI Panel
        document.getElementById('ai-panel-close')?.addEventListener('click', UI.hideAiPanel);
        document
            .getElementById('add-selected-btn')
            ?.addEventListener('click', addSelectedSuggestions);
        document.getElementById('add-all-btn')?.addEventListener('click', addAllSuggestions);
        document
            .getElementById('generate-more-btn')
            ?.addEventListener('click', generateSuggestions);

        // File input for import
        document.getElementById('file-input')?.addEventListener('change', handleFileImport);

        // Lists container delegation
        document.getElementById('lists-container')?.addEventListener('click', handleListClick);

        // Items list delegation
        document.getElementById('items-list')?.addEventListener('click', handleItemAction);
        document.getElementById('items-list')?.addEventListener('change', handleItemCheck);

        // Close modals on overlay click
        document.getElementById('list-modal')?.addEventListener('click', e => {
            if (e.target.id === 'list-modal') {
                closeListModal();
            }
        });

        document.getElementById('settings-modal')?.addEventListener('click', e => {
            if (e.target.id === 'settings-modal') {
                closeSettings();
            }
        });
    }

    // ===================================
    // Rendering
    // ===================================

    function renderLists() {
        const container = document.getElementById('lists-container');
        if (!container) {
            return;
        }

        // Filter lists
        const filtered = filterLists(state.lists);

        // Show/hide empty state
        if (filtered.length === 0) {
            if (state.lists.length === 0) {
                UI.showEmptyState();
            } else {
                UI.hideEmptyState();
                container.innerHTML =
                    '<p style="text-align: center; color: var(--color-text-secondary); padding: 2rem;">No lists match your filters.</p>';
            }
            return;
        }

        UI.hideEmptyState();

        // Clear container
        container.innerHTML = '';

        // Render each list
        filtered.forEach(list => {
            const card = UI.createListCard(list);
            container.appendChild(card);
        });
    }

    function filterLists(lists) {
        let filtered = [...lists];

        // Search filter
        if (state.filters.search) {
            filtered = Utils.searchFilter(filtered, state.filters.search, [
                'name',
                'category',
                'tags',
                'items'
            ]);
        }

        // Category filter
        if (state.filters.category) {
            filtered = filtered.filter(list => list.category === state.filters.category);
        }

        // Tag filter
        if (state.filters.tag) {
            filtered = filtered.filter(list => list.tags && list.tags.includes(state.filters.tag));
        }

        // Favorites filter
        if (state.filters.favoritesOnly) {
            filtered = filtered.filter(list => list.favorite);
        }

        // Sort by modified date (newest first)
        return Utils.sortBy(filtered, 'metadata.modified', 'desc');
    }

    function renderItems(list) {
        const itemsList = document.getElementById('items-list');
        if (!itemsList || !list) {
            return;
        }

        itemsList.innerHTML = '';

        if (list.items.length === 0) {
            itemsList.innerHTML =
                '<p style="text-align: center; color: var(--color-text-secondary); padding: 1rem;">No items yet. Add one below!</p>';
            return;
        }

        list.items.forEach(item => {
            const itemEl = UI.createItemElement(item);
            itemsList.appendChild(itemEl);
        });
    }

    // ===================================
    // List Operations
    // ===================================

    async function createNewList() {
        const newList = {
            id: Utils.generateId(),
            name: 'New List',
            category: 'personal',
            tags: [],
            priority: 'medium',
            deadline: null,
            favorite: false,
            items: [],
            metadata: {
                created: Utils.getCurrentTimestamp(),
                modified: Utils.getCurrentTimestamp(),
                itemCount: 0,
                completedCount: 0
            }
        };

        try {
            await Storage.addList(newList);
            state.lists = await Storage.getLists();
            UI.populateCategoryFilter(state.lists);
            UI.populateTagFilter(state.lists);
            renderLists();
            openListModal(newList.id);
            UI.showToast('New list created', 'success');
        } catch (error) {
            UI.showToast(error.message || 'Failed to create list', 'error');
        }
    }

    function openListModal(listId) {
        const list = state.lists.find(l => l.id === listId);
        if (!list) {
            return;
        }

        state.currentList = list;

        // Populate form
        document.getElementById('list-name-input').value = list.name;
        document.getElementById('list-category-input').value = list.category || '';
        document.getElementById('list-priority-input').value = list.priority || 'none';
        document.getElementById('list-tags-input').value = Utils.formatTags(list.tags);
        document.getElementById('list-deadline-input').value = list.deadline || '';

        // Update favorite button
        const favoriteBtn = document.getElementById('modal-favorite-btn');
        const favoriteSvg = favoriteBtn?.querySelector('svg');
        if (favoriteSvg) {
            favoriteSvg.setAttribute('fill', list.favorite ? 'currentColor' : 'none');
        }

        // Render items
        renderItems(list);

        // Show modal
        UI.showModal('list-modal');

        // Focus name input
        setTimeout(() => {
            const nameInput = document.getElementById('list-name-input');
            nameInput?.select();
        }, 100);
    }

    async function closeListModal() {
        // Auto-save any changes before closing
        if (state.currentList) {
            const name = document.getElementById('list-name-input').value.trim();

            // Only save if name is not empty
            if (name) {
                // Check if anything changed
                const currentName = state.currentList.name;
                const currentCategory = state.currentList.category || '';
                const currentPriority = state.currentList.priority || 'none';
                const currentTags = Utils.formatTags(state.currentList.tags);
                const currentDeadline = state.currentList.deadline || '';

                const newName = name;
                const newCategory = document.getElementById('list-category-input').value;
                const newPriority = document.getElementById('list-priority-input').value;
                const newTags = document.getElementById('list-tags-input').value;
                const newDeadline = document.getElementById('list-deadline-input').value || '';

                const hasChanges =
                    currentName !== newName ||
                    currentCategory !== newCategory ||
                    currentPriority !== newPriority ||
                    currentTags !== newTags ||
                    currentDeadline !== newDeadline;

                if (hasChanges) {
                    const updates = {
                        name: newName,
                        category: newCategory,
                        priority: newPriority,
                        tags: Utils.parseTags(newTags),
                        deadline: newDeadline || null
                    };

                    try {
                        await Storage.updateList(state.currentList.id, updates);
                        state.lists = await Storage.getLists();
                        UI.populateCategoryFilter(state.lists);
                        UI.populateTagFilter(state.lists);
                        renderLists();
                    } catch (error) {
                        console.error('Failed to auto-save list changes:', error);
                        UI.showToast('Failed to save changes', 'error');
                    }
                }
            }
        }

        UI.hideModal('list-modal');
        state.currentList = null;
        document.getElementById('new-item-input').value = '';
    }

    async function saveListChanges() {
        if (!state.currentList) {
            return;
        }

        const name = document.getElementById('list-name-input').value.trim();
        if (!name) {
            UI.showToast('List name is required', 'error');
            return;
        }

        const updates = {
            name,
            category: document.getElementById('list-category-input').value,
            priority: document.getElementById('list-priority-input').value,
            tags: Utils.parseTags(document.getElementById('list-tags-input').value),
            deadline: document.getElementById('list-deadline-input').value || null
        };

        try {
            await Storage.updateList(state.currentList.id, updates);
            state.lists = await Storage.getLists();
            state.currentList = state.lists.find(l => l.id === state.currentList.id);
            UI.populateCategoryFilter(state.lists);
            UI.populateTagFilter(state.lists);
            renderLists();
            UI.showToast('List updated', 'success');
        } catch (error) {
            UI.showToast('Failed to update list', 'error');
        }
    }

    async function toggleCurrentListFavorite() {
        if (!state.currentList) {
            return;
        }

        try {
            await Storage.updateList(state.currentList.id, {
                favorite: !state.currentList.favorite
            });
            state.lists = await Storage.getLists();
            state.currentList = state.lists.find(l => l.id === state.currentList.id);

            // Update favorite button
            const favoriteBtn = document.getElementById('modal-favorite-btn');
            const favoriteSvg = favoriteBtn?.querySelector('svg');
            if (favoriteSvg) {
                favoriteSvg.setAttribute(
                    'fill',
                    state.currentList.favorite ? 'currentColor' : 'none'
                );
            }

            renderLists();
            UI.showToast(
                state.currentList.favorite ? 'Added to favorites' : 'Removed from favorites',
                'success'
            );
        } catch (error) {
            UI.showToast('Failed to update favorite', 'error');
        }
    }

    async function deleteCurrentList() {
        if (!state.currentList) {
            return;
        }

        if (
            !UI.confirm(
                `Delete "${state.currentList.name}"? It will be moved to trash and recoverable for 14 days.`
            )
        ) {
            return;
        }

        try {
            await Storage.deleteList(state.currentList.id);
            state.lists = await Storage.getLists();
            UI.populateCategoryFilter(state.lists);
            UI.populateTagFilter(state.lists);
            closeListModal();
            renderLists();
            UI.showToast('List deleted', 'success');
        } catch (error) {
            UI.showToast('Failed to delete list', 'error');
        }
    }

    function handleListClick(e) {
        const card = e.target.closest('.list-card');
        if (card) {
            const listId = card.dataset.listId;
            openListModal(listId);
        }
    }

    // ===================================
    // Item Operations
    // ===================================

    async function addItem() {
        if (!state.currentList) {
            return;
        }

        const input = document.getElementById('new-item-input');
        const text = input.value.trim();

        if (!text) {
            UI.showToast('Please enter an item', 'warning');
            return;
        }

        const newItem = {
            id: Utils.generateId(),
            text,
            completed: false,
            notes: '',
            addedDate: Utils.getCurrentTimestamp(),
            source: 'user'
        };

        const updatedItems = [...state.currentList.items, newItem];

        try {
            await Storage.updateList(state.currentList.id, {
                items: updatedItems,
                metadata: {
                    ...state.currentList.metadata,
                    itemCount: updatedItems.length,
                    completedCount: updatedItems.filter(i => i.completed).length
                }
            });

            state.lists = await Storage.getLists();
            state.currentList = state.lists.find(l => l.id === state.currentList.id);
            renderItems(state.currentList);
            renderLists();
            input.value = '';
            UI.showToast('Item added', 'success');
        } catch (error) {
            UI.showToast('Failed to add item', 'error');
        }
    }

    async function handleItemCheck(e) {
        if (e.target.type !== 'checkbox') {
            return;
        }
        if (!state.currentList) {
            return;
        }

        const itemEl = e.target.closest('.item');
        const itemId = itemEl?.dataset.itemId;
        if (!itemId) {
            return;
        }

        const updatedItems = state.currentList.items.map(item => {
            if (item.id === itemId) {
                return { ...item, completed: e.target.checked };
            }
            return item;
        });

        try {
            await Storage.updateList(state.currentList.id, {
                items: updatedItems,
                metadata: {
                    ...state.currentList.metadata,
                    completedCount: updatedItems.filter(i => i.completed).length
                }
            });

            state.lists = await Storage.getLists();
            state.currentList = state.lists.find(l => l.id === state.currentList.id);
            renderItems(state.currentList);
            renderLists();
        } catch (error) {
            UI.showToast('Failed to update item', 'error');
            e.target.checked = !e.target.checked;
        }
    }

    async function handleItemAction(e) {
        if (!state.currentList) {
            return;
        }

        const deleteBtn = e.target.closest('.item-delete');
        if (deleteBtn) {
            const itemEl = deleteBtn.closest('.item');
            const itemId = itemEl?.dataset.itemId;
            if (!itemId) {
                return;
            }

            if (!UI.confirm('Delete this item?')) {
                return;
            }

            const updatedItems = state.currentList.items.filter(item => item.id !== itemId);

            try {
                await Storage.updateList(state.currentList.id, {
                    items: updatedItems,
                    metadata: {
                        ...state.currentList.metadata,
                        itemCount: updatedItems.length,
                        completedCount: updatedItems.filter(i => i.completed).length
                    }
                });

                state.lists = await Storage.getLists();
                state.currentList = state.lists.find(l => l.id === state.currentList.id);
                renderItems(state.currentList);
                renderLists();
                UI.showToast('Item deleted', 'success');
            } catch (error) {
                UI.showToast('Failed to delete item', 'error');
            }
        }
    }

    // ===================================
    // AI Features
    // ===================================

    async function generateSuggestions() {
        if (!state.currentList) {
            return;
        }

        // Get AI settings
        const aiSettings = state.settings.ai || {};
        const apiKey = Utils.decodeBase64(aiSettings.apiKey || state.settings.apiKey || '');
        const provider = aiSettings.provider || 'claude';
        const model = aiSettings.model || '';

        if (!apiKey) {
            UI.showToast('Please add your AI API key in settings', 'warning');
            openSettings();
            return;
        }

        const btn = document.getElementById('ai-suggest-btn');
        UI.setButtonLoading(btn, true);

        try {
            const suggestions = await ClaudeAPI.generateListSuggestions(
                apiKey,
                {
                    name: state.currentList.name,
                    category: state.currentList.category,
                    tags: state.currentList.tags,
                    items: state.currentList.items
                },
                provider,
                model
            );

            renderSuggestions(suggestions);
            UI.showAiPanel();
            UI.showToast('Suggestions generated!', 'success');
        } catch (error) {
            UI.showToast(ClaudeAPI.getErrorMessage(error), 'error');
        } finally {
            UI.setButtonLoading(btn, false);
        }
    }

    function renderSuggestions(suggestions) {
        const list = document.getElementById('suggestions-list');
        if (!list) {
            return;
        }

        list.innerHTML = '';

        suggestions.forEach((suggestion, index) => {
            const item = UI.createSuggestionElement(suggestion, index);
            list.appendChild(item);
        });
    }

    function addSelectedSuggestions() {
        if (!state.currentList) {
            return;
        }

        const checkboxes = document.querySelectorAll(
            '#suggestions-list input[type="checkbox"]:checked'
        );
        const selectedTexts = Array.from(checkboxes)
            .map(cb => {
                const label = cb.nextElementSibling;
                return label?.textContent.trim();
            })
            .filter(Boolean);

        if (selectedTexts.length === 0) {
            UI.showToast('No suggestions selected', 'warning');
            return;
        }

        addSuggestionsToList(selectedTexts);
    }

    function addAllSuggestions() {
        const labels = document.querySelectorAll('#suggestions-list .suggestion-text');
        const allTexts = Array.from(labels)
            .map(label => label.textContent.trim())
            .filter(Boolean);

        if (allTexts.length === 0) {
            UI.showToast('No suggestions available', 'warning');
            return;
        }

        addSuggestionsToList(allTexts);
    }

    async function addSuggestionsToList(suggestions) {
        if (!state.currentList) {
            return;
        }

        const newItems = suggestions.map(text => ({
            id: Utils.generateId(),
            text,
            completed: false,
            notes: '',
            addedDate: Utils.getCurrentTimestamp(),
            source: 'ai'
        }));

        const updatedItems = [...state.currentList.items, ...newItems];

        try {
            await Storage.updateList(state.currentList.id, {
                items: updatedItems,
                metadata: {
                    ...state.currentList.metadata,
                    itemCount: updatedItems.length,
                    completedCount: updatedItems.filter(i => i.completed).length
                }
            });

            state.lists = await Storage.getLists();
            state.currentList = state.lists.find(l => l.id === state.currentList.id);
            renderItems(state.currentList);
            renderLists();
            UI.hideAiPanel();
            UI.showToast(`Added ${suggestions.length} suggestion(s)`, 'success');
        } catch (error) {
            UI.showToast('Failed to add suggestions', 'error');
        }
    }

    async function testApiConnection() {
        const apiKeyInput = document.getElementById('api-key-input');
        const apiKey = apiKeyInput?.value.trim();

        if (!apiKey) {
            UI.showToast('Please enter an API key', 'warning');
            return;
        }

        // Get provider (default to claude for now - UI will be added later)
        const provider = state.settings.ai?.provider || 'claude';
        const model = state.settings.ai?.model || '';

        const btn = document.getElementById('test-api-btn');
        UI.setButtonLoading(btn, true);

        try {
            const result = await ClaudeAPI.testConnection(apiKey, provider, model);

            if (result.success) {
                // Save API key to .env.local via new endpoint
                await Storage.saveApiKey(provider, apiKey, model);
                await Storage.updateSetting('ai.enabled', true);
                state.settings = await Storage.getSettings();
                updateAiButtonVisibility();
                UI.showToast(result.message, 'success');
            } else {
                console.error('API test failed:', result.message);
                UI.showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('Connection test error:', error);
            UI.showToast('Connection test failed: ' + error.message, 'error');
        } finally {
            UI.setButtonLoading(btn, false);
        }
    }

    function updateAiButtonVisibility() {
        const aiGroup = document.getElementById('ai-suggest-group');
        if (aiGroup) {
            aiGroup.style.display = state.settings.ai.enabled ? 'flex' : 'none';
        }

        const aiCheckbox = document.getElementById('ai-enabled-checkbox');
        if (aiCheckbox) {
            aiCheckbox.checked = state.settings.ai.enabled;
        }
    }

    async function toggleAiFeatures(e) {
        const enabled = e.target.checked;
        await Storage.updateSetting('ai.enabled', enabled);
        state.settings = await Storage.getSettings();
        updateAiButtonVisibility();
    }

    // ===================================
    // Settings
    // ===================================

    function openSettings() {
        // Populate current settings
        const apiKey = Utils.decodeBase64(state.settings.ai?.apiKey || state.settings.apiKey || '');
        document.getElementById('api-key-input').value = apiKey || '';
        document.getElementById('theme-select').value = state.settings.display.theme;
        document.getElementById('ai-enabled-checkbox').checked = state.settings.ai.enabled;

        UI.showModal('settings-modal');
    }

    function closeSettings() {
        UI.hideModal('settings-modal');
    }

    async function changeTheme(e) {
        const theme = e.target.value;
        await Storage.updateSetting('display.theme', theme);
        state.settings = await Storage.getSettings();
        UI.updateTheme(theme);
        UI.showToast(`Theme changed to ${theme}`, 'success');
    }

    async function toggleView() {
        const currentView = state.settings.display.view;
        const newView = currentView === 'grid' ? 'list' : 'grid';
        await Storage.updateSetting('display.view', newView);
        state.settings = await Storage.getSettings();
        UI.updateViewMode(newView);
    }

    // ===================================
    // Data Import/Export
    // ===================================

    async function exportData() {
        try {
            const data = await Storage.exportData();
            const filename = `list-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
            Utils.downloadJson(data, filename);
            UI.showToast('Data exported successfully', 'success');
        } catch (error) {
            UI.showToast('Failed to export data', 'error');
        }
    }

    function importData() {
        const fileInput = document.getElementById('file-input');
        fileInput?.click();
    }

    async function handleFileImport(e) {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }

        try {
            const data = await Utils.readJsonFile(file);
            const result = await Storage.importData(data);

            if (result.success) {
                state.lists = await Storage.getLists();
                state.settings = await Storage.getSettings();
                UI.populateCategoryFilter(state.lists);
                UI.populateTagFilter(state.lists);
                renderLists();
                UI.updateTheme(state.settings.display.theme);
                UI.updateViewMode(state.settings.display.view);
                updateAiButtonVisibility();
                UI.showToast(result.message, 'success');
            } else {
                UI.showToast(result.message, 'error');
            }
        } catch (error) {
            UI.showToast(error.message || 'Failed to import data', 'error');
        } finally {
            // Reset file input
            e.target.value = '';
        }
    }

    async function clearAllData() {
        if (
            !UI.confirm(
                'Are you sure you want to delete ALL lists and settings? This cannot be undone!'
            )
        ) {
            return;
        }

        if (!UI.confirm('This will permanently delete everything. Are you absolutely sure?')) {
            return;
        }

        try {
            await Storage.clearAllData();
            state.lists = [];
            state.settings = await Storage.getSettings();
            state.currentList = null;
            state.filters = {
                search: '',
                category: '',
                tag: '',
                favoritesOnly: false
            };

            UI.populateCategoryFilter(state.lists);
            UI.populateTagFilter(state.lists);
            renderLists();
            UI.hideModal('settings-modal');
            UI.showToast('All data cleared', 'success');
        } catch (error) {
            UI.showToast('Failed to clear data', 'error');
        }
    }
})();
