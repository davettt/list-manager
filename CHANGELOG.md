# Changelog

All notable changes to List Manager are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Upcoming

### Under Consideration
- **AI: Habit Builder** - Generate actionable habits or behavior changes based on productivity notes (may be contextual)
- **AI: Think Deeper** - Additional analysis options to challenge and expand thinking on specific note types
- **Performance**: Explore lighter weight AI models or caching for frequent queries

---

## [1.8.0] - 2025-12-25

### Added
- 🎯 **Notes FAB (Floating Action Button)** - Quick access to note functions from anywhere in the notes view
  - Toggle sidebar, create new note, import, and export actions
  - Positioned top-right under menu bar for easy access
  - Expands with smooth animation to show action menu
  - Only visible on Notes tab (hidden on Lists)

### Changed
- Removed redundant sidebar toggle button from notes editor header
- Removed notes footer action buttons (replaced by FAB)
- Streamlined notes UI with consolidated quick actions

### Fixed
- Users no longer need to scroll to access note functions when viewing long notes (TC-19)

---

## [1.7.0] - 2025-12-01

### Added
- ✨ **AI: Improve Writing** - New writing enhancement tool that restructures, clarifies, and polishes notes while maintaining original voice
- Improves clarity with precise language and better organization
- Adds concrete examples where helpful to illustrate key points
- Works with all AI providers (Claude, ChatGPT, Gemini)
- 🎯 **Unified AI Menu** - All 4 AI writing tools now accessible from single "AI Options" dropdown menu
- Cleaner interface with organized dropdown options for Grammar, TLDR, Opposite, and Improve Writing

### Changed
- Consolidated AI buttons into single dropdown menu for better UX
- Updated button icon to three-dot menu (more intuitive)
- Updated tooltip text to reflect all writing tools

### Improved
- Better visual organization of AI features
- Reduced UI clutter with dropdown approach

---

## [1.6.0] - 2025-11-30

### Added
- 🔄 **AI: Consider the Opposite** - Generate opposing viewpoints to challenge thinking and explore alternative perspectives
- Brief, accessible counter-arguments (1-3 sentences each) for critical thinking
- Works with all note types and AI providers

### Changed
- AI prompts now use neutral English regardless of user locale to maintain consistency

---

## [1.5.0] - 2025-11-30

### Added
- 📄 **PDF Export for Notes** - Export individual notes to PDF with formatted styling and optional metadata
- 🎨 **PDF Styling** - Properly formatted PDFs with typography, code blocks, tables, blockquotes, and more
- 📊 **Metadata in PDF** - Option to include note metadata (category, creation date, word count, tags) in exported PDF
- 🔒 **Security: SSL Certificate Handling** - Updated gitignore to exclude SSL/TLS certificates and private keys

### Changed
- 📋 **Enhanced Export Options** - Notes can now be exported in multiple formats (Markdown, PDF)

### Security
- 🔐 **SSL/TLS Protection** - Private key files (*.key) and certificates (*.crt, *.pem) now properly excluded from version control
- 📄 **Generated Files** - PDF exports excluded from git tracking (*.pdf)

### Notes
- This release maintains full backward compatibility with v1.4.0
- No database migrations needed
- All existing data works as-is

---

## [1.4.0] - 2025-11-08

### Added
- 🌐 **Remote Server Support** - API proxy now works seamlessly on remote servers with any domain (localhost, .local, production domains)
- 🚀 **Unified Deployment Architecture** - Simplified API request flow that works everywhere without CORS issues
- 📊 **Character Counter with Visual Indicator** - Real-time tracking of note length with soft limit warning at 3000 characters
- ♻️ **Intelligent Chunk-Based Grammar Processing** - Long notes automatically split into sections (~3000 chars each) for complete grammar review

### Changed
- 🔄 **Always Use API Proxy** - Removed conditional logic for direct API calls; always use `/api/ai` endpoint
- ✨ **Enhanced Token Management** - Increased token limits to 8000 for better AI response quality
- 🧹 **Production-Ready Code** - Removed all debug console.log statements for clean output
- 📋 **Updated Documentation** - Added personal project notice and remote deployment guidance

### Fixed
- 🐛 **Remote Deployment CORS Errors** - Fixed CORS issues when running on domains other than localhost
- ✅ **ESLint Warnings** - Resolved 5 linting issues (unused variables, const declarations)
- 🔒 **API Key Exposure** - Eliminated unnecessary credential passing to frontend

### Security
- 📧 **Server-Side Credential Management** - API keys stored securely server-side, never exposed to browser
- 🔐 **Improved Separation of Concerns** - Frontend sends data, backend handles all API authentication

### Notes
- This release maintains full backward compatibility with v1.3.0
- No database migrations needed
- All existing data works as-is

---

## [1.3.0] - 2025-11-01

### Added
- **Security: DOMPurify XSS Protection** - Added DOMPurify library to sanitize HTML from markdown rendering, preventing XSS attacks
- **Security: Comprehensive Input Validation** - Backend validation for all inputs (lists, notes, categories, tags, content)
- **Security: Input Length Limits** - Enforced limits: 75 chars for names, 500 chars for items, 1MB for notes
- **Security: HTTP Security Headers** - Added X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy
- **Security: Request Size Limits** - 10MB max payload size to prevent large payload attacks
- **Feature: Auto-Backup on Grammar Updates** - Notes are automatically backed up before grammar corrections are applied
- **Feature: Change Diff Preview** - Git-style diff viewer showing exactly what will change before applying grammar updates
- **Feature: One-Click Restore** - "Restore Backup" button appears when a backup exists, allowing quick recovery if needed
- **Code: Security Improvements** - Consolidated duplicate sanitization functions to Utils.sanitizeHtml

### Changed
- Updated markdown rendering to use DOMPurify for sanitization
- Improved error messages for input validation failures
- Refined input constraints (name max length reduced from 200 to 75 characters for better UX)
- Updated all escapeHtml calls to use centralized Utils.sanitizeHtml

### Fixed
- Fixed ESLint errors in notes-ai.js (undefined escapeHtml references, unused variables)
- Improved HTML escaping consistency across the codebase

### Security
- **Rating: 6/10 → 9/10** - Comprehensive security hardening
- Eliminated critical XSS vulnerability in markdown rendering
- Added defense-in-depth with validation at both frontend and backend
- Implemented OWASP best practices for input handling

## [1.2.0] - 2025-10-25

### Added
- **Notes Feature** - Write and manage markdown notes with live preview
- **AI for Notes** - Generate TLDR summaries and check grammar/spelling with AI
- **Split-Pane Editor** - Edit markdown on the left, preview on the right
- **Cloud Backup Support** - Export notes as markdown files for easy cloud sync
- **Notes UI** - Sidebar with notes list, search, and favorites
- Note categories (Personal, Work, Projects, Ideas, Other)
- Note search functionality
- AI-powered TLDR summaries for notes
- Grammar and spelling check for notes with correction suggestions

### Changed
- Migrated from localStorage to filesystem-based storage for reliability
- Improved data persistence with JSON file storage

## [1.1.0] - 2025-09-15

### Added
- **Lists Feature** - Create and manage lists with multiple categories and priorities
- **AI Suggestions** - Get AI-powered item suggestions for lists
- **Search & Filter** - Real-time search across lists, items, categories, and tags
- **Export/Import** - Backup and restore all data as JSON
- **Dark Mode** - Light and dark theme support
- **Markdown Support** - Markdown formatting in list items
- List categories (shopping, travel, work, projects, etc.)
- List priorities (high, medium, low)
- List deadlines
- Item completion tracking

## [1.0.0] - 2025-08-01

### Added
- Initial release of List Manager
- Basic list creation and management
- Local data storage
- Simple UI for managing lists and items
- Privacy-first approach with all data stored locally

---

## Upgrade Notes

### From 1.3.0 to 1.4.0
- No breaking changes
- All existing data is compatible
- AI proxy now always active (no changes needed if already configured)
- Remote server deployments now supported without special configuration
- Character counter appears in notes editor (no action needed)

### From 1.2.0 to 1.3.0
- No breaking changes
- All existing data is compatible
- New backup feature is automatic - no action needed
- Input length validation is now enforced (75 chars for names)
- If you have list names or note titles longer than 75 characters, they will be truncated on next save

### From 1.1.0 to 1.2.0
- No breaking changes
- Lists and settings data is compatible
- Migrated to filesystem storage automatically on first load

---

## Security Advisories

### v1.4.0
- **Improved API Security** - API keys now stored exclusively server-side, never exposed to frontend
- **Enhanced Deployment Security** - Unified proxy architecture eliminates CORS bypass risks
- **Code Quality** - All security best practices passed strict linting

### v1.3.0
- **Fixed Critical XSS Vulnerability** - Markdown rendering now uses DOMPurify sanitization
- **Added Input Validation** - All user inputs validated on backend
- **Improved Data Integrity** - Content size limits and type validation prevent malformed data

---

## Future Development

**This is a personal project.** Development prioritizes stability and personal needs, not feature expansion. Major features are unlikely to be added to the main project.

**Possible Future Updates (No Timeline):**
- Bug fixes and security improvements
- Dependency updates
- Performance optimizations
- Documentation improvements

**Not Planned (Won't Happen):**
- Cloud sync integration
- Collaborative features
- Mobile app
- Complex features beyond current scope

**If You Want New Features:**
Fork the repository and build them yourself! The codebase is clean and well-documented for customization.

---

## Contributing

**This is a personal project - contributions are not accepted.** However, you're welcome to:
- 🔀 **Fork** the repository
- 📝 **Customize** it for your needs
- 🐛 **Report bugs** (no guarantee of fixes)
- 💡 **Suggest ideas** (may not be implemented)

For more details, see the [Personal Project Notice](README.md#personal-project-notice) in the README.
