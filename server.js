/**
 * List Manager Development Server
 *
 * This server provides:
 * 1. Static file serving for the app
 * 2. API proxy to bypass CORS restrictions for Claude API
 *
 * Usage: npm run dev
 */

import express from 'express';
import cors from 'cors';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { existsSync, unlinkSync, readFileSync } from 'fs';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';
import { marked } from 'marked';
import puppeteer from 'puppeteer';

// Load environment variables from local_data/.env.local (user's keys)
dotenv.config({
    path: path.join(path.dirname(fileURLToPath(import.meta.url)), 'local_data', '.env.local')
});

// ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const DEFAULT_PORT = process.env.PORT || 3000;

// ===================================
// Note Filename Utilities
// ===================================

/**
 * Convert title to slug format (spaces → hyphens, lowercase, remove special chars)
 * @param {string} title - Note title
 * @returns {string} Slugified title
 */
function slugifyTitle(title) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .slice(0, 50); // Max 50 chars for filename
}

/**
 * Get short ID (first 8 chars of UUID)
 * @param {string} uuid - Full UUID
 * @returns {string} Short ID
 */
function getShortId(uuid) {
    return uuid.substring(0, 8);
}

/**
 * Build new note filename from title and ID
 * @param {string} title - Note title
 * @param {string} noteId - Note ID (UUID)
 * @returns {string} Filename without extension
 */
function buildNoteFilename(title, noteId) {
    const slug = slugifyTitle(title);
    const shortId = getShortId(noteId);
    // If slug is empty, use just the ID
    return slug ? `${slug}_${shortId}` : shortId;
}

/**
 * Check if file is old UUID format or new format
 * @param {string} filename - Filename without extension
 * @returns {boolean} True if old UUID format
 */
function isOldFormat(filename) {
    // Old format is just UUID (36 chars, contains hyphens)
    return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(filename);
}

/**
 * Extract note ID from new format filename
 * @param {string} filename - Filename (e.g., "camera-tips_f4efc755")
 * @returns {string} Short ID (e.g., "f4efc755")
 */
function extractShortIdFromFilename(filename) {
    const lastUnderscore = filename.lastIndexOf('_');
    if (lastUnderscore === -1) {
        return null;
    }
    return filename.substring(lastUnderscore + 1);
}

/**
 * Check if a port is available
 * @param {number} port - Port to check
 * @returns {Promise<boolean>} True if port is available
 */
async function isPortAvailable(port) {
    return new Promise(resolve => {
        const server = app.listen(port, () => {
            server.close(() => resolve(true));
        });
        server.on('error', () => resolve(false));
    });
}

/**
 * Find next available port starting from a base port
 * @param {number} startPort - Port to start checking from
 * @returns {Promise<number>} First available port
 */
async function findAvailablePort(startPort) {
    let port = startPort;
    while (port < startPort + 10) {
        // Check up to 10 ports
        if (await isPortAvailable(port)) {
            return port;
        }
        port++;
    }
    throw new Error(`No available ports found between ${startPort} and ${port - 1}`);
}

// Middleware
app.use(cors());
// Set request size limits (prevent large payload attacks)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Serve static files
app.use(express.static(__dirname));

// Data directory path
const DATA_DIR = path.join(__dirname, 'local_data');
const LISTS_FILE = path.join(DATA_DIR, 'lists.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const NOTES_DIR = path.join(DATA_DIR, 'notes');
const ENV_FILE = path.join(DATA_DIR, '.env.local');
const LOCK_FILE = path.join(DATA_DIR, '.lock');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');

// Ensure data directories exist
if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
}
if (!existsSync(NOTES_DIR)) {
    await mkdir(NOTES_DIR, { recursive: true });
}

// ===================================
// Note Migration (UUID → Title_ShortID)
// ===================================

/**
 * Migrate notes from old UUID filename format to new {title}_{shortId} format
 */
async function migrateNoteFilenames() {
    try {
        // Check if notes.json exists
        if (!existsSync(NOTES_FILE)) {
            return; // No notes to migrate
        }

        const notesData = await readFile(NOTES_FILE, 'utf-8');
        const notes = JSON.parse(notesData);

        let needsSave = false;
        const migratedNotes = [];

        for (const note of notes) {
            const oldNoteFile = path.join(NOTES_DIR, `${note.id}.md`);
            const newFilename = buildNoteFilename(note.title, note.id);
            const newNoteFile = path.join(NOTES_DIR, `${newFilename}.md`);

            // Check if old file exists
            if (existsSync(oldNoteFile) && oldNoteFile !== newNoteFile) {
                try {
                    const content = await readFile(oldNoteFile, 'utf-8');
                    await writeFile(newNoteFile, content);
                    await unlink(oldNoteFile);
                    console.log(`✓ Migrated note: ${note.id} → ${newFilename}`);
                    needsSave = true;
                } catch (err) {
                    console.error(`Failed to migrate note ${note.id}:`, err.message);
                }
            } else if (!existsSync(oldNoteFile) && !existsSync(newNoteFile)) {
                // Neither file exists - note might have been deleted
                console.warn(`Note file missing for ${note.id} (${note.title})`);
            }

            migratedNotes.push(note);
        }

        if (needsSave) {
            console.log('Migration completed. Notes structure updated.');
        }
    } catch (err) {
        console.error('Note migration error:', err);
    }
}

// Run migration on startup
await migrateNoteFilenames();

// ===================================
// Trash System (14-day retention)
// ===================================

const TRASH_DIR = path.join(DATA_DIR, '.trash');
const TRASH_LISTS_DIR = path.join(TRASH_DIR, 'lists');
const TRASH_NOTES_DIR = path.join(TRASH_DIR, 'notes');
const TRASH_FILE = path.join(TRASH_DIR, 'trash.json');
const TRASH_RETENTION_DAYS = 14;

/**
 * Initialize trash directories
 */
async function initializeTrash() {
    try {
        if (!existsSync(TRASH_DIR)) {
            await mkdir(TRASH_DIR, { recursive: true });
        }
        if (!existsSync(TRASH_LISTS_DIR)) {
            await mkdir(TRASH_LISTS_DIR, { recursive: true });
        }
        if (!existsSync(TRASH_NOTES_DIR)) {
            await mkdir(TRASH_NOTES_DIR, { recursive: true });
        }
        if (!existsSync(TRASH_FILE)) {
            await writeFile(TRASH_FILE, JSON.stringify([], null, 2));
        }
    } catch (err) {
        console.error('Error initializing trash:', err);
    }
}

/**
 * Move item to trash
 * @param {string} type - 'list' or 'note'
 * @param {string} id - Item ID
 * @param {object} data - Item data to store
 */
async function moveToTrash(type, id, data) {
    try {
        await initializeTrash();

        const timestamp = new Date().toISOString();
        const trashEntry = {
            id,
            type,
            deletedAt: timestamp,
            data
        };

        // Read trash index
        let trash = [];
        if (existsSync(TRASH_FILE)) {
            const content = await readFile(TRASH_FILE, 'utf-8');
            trash = JSON.parse(content);
        }

        // Add entry to trash index
        trash.push(trashEntry);
        await writeFile(TRASH_FILE, JSON.stringify(trash, null, 2));

        // Store full data based on type
        if (type === 'list') {
            const trashPath = path.join(TRASH_LISTS_DIR, `${id}_${Date.now()}.json`);
            await writeFile(trashPath, JSON.stringify(data, null, 2));
        } else if (type === 'note') {
            const metadata = data.metadata;
            const content = data.content;

            // Store metadata
            const metadataPath = path.join(TRASH_NOTES_DIR, `${id}_${Date.now()}.json`);
            await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

            // Store content
            const contentPath = path.join(TRASH_NOTES_DIR, `${id}_${Date.now()}.md`);
            await writeFile(contentPath, content);
        }

        console.log(`✓ Moved ${type} to trash: ${id}`);
        return trashEntry;
    } catch (err) {
        console.error('Error moving to trash:', err);
        throw err;
    }
}

/**
 * Get all trashed items
 */
async function getTrash() {
    try {
        if (!existsSync(TRASH_FILE)) {
            return [];
        }
        const content = await readFile(TRASH_FILE, 'utf-8');
        return JSON.parse(content);
    } catch (err) {
        console.error('Error reading trash:', err);
        return [];
    }
}

/**
 * Restore item from trash
 * @param {string} type - 'list' or 'note'
 * @param {string} id - Item ID
 */
async function restoreFromTrash(type, id) {
    try {
        await initializeTrash();

        // Get trash index
        let trash = [];
        if (existsSync(TRASH_FILE)) {
            const content = await readFile(TRASH_FILE, 'utf-8');
            trash = JSON.parse(content);
        }

        // Find item in trash
        const itemIndex = trash.findIndex(item => item.id === id && item.type === type);
        if (itemIndex === -1) {
            throw new Error('Item not found in trash');
        }

        const item = trash[itemIndex];

        // Remove from trash index
        trash.splice(itemIndex, 1);
        await writeFile(TRASH_FILE, JSON.stringify(trash, null, 2));

        // Clean up trash files
        const trashDir = type === 'list' ? TRASH_LISTS_DIR : TRASH_NOTES_DIR;
        const files = await readdir(trashDir);
        const itemFiles = files.filter(f => f.startsWith(id));
        for (const file of itemFiles) {
            await unlink(path.join(trashDir, file));
        }

        console.log(`✓ Restored ${type} from trash: ${id}`);
        return item.data;
    } catch (err) {
        console.error('Error restoring from trash:', err);
        throw err;
    }
}

/**
 * Permanently delete item from trash (without restoring)
 */
async function permanentlyDeleteFromTrash(type, id) {
    try {
        // Get trash index
        let trash = [];
        if (existsSync(TRASH_FILE)) {
            const content = await readFile(TRASH_FILE, 'utf-8');
            trash = JSON.parse(content);
        }

        // Remove from trash index
        trash = trash.filter(item => !(item.id === id && item.type === type));
        await writeFile(TRASH_FILE, JSON.stringify(trash, null, 2));

        // Clean up trash files
        const trashDir = type === 'list' ? TRASH_LISTS_DIR : TRASH_NOTES_DIR;
        if (existsSync(trashDir)) {
            const files = await readdir(trashDir);
            const itemFiles = files.filter(f => f.startsWith(id));
            for (const file of itemFiles) {
                await unlink(path.join(trashDir, file));
            }
        }

        console.log(`✓ Permanently deleted from trash: ${id}`);
    } catch (err) {
        console.error('Error permanently deleting from trash:', err);
        throw err;
    }
}

/**
 * Clean up old trash items (14+ days)
 */
async function cleanupOldTrash() {
    try {
        if (!existsSync(TRASH_FILE)) {
            return;
        }

        const content = await readFile(TRASH_FILE, 'utf-8');
        let trash = JSON.parse(content);
        const now = new Date();
        const cutoffDate = new Date(now.getTime() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);

        let itemsDeleted = 0;
        const validTrash = [];

        for (const item of trash) {
            const deletedDate = new Date(item.deletedAt);
            if (deletedDate < cutoffDate) {
                // Delete old item
                await permanentlyDeleteFromTrash(item.type, item.id);
                itemsDeleted++;
            } else {
                validTrash.push(item);
            }
        }

        if (itemsDeleted > 0) {
            console.log(
                `🗑️  Cleaned up ${itemsDeleted} items from trash (older than ${TRASH_RETENTION_DAYS} days)`
            );
        }

        await writeFile(TRASH_FILE, JSON.stringify(validTrash, null, 2));
    } catch (err) {
        console.error('Error cleaning up trash:', err);
    }
}

// ===================================
// Category Management (Initialize early)
// ===================================

let VALID_CATEGORIES = [];
const VALID_PRIORITIES = ['high', 'medium', 'low'];

/**
 * Load categories from categories.json file
 */
async function loadCategories() {
    try {
        if (existsSync(CATEGORIES_FILE)) {
            const data = await readFile(CATEGORIES_FILE, 'utf-8');
            VALID_CATEGORIES = JSON.parse(data);
            console.log(`✓ Loaded ${VALID_CATEGORIES.length} categories from file`);
        } else {
            console.warn('Categories file not found, creating with defaults...');
            VALID_CATEGORIES = [
                'personal',
                'work',
                'travel',
                'shopping',
                'projects',
                'food',
                'health',
                'ideas',
                'other'
            ];
            await writeFile(CATEGORIES_FILE, JSON.stringify(VALID_CATEGORIES, null, 2));
        }
    } catch (err) {
        console.error('Error loading categories:', err);
        VALID_CATEGORIES = ['personal', 'work', 'other']; // Fallback
    }
}

/**
 * Validate category value
 */
function isValidCategory(category) {
    return category && VALID_CATEGORIES.includes(category);
}

/**
 * Validate priority value
 */
function isValidPriority(priority) {
    return !priority || VALID_PRIORITIES.includes(priority);
}

// Initialize trash and clean up on startup
await initializeTrash();
await cleanupOldTrash();

// Load categories from file on startup
await loadCategories();

// ===================================
// Single Instance Lock
// ===================================

/**
 * Check if a process is running
 * @param {number} pid - Process ID to check
 * @returns {boolean} True if process is running
 */
function isProcessRunning(pid) {
    try {
        // Sending signal 0 checks if process exists without actually sending a signal
        process.kill(pid, 0);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Check if another instance is already running
 * Prevents multiple server instances from causing race conditions
 */
if (existsSync(LOCK_FILE)) {
    try {
        const lockData = await readFile(LOCK_FILE, 'utf-8');
        const lockInfo = JSON.parse(lockData);

        // Check if the process is still running
        if (isProcessRunning(lockInfo.pid)) {
            console.error(`
╔════════════════════════════════════════════════╗
║   ⚠️  ERROR: Server Already Running            ║
╠════════════════════════════════════════════════╣
║                                                ║
║  Another instance is already running:          ║
║  PID:       ${String(lockInfo.pid).padEnd(35)} ║
║  Started:   ${new Date(lockInfo.started).toLocaleString().padEnd(35)} ║
║  Port:      ${String(lockInfo.port || 'detecting...').padEnd(35)} ║
║                                                ║
║  To start a new instance:                      ║
║  1. Stop the existing server (Ctrl+C)          ║
║  2. Or manually delete: local_data/.lock       ║
║                                                ║
╚════════════════════════════════════════════════╝
            `);
            process.exit(1);
        } else {
            // Stale lock file - process is no longer running
            console.log('Removing stale lock file from previous crashed instance...');
            unlinkSync(LOCK_FILE);
        }
    } catch (error) {
        // Lock file is corrupted, remove it and continue
        console.warn('Lock file corrupted, removing...');
        unlinkSync(LOCK_FILE);
    }
}

// Create lock file
await writeFile(
    LOCK_FILE,
    JSON.stringify(
        {
            pid: process.pid,
            started: new Date().toISOString(),
            port: null
        },
        null,
        2
    )
);

/**
 * Clean up lock file on exit
 */
function cleanup() {
    try {
        if (existsSync(LOCK_FILE)) {
            unlinkSync(LOCK_FILE);
            console.log('\nServer stopped, lock file removed.');
        }
    } catch (error) {
        console.error('Error removing lock file:', error.message);
    }
}

// Handle various exit scenarios
process.on('SIGINT', () => {
    console.log('\n\nReceived SIGINT, shutting down...');
    cleanup();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\nReceived SIGTERM, shutting down...');
    cleanup();
    process.exit(0);
});

process.on('exit', () => {
    cleanup();
});

// ===================================
// Validation Helpers
// ===================================

/**
 * Validate tags array
 */
function isValidTags(tags) {
    if (!Array.isArray(tags)) return false;
    if (tags.length > 10) return false; // Max 10 tags
    return tags.every(tag => typeof tag === 'string' && tag.trim().length > 0 && tag.length <= 50);
}

/**
 * Validate a list object
 */
function isValidList(list) {
    if (!list || typeof list !== 'object') return false;
    if (!list.id || typeof list.id !== 'string') return false;
    if (!list.name || typeof list.name !== 'string' || list.name.trim().length === 0) return false;
    if (list.name.length > 75) return false;
    if (!isValidCategory(list.category)) return false;
    if (!isValidPriority(list.priority)) return false;
    if (!isValidTags(list.tags || [])) return false;
    if (!Array.isArray(list.items)) return false;
    return true;
}

/**
 * Validate lists array
 */
function isValidListsArray(lists) {
    if (!Array.isArray(lists)) return false;
    if (lists.length > 1000) return false; // Max 1000 lists
    return lists.every(list => isValidList(list));
}

/**
 * Validate settings object
 */
function isValidSettings(settings) {
    if (!settings || typeof settings !== 'object') return false;
    // Basic structure validation
    if (settings.display && typeof settings.display !== 'object') return false;
    if (settings.ai && typeof settings.ai !== 'object') return false;
    if (settings.version && typeof settings.version !== 'string') return false;
    return true;
}

// ===================================
// Filesystem Storage API
// ===================================

// Get lists
app.get('/api/data/lists', async (req, res) => {
    try {
        if (!existsSync(LISTS_FILE)) {
            return res.json([]);
        }
        const data = await readFile(LISTS_FILE, 'utf-8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading lists:', error);
        res.status(500).json({ error: 'Failed to read lists' });
    }
});

// Save lists
app.post('/api/data/lists', async (req, res) => {
    try {
        // Validate lists array structure
        if (!isValidListsArray(req.body)) {
            return res.status(400).json({ error: 'Invalid lists format or content' });
        }

        await writeFile(LISTS_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving lists:', error);
        res.status(500).json({ error: 'Failed to save lists' });
    }
});

// Delete list (moves to trash)
app.delete('/api/data/lists/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Read lists
        if (!existsSync(LISTS_FILE)) {
            return res.status(404).json({ error: 'List not found' });
        }

        const data = await readFile(LISTS_FILE, 'utf-8');
        let lists = JSON.parse(data);
        const listIndex = lists.findIndex(l => l.id === id);

        if (listIndex === -1) {
            return res.status(404).json({ error: 'List not found' });
        }

        // Get the list before removing it
        const list = lists[listIndex];

        // Move to trash instead of permanently deleting
        await moveToTrash('list', id, list);

        // Remove from lists
        lists.splice(listIndex, 1);
        await writeFile(LISTS_FILE, JSON.stringify(lists, null, 2));

        res.json({ success: true, message: 'List moved to trash' });
    } catch (error) {
        console.error('Error deleting list:', error);
        res.status(500).json({ error: 'Failed to delete list' });
    }
});

// Get settings
app.get('/api/data/settings', async (req, res) => {
    try {
        if (!existsSync(SETTINGS_FILE)) {
            // Return default settings
            return res.json({
                display: {
                    view: 'grid',
                    theme: 'light',
                    itemsPerPage: 20
                },
                ai: {
                    enabled: false,
                    autoSuggest: false,
                    provider: 'claude',
                    model: ''
                },
                version: '1.0.0'
            });
        }
        const data = await readFile(SETTINGS_FILE, 'utf-8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading settings:', error);
        res.status(500).json({ error: 'Failed to read settings' });
    }
});

// Save settings
app.post('/api/data/settings', async (req, res) => {
    try {
        // Validate settings object structure
        if (!isValidSettings(req.body)) {
            return res.status(400).json({ error: 'Invalid settings format' });
        }

        await writeFile(SETTINGS_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// Get API configuration (without exposing the actual key)
app.get('/api/data/api-config', async (req, res) => {
    try {
        const hasKey = !!process.env.AI_API_KEY;
        const provider = process.env.AI_PROVIDER || 'claude';
        const model = process.env.AI_MODEL || '';

        res.json({
            hasKey,
            provider,
            model
        });
    } catch (error) {
        console.error('Error reading API config:', error);
        res.status(500).json({ error: 'Failed to read API config' });
    }
});

// Save API key to .env.local
app.post('/api/data/api-key', async (req, res) => {
    try {
        const { provider, apiKey, model } = req.body;

        if (!apiKey || !provider) {
            return res.status(400).json({ error: 'API key and provider are required' });
        }

        const envContent = `AI_PROVIDER=${provider}\nAI_API_KEY=${apiKey}\n${model ? `AI_MODEL=${model}\n` : ''}`;
        await writeFile(ENV_FILE, envContent);

        // Reload env vars
        dotenv.config({ path: ENV_FILE, override: true });

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving API key:', error);
        res.status(500).json({ error: 'Failed to save API key' });
    }
});

// ===================================
// Category Management API
// ===================================

// Get all valid categories
app.get('/api/data/categories', async (req, res) => {
    try {
        res.json(VALID_CATEGORIES);
    } catch (error) {
        console.error('Error reading categories:', error);
        res.status(500).json({ error: 'Failed to read categories' });
    }
});

// Add a new category
app.post('/api/data/categories', async (req, res) => {
    try {
        const { name } = req.body;

        // Validate category name
        if (!name || typeof name !== 'string') {
            return res.status(400).json({ error: 'Category name is required' });
        }

        const trimmedName = name.trim().toLowerCase();

        // Check category name length
        if (trimmedName.length === 0 || trimmedName.length > 50) {
            return res.status(400).json({ error: 'Category name must be 1-50 characters' });
        }

        // Check if category already exists
        if (VALID_CATEGORIES.includes(trimmedName)) {
            return res.status(400).json({ error: 'Category already exists' });
        }

        // Add category
        VALID_CATEGORIES.push(trimmedName);
        await writeFile(CATEGORIES_FILE, JSON.stringify(VALID_CATEGORIES, null, 2));

        console.log(`✓ Added category: ${trimmedName}`);
        res.status(201).json({
            success: true,
            category: trimmedName,
            categories: VALID_CATEGORIES
        });
    } catch (error) {
        console.error('Error adding category:', error);
        res.status(500).json({ error: 'Failed to add category' });
    }
});

// Rename a category
app.put('/api/data/categories/:name', async (req, res) => {
    try {
        const oldName = req.params.name.toLowerCase();
        const { newName } = req.body;

        // Validate new name
        if (!newName || typeof newName !== 'string') {
            return res.status(400).json({ error: 'New category name is required' });
        }

        const trimmedNewName = newName.trim().toLowerCase();

        if (trimmedNewName.length === 0 || trimmedNewName.length > 50) {
            return res.status(400).json({ error: 'Category name must be 1-50 characters' });
        }

        // Check old category exists
        const oldIndex = VALID_CATEGORIES.indexOf(oldName);
        if (oldIndex === -1) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Check new name doesn't already exist (unless it's the same)
        if (oldName !== trimmedNewName && VALID_CATEGORIES.includes(trimmedNewName)) {
            return res.status(400).json({ error: 'A category with that name already exists' });
        }

        // Update category in array
        VALID_CATEGORIES[oldIndex] = trimmedNewName;

        // Update all lists referencing the old category
        if (existsSync(LISTS_FILE)) {
            const data = await readFile(LISTS_FILE, 'utf-8');
            const lists = JSON.parse(data);
            let listsChanged = false;
            lists.forEach(list => {
                if (list.category === oldName) {
                    list.category = trimmedNewName;
                    listsChanged = true;
                }
            });
            if (listsChanged) {
                await writeFile(LISTS_FILE, JSON.stringify(lists, null, 2));
            }
        }

        // Update all notes referencing the old category
        if (existsSync(NOTES_FILE)) {
            const data = await readFile(NOTES_FILE, 'utf-8');
            const notes = JSON.parse(data);
            let notesChanged = false;
            notes.forEach(note => {
                if (note.category === oldName) {
                    note.category = trimmedNewName;
                    notesChanged = true;
                }
            });
            if (notesChanged) {
                await writeFile(NOTES_FILE, JSON.stringify(notes, null, 2));
            }
        }

        // Also rename any subcategories (e.g., renaming "projects" should update "projects/sub")
        const oldPrefix = oldName + '/';
        const newPrefix = trimmedNewName + '/';
        for (let i = 0; i < VALID_CATEGORIES.length; i++) {
            if (VALID_CATEGORIES[i].startsWith(oldPrefix)) {
                const oldSubName = VALID_CATEGORIES[i];
                const newSubName = newPrefix + VALID_CATEGORIES[i].slice(oldPrefix.length);
                VALID_CATEGORIES[i] = newSubName;

                // Update lists with subcategory
                if (existsSync(LISTS_FILE)) {
                    const data = await readFile(LISTS_FILE, 'utf-8');
                    const lists = JSON.parse(data);
                    let changed = false;
                    lists.forEach(list => {
                        if (list.category === oldSubName) {
                            list.category = newSubName;
                            changed = true;
                        }
                    });
                    if (changed) {
                        await writeFile(LISTS_FILE, JSON.stringify(lists, null, 2));
                    }
                }

                // Update notes with subcategory
                if (existsSync(NOTES_FILE)) {
                    const data = await readFile(NOTES_FILE, 'utf-8');
                    const notes = JSON.parse(data);
                    let changed = false;
                    notes.forEach(note => {
                        if (note.category === oldSubName) {
                            note.category = newSubName;
                            changed = true;
                        }
                    });
                    if (changed) {
                        await writeFile(NOTES_FILE, JSON.stringify(notes, null, 2));
                    }
                }
            }
        }

        await writeFile(CATEGORIES_FILE, JSON.stringify(VALID_CATEGORIES, null, 2));

        console.log(`✓ Renamed category: ${oldName} → ${trimmedNewName}`);
        res.json({
            success: true,
            oldName: oldName,
            newName: trimmedNewName,
            categories: VALID_CATEGORIES
        });
    } catch (error) {
        console.error('Error renaming category:', error);
        res.status(500).json({ error: 'Failed to rename category' });
    }
});

// Delete a category
app.delete('/api/data/categories/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const trimmedName = name.toLowerCase();

        // Check if category exists
        const index = VALID_CATEGORIES.indexOf(trimmedName);
        if (index === -1) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Prevent deleting if lists or notes are using this category
        let listsFile = null;
        let notesFile = null;

        if (existsSync(LISTS_FILE)) {
            const data = await readFile(LISTS_FILE, 'utf-8');
            const lists = JSON.parse(data);
            listsFile = lists.some(list => list.category === trimmedName);
        }

        if (existsSync(NOTES_FILE)) {
            const data = await readFile(NOTES_FILE, 'utf-8');
            const notes = JSON.parse(data);
            notesFile = notes.some(note => note.category === trimmedName);
        }

        if (listsFile || notesFile) {
            return res.status(400).json({
                error: 'Cannot delete category that is in use',
                inUse: {
                    lists: listsFile,
                    notes: notesFile
                }
            });
        }

        // Delete category
        VALID_CATEGORIES.splice(index, 1);
        await writeFile(CATEGORIES_FILE, JSON.stringify(VALID_CATEGORIES, null, 2));

        console.log(`✓ Deleted category: ${trimmedName}`);
        res.json({ success: true, categories: VALID_CATEGORIES });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

// ===================================
// Notes Storage API
// ===================================

// Get all notes (metadata only)
app.get('/api/data/notes', async (req, res) => {
    try {
        if (!existsSync(NOTES_FILE)) {
            return res.json([]);
        }
        const data = await readFile(NOTES_FILE, 'utf-8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading notes:', error);
        res.status(500).json({ error: 'Failed to read notes' });
    }
});

// Create new note
app.post('/api/data/notes', async (req, res) => {
    try {
        const { title, category, tags } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Title is required' });
        }

        // Generate note ID
        const id = uuidv4();
        const now = new Date().toISOString();

        // Create metadata entry
        const noteMetadata = {
            id,
            title: title.trim().slice(0, 75),
            category: category || 'personal',
            tags: Array.isArray(tags) ? tags : [],
            favorite: false,
            content: {
                tldr: null,
                aiAnalyzed: false
            },
            metadata: {
                created: now,
                modified: now,
                wordCount: 0,
                characterCount: 0
            }
        };

        // Read existing notes
        let notes = [];
        if (existsSync(NOTES_FILE)) {
            const data = await readFile(NOTES_FILE, 'utf-8');
            notes = JSON.parse(data);
        }

        // Add new note
        notes.push(noteMetadata);
        await writeFile(NOTES_FILE, JSON.stringify(notes, null, 2));

        // Create empty markdown file using new filename format
        const newFilename = buildNoteFilename(noteMetadata.title, id);
        const noteFile = path.join(NOTES_DIR, `${newFilename}.md`);
        await writeFile(noteFile, '');

        res.status(201).json(noteMetadata);
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

// IMPORTANT: These routes must come BEFORE /api/data/notes/:id to avoid matching "export" or "bulk" as an ID

// Get all notes with full content (for export)
app.get('/api/data/notes/export', async (req, res) => {
    try {
        if (!existsSync(NOTES_FILE)) {
            return res.json([]);
        }

        const data = await readFile(NOTES_FILE, 'utf-8');
        const notes = JSON.parse(data);

        // Load content for each note
        const notesWithContent = await Promise.all(
            notes.map(async note => {
                const newFilename = buildNoteFilename(note.title, note.id);
                let noteFile = path.join(NOTES_DIR, `${newFilename}.md`);

                // Try new format first, fall back to old format
                if (!existsSync(noteFile)) {
                    noteFile = path.join(NOTES_DIR, `${note.id}.md`);
                }

                let content = '';
                if (existsSync(noteFile)) {
                    content = await readFile(noteFile, 'utf-8');
                    // Normalize line endings - replace unusual Unicode line separators
                    // U+2028 (Line Separator) and U+2029 (Paragraph Separator) with standard \n
                    content = content.replace(/[\u2028\u2029]/g, '\n');
                }

                return { ...note, content };
            })
        );

        res.json(notesWithContent);
    } catch (error) {
        console.error('Error exporting notes:', error);
        res.status(500).json({ error: 'Failed to export notes' });
    }
});

// Bulk import notes
app.post('/api/data/notes/bulk', async (req, res) => {
    try {
        const { notes: importNotes } = req.body;

        if (!Array.isArray(importNotes)) {
            return res.status(400).json({ error: 'Notes array is required' });
        }

        // Read existing notes
        let existingNotes = [];
        if (existsSync(NOTES_FILE)) {
            const data = await readFile(NOTES_FILE, 'utf-8');
            existingNotes = JSON.parse(data);
        }

        const now = new Date().toISOString();
        let importedCount = 0;

        for (const note of importNotes) {
            // Generate new ID to avoid conflicts
            const newId = uuidv4();
            const title = note.title || 'Imported Note';
            const category = note.category || 'personal';
            const content = note.content || '';

            // Create note metadata
            const noteMetadata = {
                id: newId,
                title: title.substring(0, 200),
                category,
                tags: Array.isArray(note.tags) ? note.tags : [],
                favorite: note.favorite || false,
                createdAt: note.createdAt || now,
                updatedAt: now,
                metadata: {
                    wordCount: content.split(/\s+/).filter(w => w).length,
                    characterCount: content.length
                }
            };

            existingNotes.push(noteMetadata);

            // Save content file
            const newFilename = buildNoteFilename(title, newId);
            const noteFile = path.join(NOTES_DIR, `${newFilename}.md`);
            await writeFile(noteFile, content);

            importedCount++;
        }

        // Save updated notes metadata
        await writeFile(NOTES_FILE, JSON.stringify(existingNotes, null, 2));

        res.json({
            success: true,
            message: `Imported ${importedCount} note(s)`,
            count: importedCount
        });
    } catch (error) {
        console.error('Error bulk importing notes:', error);
        res.status(500).json({ error: 'Failed to import notes' });
    }
});

// Get single note with content
app.get('/api/data/notes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID format
        if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            return res.status(400).json({ error: 'Invalid note ID' });
        }

        // Get metadata
        if (!existsSync(NOTES_FILE)) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const data = await readFile(NOTES_FILE, 'utf-8');
        const notes = JSON.parse(data);
        const note = notes.find(n => n.id === id);

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        // Get content - support both new and old filename formats
        const newFilename = buildNoteFilename(note.title, id);
        let noteFile = path.join(NOTES_DIR, `${newFilename}.md`);
        let content = '';

        // Try new format first, fall back to old format if it doesn't exist
        if (!existsSync(noteFile)) {
            noteFile = path.join(NOTES_DIR, `${id}.md`);
        }

        if (existsSync(noteFile)) {
            content = await readFile(noteFile, 'utf-8');
        }

        res.json({
            ...note,
            content
        });
    } catch (error) {
        console.error('Error reading note:', error);
        res.status(500).json({ error: 'Failed to read note' });
    }
});

// Update note
app.put('/api/data/notes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, category, tags, content, favorite } = req.body;

        // Validate ID format
        if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            return res.status(400).json({ error: 'Invalid note ID' });
        }

        // Read notes
        if (!existsSync(NOTES_FILE)) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const data = await readFile(NOTES_FILE, 'utf-8');
        let notes = JSON.parse(data);
        const noteIndex = notes.findIndex(n => n.id === id);

        if (noteIndex === -1) {
            return res.status(404).json({ error: 'Note not found' });
        }

        // Update metadata
        const now = new Date().toISOString();
        if (title !== undefined) {
            const trimmedTitle = title.trim().slice(0, 75);
            if (trimmedTitle.length === 0) {
                return res.status(400).json({ error: 'Title cannot be empty' });
            }
            notes[noteIndex].title = trimmedTitle;
        }
        if (category !== undefined) {
            if (!isValidCategory(category)) {
                return res.status(400).json({ error: 'Invalid category' });
            }
            notes[noteIndex].category = category;
        }
        if (Array.isArray(tags)) {
            if (!isValidTags(tags)) {
                return res.status(400).json({ error: 'Invalid tags format' });
            }
            notes[noteIndex].tags = tags;
        }
        if (favorite !== undefined) notes[noteIndex].favorite = favorite;
        notes[noteIndex].metadata.modified = now;

        // Update content if provided
        if (content !== undefined) {
            // Validate content length (max 1MB)
            if (typeof content !== 'string' || content.length > 1048576) {
                return res.status(400).json({ error: 'Content too large or invalid' });
            }
            const newFilename = buildNoteFilename(notes[noteIndex].title, id);
            const noteFile = path.join(NOTES_DIR, `${newFilename}.md`);
            await writeFile(noteFile, content);
            notes[noteIndex].metadata.wordCount = content.split(/\s+/).length;
            notes[noteIndex].metadata.characterCount = content.length;
        }

        // Save updated notes
        await writeFile(NOTES_FILE, JSON.stringify(notes, null, 2));

        res.json(notes[noteIndex]);
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ error: 'Failed to update note' });
    }
});

// Delete note
app.delete('/api/data/notes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID format
        if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            return res.status(400).json({ error: 'Invalid note ID' });
        }

        // Read notes
        if (!existsSync(NOTES_FILE)) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const data = await readFile(NOTES_FILE, 'utf-8');
        let notes = JSON.parse(data);
        const noteIndex = notes.findIndex(n => n.id === id);

        if (noteIndex === -1) {
            return res.status(404).json({ error: 'Note not found' });
        }

        // Get the note before removing it
        const note = notes[noteIndex];

        // Get content from file
        const newFilename = buildNoteFilename(note.title, id);
        let noteFile = path.join(NOTES_DIR, `${newFilename}.md`);
        let content = '';

        // Try new format first, fall back to old format
        if (!existsSync(noteFile)) {
            noteFile = path.join(NOTES_DIR, `${id}.md`);
        }

        if (existsSync(noteFile)) {
            content = await readFile(noteFile, 'utf-8');
        }

        // Move to trash instead of permanently deleting
        await moveToTrash('note', id, {
            metadata: note,
            content
        });

        // Remove from metadata
        notes.splice(noteIndex, 1);
        await writeFile(NOTES_FILE, JSON.stringify(notes, null, 2));

        // Delete markdown files - try both new and old formats
        const newNoteFile = path.join(NOTES_DIR, `${newFilename}.md`);
        const oldNoteFile = path.join(NOTES_DIR, `${id}.md`);

        if (existsSync(newNoteFile)) {
            await unlink(newNoteFile);
        }
        if (existsSync(oldNoteFile)) {
            await unlink(oldNoteFile);
        }

        res.json({ success: true, message: 'Note moved to trash' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

// Clear all notes (permanent delete without trash)
app.delete('/api/data/notes', async (req, res) => {
    try {
        // Read existing notes to get file list
        let notes = [];
        if (existsSync(NOTES_FILE)) {
            const data = await readFile(NOTES_FILE, 'utf-8');
            notes = JSON.parse(data);
        }

        // Delete all note content files
        for (const note of notes) {
            const newFilename = buildNoteFilename(note.title, note.id);
            const newNoteFile = path.join(NOTES_DIR, `${newFilename}.md`);
            const oldNoteFile = path.join(NOTES_DIR, `${note.id}.md`);

            if (existsSync(newNoteFile)) {
                await unlink(newNoteFile);
            }
            if (existsSync(oldNoteFile)) {
                await unlink(oldNoteFile);
            }
        }

        // Clear notes metadata
        await writeFile(NOTES_FILE, JSON.stringify([], null, 2));

        res.json({
            success: true,
            message: `Cleared ${notes.length} note(s)`,
            count: notes.length
        });
    } catch (error) {
        console.error('Error clearing notes:', error);
        res.status(500).json({ error: 'Failed to clear notes' });
    }
});

// Export note to PDF (GET or POST)
app.get('/api/export/note/:id/pdf', handlePdfExport);
app.post('/api/export/note/:id/pdf', handlePdfExport);

async function handlePdfExport(req, res) {
    let browser;
    try {
        const { id } = req.params;
        // Support both JSON body and form data/query params
        let includeTitle = true;
        if (req.body && typeof req.body.includeTitle !== 'undefined') {
            includeTitle = req.body.includeTitle !== 'false' && req.body.includeTitle !== false;
        }
        if (req.query && typeof req.query.includeTitle !== 'undefined') {
            includeTitle = req.query.includeTitle !== 'false' && req.query.includeTitle !== false;
        }

        let includeMetadata = true;
        if (req.body && typeof req.body.includeMetadata !== 'undefined') {
            includeMetadata =
                req.body.includeMetadata !== 'false' && req.body.includeMetadata !== false;
        }
        if (req.query && typeof req.query.includeMetadata !== 'undefined') {
            includeMetadata =
                req.query.includeMetadata !== 'false' && req.query.includeMetadata !== false;
        }

        // Get font preference (default: system)
        const fontPref = req.query.font || req.body?.font || 'system';
        const fontFamilyMap = {
            system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
            classic: "'Palatino Linotype', Palatino, 'Book Antiqua', 'URW Palladio L', serif",
            serif: "Charter, 'Bitstream Charter', 'Sitka Text', Cambria, Georgia, serif",
            sans: "'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, 'Segoe UI', sans-serif",
            mono: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            readable: "'Atkinson Hyperlegible', Calibri, Verdana, 'DejaVu Sans', sans-serif"
        };
        const fontFamily = fontFamilyMap[fontPref] || fontFamilyMap.system;

        // Get paper size preference (default: a4)
        const paperSizePref = req.query.paperSize || req.body?.paperSize || 'a4';
        const paperSizeMap = {
            a4: 'A4',
            letter: 'Letter',
            legal: 'Legal'
        };
        const paperSize = paperSizeMap[paperSizePref] || 'A4';

        // Validate ID format
        if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            console.warn('Invalid note ID format:', id);
            return res.status(400).json({ error: 'Invalid note ID' });
        }

        // Get note metadata and content
        if (!existsSync(NOTES_FILE)) {
            console.warn('Notes file does not exist');
            return res.status(404).json({ error: 'Note not found' });
        }

        const data = await readFile(NOTES_FILE, 'utf-8');
        const notes = JSON.parse(data);
        const note = notes.find(n => n.id === id);

        if (!note) {
            console.warn('Note not found with ID:', id);
            return res.status(404).json({ error: 'Note not found' });
        }

        // Get content - support both new and old filename formats
        const newFilename = buildNoteFilename(note.title, id);
        let noteFile = path.join(NOTES_DIR, `${newFilename}.md`);
        let content = '';

        // Try new format first, fall back to old format if it doesn't exist
        if (!existsSync(noteFile)) {
            noteFile = path.join(NOTES_DIR, `${id}.md`);
        }

        if (existsSync(noteFile)) {
            content = await readFile(noteFile, 'utf-8');
        }

        // Render markdown to HTML with marked
        const contentHtml = marked.parse(content);

        // Build metadata HTML
        let metadataHtml = '';
        if (includeMetadata) {
            const createdDateLong = new Date(note.metadata.created).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const modifiedDateLong = new Date(note.metadata.modified).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            metadataHtml = `
                <div style="margin-bottom: 1em; color: #666; font-size: 0.9em;">
                    <p><strong>Category:</strong> ${note.category}</p>
                    <p><strong>Created:</strong> ${createdDateLong}</p>
                    <p><strong>Modified:</strong> ${modifiedDateLong}</p>
                    <p><strong>Word Count:</strong> ${note.metadata.wordCount}</p>
                    ${note.tags && note.tags.length > 0 ? `<p><strong>Tags:</strong> ${note.tags.join(', ')}</p>` : ''}
                </div>
                <hr style="margin: 1em 0; border: none; border-top: 1px solid #ccc;">
            `;
        }

        // Create HTML page
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${note.title}</title>
                <style>
                    body {
                        font-family: ${fontFamily};
                        font-size: 11pt;
                        line-height: 1.4;
                        color: #333;
                        padding: 0;
                        margin: 0;
                        background: white;
                    }
                    h1, h2, h3, h4, h5, h6 { font-weight: bold; margin: 0.5em 0; }
                    h1 { font-size: 1.5em; }
                    h2 { font-size: 1.3em; }
                    h3 { font-size: 1.15em; }
                    h4 { font-size: 1.05em; }
                    p { margin: 0.5em 0; }
                    ul, ol { margin: 0.5em 0; padding-left: 2em; }
                    li { margin: 0.3em 0; }
                    table { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
                    th, td { border: 1px solid #ddd; padding: 0.5em; text-align: left; vertical-align: top; }
                    th { background-color: #f5f5f5; font-weight: bold; }
                    tr:nth-child(even) { background-color: #fafafa; }
                    hr { margin-top: 1.5em; margin-bottom: 1em; border: none; border-top: 1px solid #ccc; }
                    strong { font-weight: bold; }
                    em { font-style: italic; }
                    code { background-color: #f5f5f5; padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; font-size: 0.9em; }
                    pre { background-color: #f5f5f5; padding: 1em; border-radius: 5px; margin: 0.5em 0; overflow-x: auto; }
                    pre code { background: none; padding: 0; }
                    blockquote { border-left: 4px solid #ddd; padding-left: 1em; margin: 0.5em 0; color: #666; }
                    .note-title { font-size: 0.9em; color: #999; font-weight: 500; margin-bottom: 0.5em; letter-spacing: 0.05em; text-transform: uppercase; }
                </style>
            </head>
            <body>
                ${includeTitle ? `<div class="note-title">${note.title}</div>` : ''}
                ${metadataHtml}
                <div class="content">${contentHtml}</div>
            </body>
            </html>
        `;

        // Set response headers
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

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: paperSize,
            margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
        });

        if (!pdfBuffer || pdfBuffer.length === 0) {
            throw new Error('Generated PDF buffer is empty');
        }

        res.end(pdfBuffer);
        await browser.close();
    } catch (error) {
        console.error('Error exporting note to PDF:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to export note to PDF' });
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Save note backup (before grammar updates)
app.post('/api/data/notes/:id/backup', async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        // Validate ID format
        if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            return res.status(400).json({ error: 'Invalid note ID' });
        }

        // Ensure backups directory exists
        const BACKUPS_DIR = path.join(DATA_DIR, '.backups');
        if (!existsSync(BACKUPS_DIR)) {
            await mkdir(BACKUPS_DIR, { recursive: true });
        }

        // Save as "latest" backup (overwrites previous backup)
        const latestBackupFile = path.join(BACKUPS_DIR, `${id}.backup.md`);
        await writeFile(latestBackupFile, content);

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving backup:', error);
        res.status(500).json({ error: 'Failed to save backup' });
    }
});

// Get latest note backup
app.get('/api/data/notes/:id/backup', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID format
        if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            return res.status(400).json({ error: 'Invalid note ID' });
        }

        const BACKUPS_DIR = path.join(DATA_DIR, '.backups');
        const latestBackupFile = path.join(BACKUPS_DIR, `${id}.backup.md`);

        if (!existsSync(latestBackupFile)) {
            return res.status(404).json({ error: 'No backup available' });
        }

        const content = await readFile(latestBackupFile, 'utf-8');
        res.json({ content });
    } catch (error) {
        console.error('Error reading backup:', error);
        res.status(500).json({ error: 'Failed to read backup' });
    }
});

// Check if backup exists for a note
app.get('/api/data/notes/:id/backup/exists', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID format
        if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            return res.status(400).json({ error: 'Invalid note ID' });
        }

        const BACKUPS_DIR = path.join(DATA_DIR, '.backups');
        const latestBackupFile = path.join(BACKUPS_DIR, `${id}.backup.md`);
        const exists = existsSync(latestBackupFile);

        res.json({ exists });
    } catch (error) {
        console.error('Error checking backup:', error);
        res.status(500).json({ error: 'Failed to check backup' });
    }
});

// ===================================
// Trash Management APIs
// ===================================

// Get all trashed items
app.get('/api/data/trash', async (req, res) => {
    try {
        const trash = await getTrash();

        // Add time remaining info for each item
        const now = new Date();
        const trashWithTimeRemaining = trash.map(item => {
            const deletedDate = new Date(item.deletedAt);
            const daysOld = Math.floor((now - deletedDate) / (24 * 60 * 60 * 1000));
            const daysRemaining = Math.max(0, TRASH_RETENTION_DAYS - daysOld);

            return {
                ...item,
                daysOld,
                daysRemaining,
                willBeDeletedAt: new Date(
                    deletedDate.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000
                ).toISOString()
            };
        });

        res.json(trashWithTimeRemaining);
    } catch (error) {
        console.error('Error reading trash:', error);
        res.status(500).json({ error: 'Failed to read trash' });
    }
});

// Restore item from trash
app.post('/api/data/trash/:type/:id/restore', async (req, res) => {
    try {
        const { type, id } = req.params;

        // Validate type
        if (!['list', 'note'].includes(type)) {
            return res.status(400).json({ error: 'Invalid item type' });
        }

        // Validate ID format
        if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            return res.status(400).json({ error: 'Invalid item ID' });
        }

        const data = await restoreFromTrash(type, id);

        // Restore the item based on type
        if (type === 'list') {
            // Add list back to lists.json
            let lists = [];
            if (existsSync(LISTS_FILE)) {
                const content = await readFile(LISTS_FILE, 'utf-8');
                lists = JSON.parse(content);
            }
            lists.push(data);
            await writeFile(LISTS_FILE, JSON.stringify(lists, null, 2));
        } else if (type === 'note') {
            // Add note back to notes.json and restore content file
            const { metadata, content } = data;

            let notes = [];
            if (existsSync(NOTES_FILE)) {
                const notesContent = await readFile(NOTES_FILE, 'utf-8');
                notes = JSON.parse(notesContent);
            }
            notes.push(metadata);
            await writeFile(NOTES_FILE, JSON.stringify(notes, null, 2));

            // Restore content file
            const newFilename = buildNoteFilename(metadata.title, id);
            const noteFile = path.join(NOTES_DIR, `${newFilename}.md`);
            await writeFile(noteFile, content);
        }

        res.json({ success: true, message: `${type} restored from trash` });
    } catch (error) {
        console.error('Error restoring from trash:', error);
        res.status(500).json({ error: 'Failed to restore from trash' });
    }
});

// Permanently delete item from trash
app.delete('/api/data/trash/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;

        // Validate type
        if (!['list', 'note'].includes(type)) {
            return res.status(400).json({ error: 'Invalid item type' });
        }

        // Validate ID format
        if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            return res.status(400).json({ error: 'Invalid item ID' });
        }

        await permanentlyDeleteFromTrash(type, id);
        res.json({ success: true, message: 'Permanently deleted from trash' });
    } catch (error) {
        console.error('Error permanently deleting from trash:', error);
        res.status(500).json({ error: 'Failed to permanently delete from trash' });
    }
});

// ===================================
// AI API Proxy
// ===================================

// AI API proxy endpoint (supports multiple providers)
app.post('/api/ai', async (req, res) => {
    try {
        const requestBody = req.body;

        // Read API key from environment first, then fall back to settings.json
        let apiKey = process.env.AI_API_KEY;
        let provider = process.env.AI_PROVIDER || 'claude';

        // If not in environment, try to read from settings.json
        if (!apiKey) {
            try {
                const settingsContent = await readFile(SETTINGS_FILE, 'utf-8');
                const settings = JSON.parse(settingsContent);
                const aiSettings = settings.ai || {};

                // Try to get API key from settings
                apiKey = aiSettings.apiKey || settings.apiKey;
                if (apiKey) {
                    // If API key is base64 encoded (starts with specific pattern), decode it
                    try {
                        apiKey = Buffer.from(apiKey, 'base64').toString('utf-8');
                    } catch {
                        // If decode fails, assume it's not base64 encoded
                    }
                }

                provider = aiSettings.provider || provider;
            } catch (e) {
                // settings.json doesn't exist or is invalid, continue with env vars
            }
        }

        if (!apiKey) {
            return res.status(400).json({
                error: {
                    message: 'AI API key not configured. Please add your API key in settings.'
                }
            });
        }

        console.log(`Proxying request to ${provider} API...`);

        let endpoint, headers, body, url;

        // Configure based on provider
        if (provider === 'claude') {
            endpoint = 'https://api.anthropic.com/v1/messages';
            headers = {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            };
            body = JSON.stringify(requestBody);
        } else if (provider === 'openai') {
            endpoint = 'https://api.openai.com/v1/chat/completions';
            headers = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            };
            body = JSON.stringify(requestBody);
        } else if (provider === 'gemini') {
            endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${requestBody.model || 'gemini-pro'}:generateContent`;
            url = `${endpoint}?key=${apiKey}`;
            headers = {
                'Content-Type': 'application/json'
            };
            // Remove model from body for Gemini (it's in the URL)
            const { model, ...geminiBody } = requestBody;
            body = JSON.stringify(geminiBody);
        } else {
            return res.status(400).json({
                error: { message: `Unknown provider: ${provider}` }
            });
        }

        const response = await fetch(url || endpoint, {
            method: 'POST',
            headers,
            body
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(`${provider} API error:`, data);
            return res.status(response.status).json(data);
        }

        console.log(`${provider} API request successful`);
        res.json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({
            error: { message: 'Proxy server error: ' + error.message }
        });
    }
});

// Legacy Claude endpoint for backward compatibility
app.post('/api/claude', async (req, res) => {
    // Redirect to new endpoint with provider
    req.body.provider = 'claude';
    return app._router.handle({ ...req, url: '/api/ai', method: 'POST' }, res, () => {});
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'List Manager dev server is running' });
});

// Start server with automatic port detection
(async () => {
    try {
        const PORT = await findAvailablePort(DEFAULT_PORT);
        const portChanged = PORT !== DEFAULT_PORT;

        // Update lock file with port number
        await writeFile(
            LOCK_FILE,
            JSON.stringify(
                {
                    pid: process.pid,
                    started: new Date().toISOString(),
                    port: PORT
                },
                null,
                2
            )
        );

        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════════╗
║   List Manager - Development Server           ║
╠════════════════════════════════════════════════╣
║  Server:  http://localhost:${PORT}${PORT < 10000 ? '               ' : '              '}║
║  Status:  Running                              ║${
                portChanged
                    ? `
║                                                ║
║  ⚠️  Port ${DEFAULT_PORT} was in use                        ║
║  📍 Using port ${PORT} instead                      ║`
                    : ''
            }
║                                                ║
║  Features:                                     ║
║  ✓ Static file serving                        ║
║  ✓ Filesystem storage API                     ║
║  ✓ AI API proxy (CORS bypass)                 ║
║                                                ║
║  Press Ctrl+C to stop                          ║
╚════════════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
})();
