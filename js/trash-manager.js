/**
 * Trash Manager
 * Handles trash UI, recovery, and permanent deletion
 */

// eslint-disable-next-line no-unused-vars
const TrashManager = (() => {
    const elements = {
        trashBtn: () => document.getElementById('trash-btn'),
        trashModal: () => document.getElementById('trash-modal'),
        trashModalClose: () => document.getElementById('trash-modal-close'),
        trashList: () => document.getElementById('trash-list'),
        trashEmpty: () => document.getElementById('trash-empty')
    };

    const state = {
        trashItems: [],
        updateInterval: null,
        countBadgeUpdateInterval: null
    };

    /**
     * Initialize trash manager
     */
    function initialize() {
        const trashBtn = elements.trashBtn();
        const trashModalClose = elements.trashModalClose();

        if (trashBtn) {
            trashBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                openTrash();
            });
            // Add title attribute for clarity
            trashBtn.title = 'View trash (recoverable items)';
        } else {
            console.error('❌ Trash button not found in DOM');
        }

        if (trashModalClose) {
            trashModalClose.addEventListener('click', closeTrash);
        } else {
            console.warn('Trash modal close button not found');
        }

        // Close modal when clicking outside
        const trashModal = elements.trashModal();
        if (trashModal) {
            trashModal.addEventListener('click', e => {
                if (e.target === trashModal) {
                    closeTrash();
                }
            });
        } else {
            console.warn('Trash modal not found');
        }

        // Load trash count on init
        updateTrashCountBadge();

        // Update count every 30 seconds
        if (state.countBadgeUpdateInterval) {
            clearInterval(state.countBadgeUpdateInterval);
        }
        state.countBadgeUpdateInterval = setInterval(() => {
            updateTrashCountBadge();
        }, 30000);
    }

    /**
     * Update trash count badge
     */
    async function updateTrashCountBadge() {
        try {
            const response = await fetch('/api/data/trash');
            if (!response.ok) {
                return;
            }
            const trash = await response.json();
            const count = trash.length;

            const badge = document.getElementById('trash-count-badge');
            if (badge) {
                if (count > 0) {
                    badge.textContent = count > 99 ? '99+' : count;
                    badge.hidden = false;
                } else {
                    badge.hidden = true;
                }
            }
        } catch (error) {
            console.error('Error updating trash count badge:', error);
        }
    }

    /**
     * Open trash modal and load items
     */
    async function openTrash() {
        try {
            const response = await fetch('/api/data/trash');

            if (!response.ok) {
                throw new Error('Failed to load trash');
            }

            state.trashItems = await response.json();
            renderTrash();
            updateTrashCountBadge();

            // Show modal using UI helper
            // eslint-disable-next-line no-undef
            UI.showModal('trash-modal');

            // Start updating countdown timers
            startCountdownUpdates();
        } catch (error) {
            console.error('Error opening trash:', error);
            // eslint-disable-next-line no-undef
            UI.showToast('Failed to load trash', 'error');
        }
    }

    /**
     * Close trash modal
     */
    function closeTrash() {
        // eslint-disable-next-line no-undef
        UI.hideModal('trash-modal');

        // Stop countdown updates
        if (state.updateInterval) {
            clearInterval(state.updateInterval);
            state.updateInterval = null;
        }
    }

    /**
     * Render trash items
     */
    function renderTrash() {
        const trashList = elements.trashList();
        const trashEmpty = elements.trashEmpty();

        if (!trashList || !trashEmpty) {
            return;
        }

        if (state.trashItems.length === 0) {
            trashList.innerHTML = '';
            trashEmpty.hidden = false;
            return;
        }

        trashEmpty.hidden = true;
        trashList.innerHTML = state.trashItems.map(item => createTrashItemHTML(item)).join('');

        // Add event listeners to trash item buttons
        state.trashItems.forEach(item => {
            const restoreBtn = document.getElementById(`trash-restore-${item.id}`);
            const deleteBtn = document.getElementById(`trash-delete-${item.id}`);

            if (restoreBtn) {
                restoreBtn.addEventListener('click', () => restoreItem(item.type, item.id));
            }
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () =>
                    permanentlyDeleteItem(item.type, item.id)
                );
            }
        });
    }

    /**
     * Create HTML for a trash item
     */
    function createTrashItemHTML(item) {
        const deletedDate = new Date(item.deletedAt);
        const deletedDateStr = deletedDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const daysRemaining = item.daysRemaining;
        const isDaysMedium = daysRemaining > 3 && daysRemaining <= 7;
        const isDaysLow = daysRemaining <= 3;

        let dayColor = 'green';
        if (isDaysLow) {
            dayColor = 'red';
        } else if (isDaysMedium) {
            dayColor = 'orange';
        }

        let itemTitle = '';
        let itemInfo = '';
        let typeLabel = '';

        if (item.type === 'note') {
            itemTitle = item.data.metadata.title || 'Untitled Note';
            itemInfo = `${item.data.metadata.metadata.wordCount} words`;
            typeLabel = 'Note';
        } else if (item.type === 'list') {
            itemTitle = item.data.name || 'Untitled List';
            itemInfo = `${item.data.items?.length || 0} items`;
            typeLabel = 'List';
        }

        return `
            <div class="trash-item" data-id="${item.id}" data-type="${item.type}">
                <div class="trash-item-header">
                    <div class="trash-item-title">
                        <strong>${item.type === 'note' ? '📝' : '📋'} ${Utils.sanitizeHtml(itemTitle)}</strong>
                        <span class="trash-item-type-badge">${typeLabel}</span>
                    </div>
                    <div class="trash-item-days" style="color: ${dayColor}; font-weight: bold;">
                        ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left
                    </div>
                </div>
                <div class="trash-item-info">
                    <small>${itemInfo} • Deleted: ${deletedDateStr}</small>
                </div>
                <div class="trash-item-actions">
                    <button
                        id="trash-restore-${item.id}"
                        class="btn btn-small btn-primary"
                        title="Restore this ${item.type}"
                    >
                        ↩️ Restore
                    </button>
                    <button
                        id="trash-delete-${item.id}"
                        class="btn btn-small btn-danger"
                        title="Permanently delete this ${item.type}"
                    >
                        🗑️ Delete Forever
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Restore item from trash
     */
    async function restoreItem(type, id) {
        try {
            const item = state.trashItems.find(i => i.id === id && i.type === type);
            if (!item) {
                // eslint-disable-next-line no-undef
                UI.showToast('Item not found in trash', 'error');
                return;
            }

            const itemTitle = type === 'note' ? item.data.metadata.title : item.data.name;

            // Ask for confirmation
            if (
                !confirm(
                    `Restore "${itemTitle}"? It will be restored to your ${type === 'note' ? 'notes' : 'lists'}.`
                )
            ) {
                return;
            }

            const response = await fetch(`/api/data/trash/${type}/${id}/restore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Failed to restore item');
            }

            // Remove from trash list
            state.trashItems = state.trashItems.filter(i => !(i.id === id && i.type === type));
            renderTrash();

            // Update count badge immediately
            await updateTrashCountBadge();

            // eslint-disable-next-line no-undef
            UI.showToast(
                `${type.charAt(0).toUpperCase() + type.slice(1)} restored successfully`,
                'success'
            );

            // Reload page to refresh both lists and notes views with restored item
            setTimeout(() => {
                location.reload();
            }, 800);
        } catch (error) {
            console.error('Error restoring item:', error);
            // eslint-disable-next-line no-undef
            UI.showToast('Failed to restore item', 'error');
        }
    }

    /**
     * Permanently delete item from trash
     */
    async function permanentlyDeleteItem(type, id) {
        try {
            const item = state.trashItems.find(i => i.id === id && i.type === type);
            if (!item) {
                // eslint-disable-next-line no-undef
                UI.showToast('Item not found in trash', 'error');
                return;
            }

            const itemTitle = type === 'note' ? item.data.metadata.title : item.data.name;

            // Show strong warning
            const message =
                `⚠️ PERMANENTLY DELETE?\n\n` +
                `"${itemTitle}"\n\n` +
                `This will PERMANENTLY delete the ${type} from trash.\n` +
                `This action CANNOT be undone.\n\n` +
                `Type "yes" to confirm:`;

            const confirmation = prompt(message);

            if (confirmation !== 'yes') {
                return;
            }

            const response = await fetch(`/api/data/trash/${type}/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Failed to permanently delete item');
            }

            // Remove from trash list
            state.trashItems = state.trashItems.filter(i => !(i.id === id && i.type === type));
            renderTrash();

            // Update count badge immediately
            await updateTrashCountBadge();

            // eslint-disable-next-line no-undef
            UI.showToast(
                `${type.charAt(0).toUpperCase() + type.slice(1)} permanently deleted`,
                'success'
            );
        } catch (error) {
            console.error('Error permanently deleting item:', error);
            // eslint-disable-next-line no-undef
            UI.showToast('Failed to permanently delete item', 'error');
        }
    }

    /**
     * Start updating countdown timers
     */
    function startCountdownUpdates() {
        // Update every 60 seconds
        if (state.updateInterval) {
            clearInterval(state.updateInterval);
        }

        state.updateInterval = setInterval(() => {
            // Recalculate days remaining
            state.trashItems.forEach(item => {
                const deletedDate = new Date(item.deletedAt);
                const now = new Date();
                const daysOld = Math.floor((now - deletedDate) / (24 * 60 * 60 * 1000));
                item.daysRemaining = Math.max(0, 14 - daysOld);
            });

            // Re-render to update countdowns
            renderTrash();
        }, 60000); // Update every minute
    }

    // Public API
    return {
        initialize,
        openTrash,
        closeTrash
    };
})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    TrashManager.initialize();
});

// Also try immediate initialization in case DOM is already loaded
if (document.readyState !== 'loading') {
    TrashManager.initialize();
}
