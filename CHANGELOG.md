# Changelog

All notable changes to List Manager.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-11-08

### Added
- **Notes Feature** - Full markdown-based note-taking system with live preview
  - Create, edit, and organize notes with categories (Personal, Work, Projects, Ideas, Other)
  - Markdown support with live split-pane editor and preview
  - Search and filter notes by title or category
  - Star notes to mark as favorites
  - Auto-save as user types
  - Export notes as markdown files for cloud backup
- **AI Writing Assistance for Notes**
  - TLDR button to generate concise summaries of notes
  - Grammar checking to detect and fix spelling/punctuation errors
  - AI feedback displayed in modal dialogs for easy review
- **Enhanced UI Tooltips**
  - Helpful tooltips on key interface elements
  - Grammar suggestions with visual feedback
  - Better user guidance throughout the app
- **Notes Storage**
  - Notes metadata stored in `local_data/notes.json`
  - Note content stored as individual markdown files in `local_data/notes/`
  - Seamless integration with existing cloud backup workflows

### Changed
- Notes tab added alongside existing Lists tab
- Updated README with complete Notes feature documentation
- Enhanced Settings panel for Notes-related configuration

### Fixed
- Improved grammar detection accuracy in AI writing assistance
- Better tooltip positioning and styling

## [1.1.0] - 2025-01-26

### Changed - BREAKING
- **Complete storage architecture refactor**: Migrated from localStorage to filesystem-based storage
  - Data now persists in `local_data/lists.json` and `local_data/settings.json` (more reliable, won't be lost on browser cache clear)
  - API keys now stored in `local_data/.env.local` (more secure, gitignored)
  - Data folder renamed from `data/` to `local_data/` for clarity (prevents accidental git commits)
  - Development server is now **required** to run the app (not optional)
  - All storage operations converted to async/await pattern
- **Multi-provider AI support**: Added support for ChatGPT (OpenAI) and Gemini (Google) in addition to Claude
- **Security improvement**: API keys no longer sent in request body when using dev server (read from environment)

### Added
- Automatic localStorage migration: App detects old localStorage data and offers to migrate to filesystem
- Filesystem storage API endpoints in server.js for data persistence
- API key management endpoint for secure storage in .env.local
- Health check endpoint for storage availability
- Module type specification in package.json (eliminates Node.js warnings)

### Fixed
- Data loss prevention: Browser cache clears no longer delete user data
- Storage reliability: Filesystem is more reliable than browser localStorage
- Security: API keys stored outside of browser environment

### Migration Notes
- **For existing users**: On first run, the app will automatically detect old localStorage data and offer to migrate
- **Manual migration**: If automatic migration fails, use Export/Import to transfer data
- **Breaking change**: Running `index.html` directly is no longer supported; must use `npm run dev`

## [1.0.0] - 2025-01-15

### Added
- List creation and management with categories, tags, priorities, and deadlines
- Item management with checkboxes and completion tracking
- Real-time search across list names, categories, tags, and items
- Filter by category, tags, and favorites
- Optional AI suggestions via Claude API (requires user's own API key)
- Local data storage (localStorage) - privacy-first, no accounts
- Export/import functionality for data portability
- Settings management with API key storage
- Favorites system for important lists
- Grid and list view toggle
- Light and dark themes with auto-detection
- Mobile-responsive design
- Development server for AI features (Node.js/Express)

### Technical
- Vanilla JavaScript (ES6+, IIFE pattern)
- No build process for core features
- localStorage-based persistence
- Optional Node.js dev server for AI proxy
- Code quality tools: ESLint, Prettier
- MIT License - free and open source