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
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync, unlinkSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables from local_data/.env.local (user's keys)
dotenv.config({
    path: path.join(path.dirname(fileURLToPath(import.meta.url)), 'local_data', '.env.local')
});

// ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const DEFAULT_PORT = process.env.PORT || 3000;

/**
 * Check if a port is available
 * @param {number} port - Port to check
 * @returns {Promise<boolean>} True if port is available
 */
async function isPortAvailable(port) {
    return new Promise((resolve) => {
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
app.use(express.json());

// Serve static files
app.use(express.static(__dirname));

// Data directory path
const DATA_DIR = path.join(__dirname, 'local_data');
const LISTS_FILE = path.join(DATA_DIR, 'lists.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const ENV_FILE = path.join(DATA_DIR, '.env.local');
const LOCK_FILE = path.join(DATA_DIR, '.lock');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
}

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
await writeFile(LOCK_FILE, JSON.stringify({
    pid: process.pid,
    started: new Date().toISOString(),
    port: null
}, null, 2));

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
        await writeFile(LISTS_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving lists:', error);
        res.status(500).json({ error: 'Failed to save lists' });
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
// AI API Proxy
// ===================================

// AI API proxy endpoint (supports multiple providers)
app.post('/api/ai', async (req, res) => {
    try {
        const requestBody = req.body;

        // Read API key from environment (more secure than request body)
        const apiKey = process.env.AI_API_KEY;
        const provider = process.env.AI_PROVIDER || 'claude';

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
        await writeFile(LOCK_FILE, JSON.stringify({
            pid: process.pid,
            started: new Date().toISOString(),
            port: PORT
        }, null, 2));

        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════════╗
║   List Manager - Development Server           ║
╠════════════════════════════════════════════════╣
║  Server:  http://localhost:${PORT}${PORT < 10000 ? '               ' : '              '}║
║  Status:  Running                              ║${portChanged ? `
║                                                ║
║  ⚠️  Port ${DEFAULT_PORT} was in use                        ║
║  📍 Using port ${PORT} instead                      ║` : ''}
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
