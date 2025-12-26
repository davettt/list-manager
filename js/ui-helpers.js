// ===================================
// UI Helper Functions
// ===================================

const UI = (function () {
    'use strict';

    /**
     * Show a toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {number} duration - Duration in ms (default 3000)
     */
    function showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) {
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
        <span class="toast-message">${Utils.sanitizeHtml(message)}</span>
        <button class="toast-close" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;

        // Add close button handler
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.remove();
        });

        container.appendChild(toast);

        // Auto-remove after duration
        setTimeout(() => {
            toast.remove();
        }, duration);
    }

    /**
     * Show a modal
     * @param {string} modalId - Modal element ID
     */
    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            return;
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Focus first input
        const firstInput = modal.querySelector('input, textarea, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    /**
     * Hide a modal
     * @param {string} modalId - Modal element ID
     */
    function hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            return;
        }

        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @returns {boolean} User confirmation
     */
    function confirm(message) {
        return window.confirm(message);
    }

    /**
     * Show the AI suggestions panel
     */
    function showAiPanel() {
        const panel = document.getElementById('ai-panel');
        if (panel) {
            panel.classList.add('active');
        }
    }

    /**
     * Hide the AI suggestions panel
     */
    function hideAiPanel() {
        const panel = document.getElementById('ai-panel');
        if (panel) {
            panel.classList.remove('active');
        }
    }

    /**
     * Show empty state
     */
    function showEmptyState() {
        const emptyState = document.getElementById('empty-state');
        const listsContainer = document.getElementById('lists-container');

        if (emptyState) {
            emptyState.style.display = 'block';
        }
        if (listsContainer) {
            listsContainer.style.display = 'none';
        }
    }

    /**
     * Hide empty state
     */
    function hideEmptyState() {
        const emptyState = document.getElementById('empty-state');
        const listsContainer = document.getElementById('lists-container');

        if (emptyState) {
            emptyState.style.display = 'none';
        }
        if (listsContainer) {
            listsContainer.style.display = '';
        }
    }

    /**
     * Set loading state on button
     * @param {HTMLElement} button - Button element
     * @param {boolean} loading - Loading state
     */
    function setButtonLoading(button, loading) {
        if (!button) {
            return;
        }

        if (loading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.innerHTML = '<span class="loading"></span>';
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || 'Submit';
            delete button.dataset.originalText;
        }
    }

    /**
     * Create list card element
     * @param {Object} list - List object
     * @returns {HTMLElement} Card element
     */
    function createListCard(list) {
        const card = document.createElement('div');
        card.className = 'list-card';
        card.dataset.listId = list.id;

        const favoriteClass = list.favorite ? 'active' : 'inactive';
        const categoryBadge = list.category
            ? `<span class="category-badge ${list.category}">${list.category}</span>`
            : '';

        const priorityBadge =
            list.priority && list.priority !== 'none'
                ? `<span class="priority-badge ${list.priority}">${list.priority}</span>`
                : '';

        const tags =
            list.tags && list.tags.length > 0
                ? `<div class="tag-list">${list.tags.map(tag => `<span class="tag">${Utils.sanitizeHtml(tag)}</span>`).join('')}</div>`
                : '';

        const completedCount = list.metadata?.completedCount || 0;
        const totalCount = list.metadata?.itemCount || 0;
        const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        card.innerHTML = `
        <div class="list-card-header">
            <h3 class="list-card-title">${Utils.sanitizeHtml(list.name)}</h3>
            <svg class="list-card-favorite ${favoriteClass}" width="20" height="20" viewBox="0 0 24 24" fill="${list.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
        </div>
        <div class="list-card-meta">
            ${categoryBadge}
            ${priorityBadge}
        </div>
        ${tags}
        <div class="list-card-stats">
            <span>${totalCount} item${totalCount !== 1 ? 's' : ''}</span>
            <span>${progress}% complete</span>
        </div>
        <div class="list-card-footer">
            <span>Modified ${formatRelativeTime(list.metadata?.modified)}</span>
        </div>
    `;

        return card;
    }

    /**
     * Create item element
     * @param {Object} item - Item object
     * @returns {HTMLElement} Item element
     */
    function createItemElement(item) {
        const li = document.createElement('li');
        li.className = 'item';
        li.dataset.itemId = item.id;

        const checkedAttr = item.completed ? 'checked' : '';
        const completedClass = item.completed ? 'completed' : '';
        const aiBadge = item.source === 'ai' ? '<span class="item-ai-badge">✨</span>' : '';

        li.innerHTML = `
        <input type="checkbox" ${checkedAttr} aria-label="Mark as complete">
        <div class="item-content">
            <span class="item-text ${completedClass}">${Utils.sanitizeHtml(item.text)}</span>
            ${aiBadge}
        </div>
        <div class="item-actions">
            <button class="btn btn-secondary item-delete" aria-label="Delete item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        </div>
    `;

        return li;
    }

    /**
     * Create suggestion item element
     * @param {string} text - Suggestion text
     * @param {number} index - Index
     * @returns {HTMLElement} Suggestion element
     */
    function createSuggestionElement(text, index) {
        const li = document.createElement('li');
        li.className = 'suggestion-item';

        li.innerHTML = `
        <input type="checkbox" id="suggestion-${index}" checked>
        <label for="suggestion-${index}" class="suggestion-text">${Utils.sanitizeHtml(text)}</label>
    `;

        return li;
    }

    /**
     * Format relative time
     * @param {string} isoString - ISO timestamp
     * @returns {string} Relative time
     */
    function formatRelativeTime(isoString) {
        if (!isoString) {
            return 'Never';
        }

        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
            return 'just now';
        }
        if (diffMins < 60) {
            return `${diffMins}m ago`;
        }
        if (diffHours < 24) {
            return `${diffHours}h ago`;
        }
        if (diffDays < 7) {
            return `${diffDays}d ago`;
        }

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    /**
     * Update view mode (grid/list)
     * @param {string} view - 'grid' or 'list'
     */
    function updateViewMode(view) {
        const container = document.getElementById('lists-container');
        const gridIcon = document.getElementById('grid-icon');
        const listIcon = document.getElementById('list-icon');

        if (!container) {
            return;
        }

        if (view === 'grid') {
            container.className = 'lists-grid';
            if (gridIcon) {
                gridIcon.style.display = 'block';
            }
            if (listIcon) {
                listIcon.style.display = 'none';
            }
        } else {
            container.className = 'lists-list';
            if (gridIcon) {
                gridIcon.style.display = 'none';
            }
            if (listIcon) {
                listIcon.style.display = 'block';
            }
        }
    }

    /**
     * Update theme
     * @param {string} theme - 'light', 'dark', or 'auto'
     */
    function updateTheme(theme) {
        document.body.dataset.theme = theme;
    }

    /**
     * Update font family
     * @param {string} font - 'system', 'serif', 'sans', 'mono', or 'readable'
     */
    function updateFont(font) {
        const fontMap = {
            system: 'var(--font-family-system)',
            serif: 'var(--font-family-serif)',
            sans: 'var(--font-family-sans)',
            mono: 'var(--font-family-mono)',
            readable: 'var(--font-family-readable)',
            classic: 'var(--font-family-classic)'
        };
        const fontValue = fontMap[font] || fontMap.system;
        document.documentElement.style.setProperty('--font-family-base', fontValue);
    }

    /**
     * Update font size scale
     * @param {number} scale - Font size as percentage (75-150)
     */
    function updateFontSize(scale) {
        const clampedScale = Math.max(75, Math.min(150, scale));
        document.documentElement.style.setProperty('--font-size-scale', clampedScale);
        const valueEl = document.getElementById('font-size-value');
        if (valueEl) {
            valueEl.textContent = `${clampedScale}%`;
        }
        return clampedScale;
    }

    /**
     * Populate category filter options
     * @param {Array} lists - Array of lists
     */
    function populateCategoryFilter(lists) {
        const select = document.getElementById('category-filter');
        if (!select) {
            return;
        }

        const categories = [...new Set(lists.map(list => list.category).filter(Boolean))];

        // Keep "All Categories" option
        select.innerHTML = '<option value="">All Categories</option>';

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            select.appendChild(option);
        });
    }

    /**
     * Populate tag filter options
     * @param {Array} lists - Array of lists
     */
    function populateTagFilter(lists) {
        const select = document.getElementById('tag-filter');
        if (!select) {
            return;
        }

        const allTags = lists.flatMap(list => list.tags || []);
        const uniqueTags = [...new Set(allTags)];

        // Keep "All Tags" option
        select.innerHTML = '<option value="">All Tags</option>';

        uniqueTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            select.appendChild(option);
        });
    }

    /**
     * Clear form inputs
     * @param {string} formId - Form element ID
     */
    function clearForm(formId) {
        const form = document.getElementById(formId);
        if (!form) {
            return;
        }

        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
    }

    /**
     * Scroll to top
     */
    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Expose public API
    return {
        showToast,
        showModal,
        hideModal,
        confirm,
        showAiPanel,
        hideAiPanel,
        showEmptyState,
        hideEmptyState,
        setButtonLoading,
        createListCard,
        createItemElement,
        createSuggestionElement,
        updateViewMode,
        updateTheme,
        updateFont,
        updateFontSize,
        populateCategoryFilter,
        populateTagFilter,
        clearForm,
        scrollToTop
    };
})();

// Expose to global scope
window.UI = UI;
