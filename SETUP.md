# List Manager - Setup Guide

This guide will walk you through setting up List Manager step by step.

## Table of Contents

1. [Basic Setup](#basic-setup)
2. [First Time Usage](#first-time-usage)
3. [Setting Up AI Features](#setting-up-ai-features)
4. [Development Setup](#development-setup)
5. [Troubleshooting](#troubleshooting)

---

## Basic Setup

### Step 1: Download

**Option A: Download ZIP from GitHub**
1. Go to the GitHub repository
2. Click the green "Code" button
3. Select "Download ZIP"
4. Save the file to your computer

**Option B: Clone with Git**
```bash
git clone https://github.com/yourusername/list-manager.git
cd list-manager
```

### Step 2: Extract

1. Navigate to your Downloads folder
2. Find `list-manager-main.zip`
3. Right-click and select "Extract All" (Windows) or double-click (Mac)
4. Move the extracted folder to a permanent location, e.g.:
   - Windows: `C:\Users\YourName\Documents\ListManager`
   - Mac: `/Users/YourName/Documents/ListManager`
   - Linux: `/home/yourname/Documents/ListManager`

### Step 3: Open the App

**Method 1: Direct Open (Recommended)**
1. Navigate to the extracted folder
2. Double-click `index.html`
3. Your default browser will open the app

**Method 2: Open with Specific Browser**
1. Right-click `index.html`
2. Select "Open with..."
3. Choose your preferred browser

**Method 3: Drag and Drop**
1. Open your web browser
2. Drag `index.html` into the browser window

That's it! The app should now be running.

---

## First Time Usage

### Initial Setup

1. **Welcome Screen**: On first load, you'll see an empty state
2. **Sample Data** (Optional):
   - Click "Import" button
   - Navigate to `assets/sample-data.json`
   - Select the file to load example lists
   - Click "OK" to confirm

3. **Create Your First List**:
   - Click "New List" button
   - Enter a name (e.g., "My Shopping List")
   - Choose a category (optional)
   - Add some tags (optional)
   - Click "Save Changes"

4. **Add Items**:
   - Type an item in the input field
   - Press Enter or click "Add"
   - Repeat for more items

### Exploring Features

**Search & Filter:**
- Type in the search bar to find lists
- Use category dropdown to filter by category
- Use tag dropdown to filter by tag
- Check "Favorites Only" to see starred lists

**View Options:**
- Click the grid/list icon to toggle between views
- Go to Settings to change theme (light/dark)

**Data Management:**
- Click "Export All" to save a backup
- Keep this file safe!

---

## Setting Up AI Features

AI features are **completely optional**. Skip this section if you don't want to use AI suggestions.

⚠️ **IMPORTANT: AI Features Requirement**

Due to browser security (CORS) restrictions, **AI features only work when running from a web server**. They will NOT work when opening `index.html` directly from your file system.

**To use AI features, you must:**
- Run a local development server (see [Development Setup](#development-setup) below), OR
- Host the files on a web server

**All other features work fine without a server.**

### Prerequisites

- An Anthropic account
- A valid payment method (Claude API is pay-as-you-go)
- Internet connection
- **A local web server** (for AI features only)

### Step-by-Step: Getting Your API Key

**1. Create an Anthropic Account**

1. Visit [https://console.anthropic.com](https://console.anthropic.com)
2. Click "Sign Up" (or "Log In" if you have an account)
3. Enter your email and create a password
4. Verify your email address

**2. Add Payment Method**

1. Once logged in, go to Settings → Billing
2. Click "Add payment method"
3. Enter your credit card details
4. Claude API uses pay-as-you-go pricing (you only pay for what you use)

**3. Generate API Key**

1. Go to Settings → API Keys
2. Click "Create Key"
3. Give it a name (e.g., "List Manager")
4. Click "Create"
5. **Copy the key immediately** (it starts with `sk-ant-`)
6. **Save it somewhere safe** - you won't see it again!

**Screenshot Example:**
```
┌─────────────────────────────────┐
│ API Keys                        │
├─────────────────────────────────┤
│ Name: List Manager              │
│ Key: sk-ant-api03-************  │
│ Created: 2025-01-15             │
│ [Delete] [Copy]                 │
└─────────────────────────────────┘
```

**4. Add Key to List Manager**

1. Open List Manager in your browser
2. Click the Settings icon (⚙️) in the top right
3. Find "Claude AI Integration" section
4. Paste your API key in the input field
5. Click "Test Connection"
   - ✅ Success: "Connection successful!"
   - ❌ Error: Double-check your key
6. Check "Enable AI features"
7. Close settings

**5. Using AI Suggestions**

1. Open any list
2. You'll now see an "AI Suggest" button
3. Click it to generate suggestions
4. Wait a few seconds for AI to respond
5. Select suggestions you want to add
6. Click "Add Selected" or "Add All"

---

## Development Setup

If you want to develop or modify the app:

### Recommended: Local Server

While the app works by opening `index.html` directly, using a local server provides a better development experience.

**Option 1: Python Server**
```bash
# Navigate to the project folder
cd /path/to/list-manager

# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Open browser to:
http://localhost:8000
```

**Option 2: Node.js Server**
```bash
# Install http-server globally
npm install -g http-server

# Navigate to the project folder
cd /path/to/list-manager

# Start server
http-server -p 8000

# Open browser to:
http://localhost:8000
```

**Option 3: VS Code Live Server**
1. Install "Live Server" extension in VS Code
2. Right-click `index.html`
3. Select "Open with Live Server"

### Browser Developer Tools

1. Open the app in your browser
2. Press F12 or Ctrl+Shift+I (Cmd+Option+I on Mac)
3. Go to:
   - **Console**: See JavaScript logs and errors
   - **Application**: View localStorage data
   - **Network**: Monitor Claude API calls
   - **Elements**: Inspect HTML/CSS

### File Structure

```
list-manager/
├── index.html           # Main HTML - entry point
├── styles/
│   ├── themes.css       # Color variables, light/dark themes
│   ├── main.css         # Layout, typography, base styles
│   └── components.css   # Buttons, cards, modals, etc.
├── js/
│   ├── app.js           # Main controller - START HERE
│   ├── storage.js       # LocalStorage operations
│   ├── claude-api.js    # Claude API integration
│   ├── ui-helpers.js    # Toast, modals, rendering
│   └── utils.js         # Helper functions
└── assets/
    └── sample-data.json # Example data for testing
```

### Making Changes

**CSS Changes:**
- Edit `styles/*.css` files
- Refresh browser to see changes

**JavaScript Changes:**
- Edit `js/*.js` files
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R) to clear cache
- Check browser console for errors

**Testing:**
1. Clear localStorage: Application → Storage → Local Storage → Clear
2. Refresh page to test from scratch
3. Import `sample-data.json` for test data

---

## Troubleshooting

### Issue: App won't open / blank page

**Possible causes:**
- JavaScript is disabled
- File structure is broken
- Browser compatibility issue

**Solutions:**
1. Check browser console for errors (F12)
2. Verify all files are in the correct folders
3. Try a different browser (Chrome, Firefox, Safari)
4. Make sure JavaScript is enabled in browser settings

### Issue: "localStorage is not available"

**Possible causes:**
- Private/Incognito mode
- Browser settings block localStorage
- Storage quota exceeded

**Solutions:**
1. Exit private/incognito mode
2. Check browser settings → Privacy → Allow local data
3. Clear some browser data to free up space

### Issue: Data disappeared

**Possible causes:**
- Browser cache/data was cleared
- Using different browser or profile
- Private mode was closed

**Solutions:**
1. Check if you're using the same browser and profile
2. Look for exported backup files
3. Import your most recent export
4. **Prevention**: Export regularly!

### Issue: AI features not working

**Possible causes:**
- Invalid API key
- No internet connection
- API credits exhausted
- API service is down

**Solutions:**
1. Test API key in Settings → "Test Connection"
2. Check your internet connection
3. Verify API credits at console.anthropic.com
4. Check Anthropic status page for outages
5. Check browser console for detailed error messages

### Issue: Import fails with "Invalid data format"

**Possible causes:**
- Wrong file type (not JSON)
- Corrupted export file
- File from incompatible version
- Missing required fields

**Solutions:**
1. Make sure you're importing a `.json` file
2. Open the JSON file in a text editor to verify it's valid
3. Try exporting and importing `assets/sample-data.json` to test
4. Check the JSON structure matches the expected format

**Required JSON Structure:**

```json
{
  "lists": [
    {
      "id": "must-be-unique",
      "name": "Required field",
      "items": []
    }
  ]
}
```

**Minimum required fields:**
- `lists` - Must be an array
- Each list must have: `id`, `name`, and `items` (array)

**Full example:** See `assets/sample-data.json` in your installation folder

**Valid categories:** personal, work, travel, shopping, projects, food, health, other
**Valid priorities:** none, low, medium, high
**Item source:** user or ai

### Issue: Performance is slow

**Possible causes:**
- Too many lists or items
- Browser running out of memory
- Other browser extensions interfering

**Solutions:**
1. Delete old/completed lists you don't need
2. Export data, clear all, import only what you need
3. Disable browser extensions temporarily
4. Clear browser cache and restart browser

### Getting Help

1. **Check the Console**: F12 → Console tab for error messages
2. **Check localStorage**: F12 → Application → Storage → Local Storage
3. **Export your data**: Before trying fixes, export as backup
4. **Try a fresh start**: Clear all data and test with sample-data.json
5. **Browser compatibility**: Try Chrome, Firefox, or Safari

---

## Next Steps

After setup:
1. Read [README.md](README.md) for usage tips
2. Create your first real list
3. Set up regular export backups
4. Explore AI features (optional)
5. Customize themes and view preferences

---

**Need Help?** Check the FAQ in README.md or open a GitHub issue.

**Version**: 1.0.0
**Last Updated**: 2025-01-15
