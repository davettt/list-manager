# List Manager

**Privacy-first list and notes management with optional AI assistance**

A simple, fast, and private tool that stores your data locally on your computer. Create any type of list or note (travel, shopping, projects, ideas, etc.), search and organize them, and optionally get AI-powered suggestions and writing assistance using your own AI API key (Claude, ChatGPT, or Gemini).

## Features

- **Privacy First**: All data stays local on your computer. No accounts, no tracking, no cloud servers.
- **Persistent Storage**: Data saved to filesystem for reliability (no more lost lists or notes from browser cache clears!)
- **Flexible Lists**: Create any type of list with categories, tags, priorities, and deadlines
- **Markdown Notes**: Write rich notes with markdown formatting, live preview, and split-pane editing
- **Smart Search**: Real-time search across lists, notes, categories, tags, and items
- **AI Assistance** (Optional):
  - Get item suggestions for lists
  - Generate TLDR summaries for notes
  - Grammar and spelling checking for notes
  - Supports Claude, ChatGPT, or Gemini (use your own API key)
- **Export/Import**: Backup your data anytime as JSON files
- **PDF Export for Notes**: Export individual notes to PDF with formatted styling and optional metadata
- **Light & Dark Themes**: Choose your preferred theme or use system settings
- **Mobile Friendly**: Responsive design works on all devices
- **Cloud Backup**: Notes stored as markdown files, easily backed up to any cloud service (Tresorit, Dropbox, Google Drive, etc.)

## Quick Start

### 1. Download & Setup

1. Download this repository as a ZIP file
2. Extract it to a folder (e.g., `Documents/ListManager`)
3. Install Node.js (if not already installed): [nodejs.org](https://nodejs.org)
4. Open Terminal/Command Prompt in the extracted folder
5. Run:
   ```bash
   npm install
   npm run dev
   ```
6. Open your browser to `http://localhost:3000`

**Note**: The development server is required for the app to work properly. This ensures your data is saved reliably to the filesystem instead of browser storage.

### Running Persistently with PM2 (Optional)

After the initial setup, you can run List Manager continuously in the background without needing to run `npm run dev` every time. This approach uses PM2, a process manager that keeps your app running and auto-starts it on system reboot.

**Setup (One-time):**

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Navigate to your List Manager folder and start the app with PM2:
   ```bash
   pm2 start server.js --name list-manager
   ```

3. Enable auto-start on system reboot:
   ```bash
   pm2 startup
   pm2 save
   ```

4. Verify it's running:
   ```bash
   pm2 list
   ```

**Optional: Add a Local Domain Name**

For easier access, you can add a local domain instead of using `localhost`.

1. Open your hosts file:
   - **Mac/Linux**: `sudo nano /etc/hosts`
   - **Windows**: Open `C:\Windows\System32\drivers\etc\hosts` as admin

2. Add this line:
   ```
   127.0.0.1 listandnotes.local
   ```

3. Save and close

Now you can access the app at: `http://listandnotes.local:3000`

**Useful PM2 Commands:**

```bash
pm2 restart list-manager    # Restart the app
pm2 stop list-manager       # Stop the app
pm2 start list-manager      # Start it again
pm2 logs list-manager       # View live logs
pm2 delete list-manager     # Remove from PM2
```

**Advantages of this approach:**
- ✅ No need to run commands every time
- ✅ Auto-starts on computer restart
- ✅ App runs in the background
- ✅ Easy to manage with PM2 commands

### 2. Using the App

**Create a List:**
- Click "New List" button
- Enter a name, choose a category, add tags (optional)
- Add items to your list
- Click "Save Changes"

**Manage Items:**
- Check boxes to mark items as complete
- Click the trash icon to delete items
- Add new items using the input field

**Search & Filter:**
- Use the search bar to find lists
- Filter by category, tags, or favorites
- Toggle between grid and list view

**Create & Edit Notes:**
- Click the "Notes" tab to switch to notes view
- Click the "+" button to create a new note
- Write in the left pane with markdown support (bold, italic, headers, lists, links, code blocks, tables, etc.)
- See live preview in the right pane
- Notes are saved automatically as you type
- Organize notes by category (Personal, Work, Projects, Ideas, Other)
- Star notes to mark them as favorites
- Search notes by title or category

**AI Writing Assistance for Notes:**
- Click "TLDR" button to generate a concise summary of your note
- Click "Opposite" button to generate opposing viewpoints and challenge your thinking
- Click "Grammar" button to check spelling and get writing suggestions
- AI results are shown in a modal for easy review and can be copied or inserted into your note

**Export Notes:**
- Click "Export PDF" to download a single note as a PDF file
- PDFs include formatted styling (headers, lists, code blocks, tables)
- Optionally include metadata (category, creation date, word count, tags)
- Perfect for printing, sharing, or archiving important notes

**Export Your Data:**
- Click "Export All" to download your data as JSON
- Keep regular backups!

**Cloud Backup for Notes:**
- Your notes are stored as markdown files in `local_data/notes/`
- Point your cloud storage app (Tresorit, Dropbox, Google Drive, etc.) to sync this folder
- Access your notes on any device that has the cloud service installed
- Markdown files can be viewed/edited in any text editor or markdown app

## AI Features (Optional)

List Manager can integrate with multiple AI providers to provide smart suggestions. **You need your own API key.**

### Supported AI Providers

- **Claude** (Anthropic) - Recommended
- **ChatGPT** (OpenAI)
- **Gemini** (Google)

### Getting an API Key

**For Claude (Anthropic):**
1. Go to [https://console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in to your Anthropic account
3. Navigate to **Settings → API Keys**
4. Click "Create Key"
5. Copy your API key (starts with `sk-ant-...`)

**For ChatGPT (OpenAI):**
1. Go to [https://platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Navigate to **API Keys**
4. Create a new API key

**For Gemini (Google):**
1. Go to [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key

**Important**: Keep your API key private and secure! It's stored locally in `local_data/.env.local` (git ignored).

### Setting Up AI Features

1. Open List Manager at `http://localhost:3000`
2. Click the Settings icon (⚙️) in the top right
3. Select your AI provider (Claude, ChatGPT, or Gemini)
4. Paste your API key
5. Click "Test Connection" to verify it works
6. Check "Enable AI features"

Now you'll see an "AI Suggest" button when viewing lists!

### Using AI Features with Lists

1. Open a list
2. Click "AI Suggest" button
3. Review the generated suggestions
4. Select which ones to add (or add all)
5. Items from AI are marked with a ✨ icon

### Using AI Features with Notes

1. Open a note in the Notes tab
2. Click "TLDR" to generate a summary of your note
3. Click "Grammar" to check spelling and get writing suggestions
4. Review the AI feedback in the modal dialog
5. Copy feedback to clipboard or insert summaries into your note

**Note**: AI features require an internet connection and will use your API provider's credits.

## Data Management

### Exporting Data

Click "Export All" to download all your lists as a JSON file. This creates a backup you can keep safe.

**Recommended**: Export your data regularly, especially before:
- Clearing browser data
- Trying the import feature
- Making major changes

### Importing Data

1. Click "Import" button
2. Select your previously exported JSON file
3. Your lists will be restored

**Note**: Importing will merge with existing data, not replace it.

**Import File Format:**

The import file must be a valid JSON file with this structure:

```json
{
  "version": "1.0.0",
  "exportDate": "2025-01-15T00:00:00.000Z",
  "lists": [
    {
      "id": "unique-id",
      "name": "List Name",
      "category": "travel",
      "tags": ["tag1", "tag2"],
      "priority": "high",
      "deadline": "2025-03-01",
      "favorite": false,
      "items": [
        {
          "id": "item-id",
          "text": "Item text",
          "completed": false,
          "notes": "",
          "addedDate": "2025-01-10T10:00:00.000Z",
          "source": "user"
        }
      ],
      "metadata": {
        "created": "2025-01-10T10:00:00.000Z",
        "modified": "2025-01-10T10:20:00.000Z",
        "itemCount": 1,
        "completedCount": 0
      }
    }
  ],
  "settings": {
    "apiKey": "",
    "display": {
      "view": "grid",
      "theme": "light",
      "itemsPerPage": 20
    },
    "ai": {
      "enabled": false,
      "autoSuggest": false
    },
    "version": "1.0.0"
  }
}
```

**Required fields for each list:**
- `id` - Unique identifier
- `name` - List name (required)
- `items` - Array of items (can be empty)

**Example**: See `assets/sample-data.json` for a complete example with 3 sample lists.

**Tips:**
- You can create your own JSON files manually following this structure
- Export your data first to see the exact format
- The import validates the structure before importing

### Clearing All Data

In Settings → Data Management, you can clear all data. **This cannot be undone!** Export first.

## Privacy & Security

**What stays local:**
- All your lists and items (saved to `local_data/lists.json`)
- All your notes (metadata in `local_data/notes.json`, content in `local_data/notes/*.md`)
- Note backups automatically created before grammar updates (`local_data/.backups/`)
- All settings (saved to `local_data/settings.json`)
- Your API key (saved to `local_data/.env.local` - git ignored for security)
- Everything!

**What goes to external services:**
- Only AI feature requests go to your chosen AI provider (when you use AI features)
- Your API key is sent with AI requests (required for the API to work)

**Security Features:**
- ✅ **Input Validation** - All user inputs are validated for type and length on both client and server
- 🛡️ **XSS Protection** - Markdown rendering is sanitized with DOMPurify to prevent injection attacks
- 🔒 **Security Headers** - HTTP response headers prevent common web attacks
- 📏 **Size Limits** - Enforced limits prevent large payload attacks (10MB requests, 1MB notes)
- 🔄 **Auto-Backup** - Notes are automatically backed up before grammar updates are applied
- 💾 **One-Click Restore** - Restore from backup if anything goes wrong

**No tracking:**
- No analytics
- No cookies
- No cloud servers
- No external requests (except AI provider when you use AI features)

**Data Location:**
- Your data is stored in the `local_data/` folder within the app directory
- The `local_data/` folder is excluded from git (see `.gitignore`)
- You can backup the entire `local_data/` folder to preserve everything
- Note backups are stored in `local_data/.backups/` for automatic recovery

## Tips & Tricks

**Keyboard Shortcuts:**
- Press Enter in the "Add item" field to quickly add items

**Organization:**
- Use categories for broad grouping (travel, work, shopping)
- Use tags for cross-category themes (urgent, planning, research)
- Star your most important lists as favorites

**Backup Strategy:**
- Export your data monthly
- Keep exports in a safe folder or cloud storage
- Name exports with dates: `list-manager-backup-2025-01-15.json`
- Or backup the entire `local_data/` folder

**Performance:**
- The app works great with 100+ lists and 1000+ items
- All data is saved to JSON files in the `local_data/` folder
- Clear completed items from old lists to keep things tidy

## Browser Compatibility

**Fully Supported:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

**Requirements:**
- JavaScript enabled
- Node.js 18+ installed (for running the dev server)

## Troubleshooting

**App not starting?**
- Make sure Node.js is installed: `node --version`
- Run `npm install` first
- Check if port 3000 is already in use
- Check Terminal/Command Prompt for error messages

**Lists not saving?**
- Ensure the dev server is running (`npm run dev`)
- Check that the `local_data/` folder exists
- Check file permissions on the `local_data/` folder
- Look for errors in the Terminal/browser console

**AI features not working?**
- Verify your API key is correct
- Check your internet connection
- Ensure you have API credits remaining with your provider
- Test the connection in Settings
- Check the browser console for detailed error messages

**Data disappeared?**
- Check the `local_data/` folder for `lists.json` and `settings.json`
- Look for exported backup files
- If you had old localStorage data, the app should have offered to migrate it

**Server won't start?**
- Port 3000 might be in use. Stop other apps using that port, or change the port in `server.js`
- Try `npm install` again
- Check for errors in Terminal output

## File Structure

```
list-manager/
├── index.html              # Main app file
├── server.js               # Development server (required)
├── package.json            # Node.js dependencies
├── README.md              # This file
├── SETUP.md               # Detailed setup guide
├── CHANGELOG.md           # Version history
├── local_data/            # Your data (gitignored)
│   ├── .gitkeep          # Ensures folder is tracked
│   ├── lists.json        # Your lists (created on first use)
│   ├── notes.json        # Your notes metadata (created on first use)
│   ├── notes/            # Your note markdown files
│   │   └── [note-id].md  # Individual note files
│   ├── settings.json     # Your settings (created on first use)
│   └── .env.local        # Your API key (created when you add key)
├── styles/
│   ├── main.css          # Layout and base styles
│   ├── components.css    # UI components
│   ├── themes.css        # Color themes
│   └── notes.css         # Notes-specific styling
├── js/
│   ├── app.js            # Main application logic
│   ├── storage.js        # Filesystem storage wrapper
│   ├── claude-api.js     # Multi-provider AI integration
│   ├── ui-helpers.js     # DOM utilities
│   ├── utils.js          # General utilities
│   ├── notes-app.js      # Notes app logic
│   ├── notes-storage.js  # Notes API client
│   ├── notes-editor.js   # Notes editor functionality
│   └── notes-ai.js       # Notes AI features
└── assets/
    └── sample-data.json  # Sample lists for demo
```

## Personal Project Notice

**This is a personal project.** While you're welcome to fork it and customize it for your own needs, I'm not accepting pull requests or feature contributions. This keeps the project simple and focused on my personal requirements.

If you'd like to use this project:
- ✅ **Fork it** - Make your own version
- ✅ **Customize it** - Modify the code as needed
- ✅ **Report bugs** - File issues for actual bugs
- ❌ **Submit pull requests** - I won't be reviewing these
- ❌ **Request features** - Feature requests won't be considered

## Development

Want to modify List Manager for your own needs? Here's how to get started.

**Quick Start:**

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open in browser
# http://localhost:3000
```

The development server:
- Serves static files (HTML, CSS, JS)
- Provides filesystem storage API for lists and settings
- Proxies AI API requests (bypasses CORS)
- Manages API keys securely in .env.local

### Code Quality Tools

We use industry-standard tools to maintain code quality:

```bash
# Check code style and security
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format all code consistently
npm run format

# Check formatting without changes
npm run format:check

# Audit dependencies for vulnerabilities
npm run security:audit

# Run all quality checks (before committing)
npm run validate
```

### Customizing for Your Needs

This is a personal project - feel free to fork and modify it! If you want to customize:

1. Fork the repository
2. Make your changes
3. Run `npm run validate` to check code quality
4. Test in your browser

**Full Details**: See [DEVELOPMENT.md](DEVELOPMENT.md) for development guide including:
- Project structure
- Code quality tools
- Testing approaches

## FAQ

**Q: Is this really free?**
A: Yes! The app is free and open source. AI API usage costs apply if you use AI features (you pay your chosen provider directly).

**Q: Can I use it offline?**
A: The dev server needs to run, but it runs locally. Everything works without internet except AI suggestions.

**Q: Where is my data stored?**
A: In the `local_data/` folder on your computer. It never leaves your device (except AI requests if you use that feature).

**Q: Can I sync across devices?**
A: Not automatically. Use Export/Import to manually transfer data between devices, or sync the `local_data/` folder with cloud storage.

**Q: Is this secure?**
A: Your data stays local. If you use AI features, your API key and list data are sent to your chosen AI provider over HTTPS.

**Q: Can I customize it?**
A: Yes! All the code is here. Modify the CSS for styling or JavaScript for features.

**Q: What if I lose my API key?**
A: Generate a new one from your AI provider's console. Update it in Settings. Old keys can be deleted.

**Q: Why do I need to run a server?**
A: The server enables filesystem storage (more reliable than browser storage) and AI features. It runs locally on your computer.

**Q: Can I still use it without AI features?**
A: Yes! AI features are completely optional. The app works great for managing lists and notes without any AI.

**Q: Can I use Notes without Lists?**
A: Yes! You can use just Notes if you prefer. Click the "Notes" tab and ignore the Lists tab entirely.

**Q: What markdown features are supported in Notes?**
A: Full markdown support including: headers, bold/italic, lists, links, code blocks, tables, blockquotes, images, and more.

**Q: How do I access my notes on my phone?**
A: Your notes are stored as markdown files in `local_data/notes/`. Point your cloud storage app (Tresorit, Dropbox, Google Drive) to sync this folder, then use any markdown editor on your phone to view/edit them.

**Q: Can I convert a List to a Note?**
A: Not automatically, but you can copy list items and paste them into a note. The items become markdown formatted text.

**Q: Are notes encrypted?**
A: Notes are plain markdown files stored locally. They have the same privacy as lists. If you use cloud storage for sync, use a service with encryption (like Tresorit).

## Support & Issues

Found a bug? You're welcome to report it via GitHub Issues, but please understand:

**This is a personal project.** I maintain it for my own use and don't accept:
- Pull requests (I won't review them)
- Feature requests (won't be implemented)
- Contributions (the project stays as-is)

**What you can do:**
- 🐛 Report bugs (with the understanding they may not be fixed)
- 🔀 Fork the repository and customize it yourself
- 📝 Suggest improvements in issues (I may not respond, but you're welcome to try)

The best approach: Fork it, make it yours, and maintain your own version!

## License

MIT License - See LICENSE file for details

## Credits

Built with:
- Vanilla JavaScript (no frameworks)
- Claude AI API for suggestions
- Love for simple, privacy-focused tools

---

**Version**: 1.6.0
**Last Updated**: 2025-11-30

Made with care for people who value privacy and simplicity.

### What's New in v1.6.0

**Consider the Opposite** - Generate opposing viewpoints to challenge your thinking. Brief, thought-provoking counter-arguments help you explore alternative perspectives on your notes.

### What's New in v1.5.0

**PDF Export for Notes** - Export individual notes to PDF with formatted styling and optional metadata. Enhanced security with proper SSL/TLS certificate handling.

See [CHANGELOG.md](CHANGELOG.md) for full release details.

### What's New in v1.4.0

**AI & Deployment Improvements:**
- 🌐 **Remote Server Support** - API proxy now works on any domain (localhost, .local, remote servers)
- 🚀 **Simplified Deployment** - Always uses backend proxy for AI requests (CORS-free)
- 📧 **Server-Side API Keys** - Credentials stored securely server-side, not exposed to browser
- ♻️ **Chunk-Based Grammar Check** - Long notes processed in sections for complete grammar review
- ✨ **Smart Token Management** - Increased token limits to 8000 for better response quality
- 🎯 **Better Error Handling** - Improved error messages and graceful fallbacks
- ✅ **Code Quality** - All linting passes with zero warnings

**Code Cleanup:**
- 🧹 **Debug Removal** - All debug console.log statements removed
- 🔍 **Zero Warnings** - ESLint strict mode enforcement
- 📝 **Better Comments** - Production-ready code documentation

### What Was New in v1.3.0

**Security & Reliability:**
- 🔒 **DOMPurify XSS Protection** - Added XSS protection for markdown rendering
- ✅ **Comprehensive Input Validation** - Backend validation for all lists, notes, categories, tags, and content
- 📝 **Input Length Limits** - Enforced sensible limits (75 chars for names, 500 chars for items, 1MB for notes)
- 🛡️ **Security Headers** - Added HTTP security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- 📦 **Request Size Limits** - 10MB max payload size to prevent large payload attacks
- 🔄 **Auto-Backup on Grammar Updates** - Notes are backed up before grammar corrections are applied
- 👀 **Change Diff Preview** - See exactly what will change (like git diff) before applying grammar updates
- ♻️ **One-Click Restore** - Restore from backup if grammar update goes wrong
- 🧹 **Code Consolidation** - Removed duplicate sanitization functions for better maintainability

**Performance & Quality:**
- 🎯 **Zero ESLint Warnings** - All code passes strict linting
- 📊 **Improved Error Handling** - Better validation error messages
- 🔍 **Better Security Posture** - Rating improved from 6/10 to 9/10

### What Was New in v1.2.0

- ✨ **Notes Feature** - Write and manage markdown notes with live preview
- 🤖 **AI for Notes** - Generate TLDR summaries and check grammar/spelling
- 📄 **Split-Pane Editor** - Edit markdown on the left, preview on the right
- ☁️ **Cloud Backup Support** - Export notes as markdown files for easy cloud sync
- 🎨 **Notes UI** - Sidebar with notes list, search, and favorites
