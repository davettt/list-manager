# List Manager

**Privacy-first list management with optional AI suggestions**

A simple, fast, and private list manager that stores your data locally on your computer. Create any type of list (travel, shopping, projects, etc.), search and organize them, and optionally get AI-powered suggestions using your own AI API key (Claude, ChatGPT, or Gemini).

## Features

- **Privacy First**: All data stays local on your computer. No accounts, no tracking, no cloud servers.
- **Persistent Storage**: Data saved to filesystem for reliability (no more lost lists from browser cache clears!)
- **Flexible Lists**: Create any type of list with categories, tags, priorities, and deadlines
- **Smart Search**: Real-time search across list names, categories, tags, and items
- **AI Suggestions** (Optional): Get relevant item suggestions using your own AI API key (supports Claude, ChatGPT, Gemini)
- **Export/Import**: Backup your data anytime as JSON files
- **Light & Dark Themes**: Choose your preferred theme or use system settings
- **Mobile Friendly**: Responsive design works on all devices

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

**Export Your Data:**
- Click "Export All" to download your data as JSON
- Keep regular backups!

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

### Using AI Suggestions

1. Open a list
2. Click "AI Suggest" button
3. Review the generated suggestions
4. Select which ones to add (or add all)
5. Items from AI are marked with a ✨ icon

**Note**: AI features require an internet connection and will use your Claude API credits.

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
- All settings (saved to `local_data/settings.json`)
- Your API key (saved to `local_data/.env.local` - git ignored for security)
- Everything!

**What goes to external services:**
- Only AI feature requests go to your chosen AI provider (when you use AI features)
- Your API key is sent with AI requests (required for the API to work)

**No tracking:**
- No analytics
- No cookies
- No cloud servers
- No external requests (except AI provider when you use AI features)

**Data Location:**
- Your data is stored in the `local_data/` folder within the app directory
- The `local_data/` folder is excluded from git (see `.gitignore`)
- You can backup the entire `local_data/` folder to preserve everything

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
│   ├── settings.json     # Your settings (created on first use)
│   └── .env.local        # Your API key (created when you add key)
├── styles/
│   ├── main.css          # Layout and base styles
│   ├── components.css    # UI components
│   └── themes.css        # Color themes
├── js/
│   ├── app.js            # Main application logic
│   ├── storage.js        # Filesystem storage wrapper
│   ├── claude-api.js     # Multi-provider AI integration
│   ├── ui-helpers.js     # DOM utilities
│   └── utils.js          # General utilities
└── assets/
    └── sample-data.json  # Sample lists for demo
```

## Development

Want to contribute or modify List Manager? Here's how to get started.

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

### For Contributors

Before committing changes:

1. Run `npm run validate` to ensure code quality
2. Test manually in browser (desktop and mobile)
3. Update CHANGELOG.md if needed

**Full Details**: See [DEVELOPMENT.md](DEVELOPMENT.md) for complete development guide including:
- Project structure deep dive
- Coding standards
- Testing checklist
- Contributing guidelines

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
A: Yes! AI features are completely optional. The app works great for managing lists without any AI.

## Support & Issues

Found a bug or have a suggestion? Please report it via [GitHub Issues](https://github.com/yourusername/list-manager/issues).

**Note:** This is a personal project maintained for simplicity and low overhead. While issue reports are welcome, pull requests and feature requests may not be actively reviewed. Feel free to fork and customize for your own needs!

## License

MIT License - See LICENSE file for details

## Credits

Built with:
- Vanilla JavaScript (no frameworks)
- Claude AI API for suggestions
- Love for simple, privacy-focused tools

---

**Version**: 1.1.0
**Last Updated**: 2025-01-26

Made with care for people who value privacy and simplicity.
