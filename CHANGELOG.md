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

## [1.14.0] - 2026-02-18

### Added
- 🪟 **Open Note in New Window** - Open any note in a separate browser popup window for side-by-side reference while writing another note
  - "New Window" button in the note editor toolbar
  - External-link icon button on each note card in the browser panel and sidebar items (visible on hover)
  - Re-clicking the same note's button focuses the existing popup rather than opening a duplicate
  - Full editor functionality in popup: pane toggles, autosave, PDF export, category and favorite controls
- ↕️ **Collapse All Sidebar Categories** - New collapse-all button in the sidebar header to quickly collapse all categories at once

### Changed
- 🔀 **Note Sort Toggle** - Sort control (A-Z / Date) moved from the sidebar into the notes browser header for better discoverability; preference persisted across sessions
- 🎨 **Sidebar Visual Redesign** - Sidebar now uses a box-shadow instead of a flat border, giving it a floating panel appearance; workspace area uses a subtle tinted background to distinguish it from the white sidebar and editor panels
- 🗂️ **Category Favoriting** - Mark categories as favorites to pin them at the top of the sidebar
- ✏️ **Category Renaming** - Rename existing categories directly from the sidebar
- 🧹 **Sidebar Simplification** - Removed rarely-used sort controls from sidebar; removed dead "Custom" category sort code

---

## [1.13.0] - 2026-02-14

### Added
- 📋 **Notes Browser Panel** - Dedicated notes browsing experience replaces the empty state when no note is selected
  - Grid and list view toggle (persisted preference), consistent with the lists tab
  - Notes grouped by collapsible category sections with expand/collapse all controls
  - Click any note card to open it in the editor
  - Floating back button to return from editor to the browser
- 🔀 **Note Reorganization** - Move notes between categories easily
  - Drag and drop note cards onto category headers
  - "Move to..." modal via three-dot menu on each card with hierarchical category picker
- 📏 **Wider Notes Sidebar** - Sidebar widened from 280px to 350px for better note name visibility
  - Removed 200px max-width cap on note titles
  - Added hover tooltip showing full note name

### Changed
- 🎨 **UI Spacing Improvements** - Better vertical alignment of floating buttons, browser header, and note editor title with consistent spacing below the app header
- 📅 **Date Formatting** - Gracefully handles missing or invalid dates instead of showing "Invalid Date"

---

## [1.12.1] - 2026-02-07

### Fixed
- 📄 **PDF Export Sizing** - Optimised PDF output for A4 paper to fit more content per page
  - Added explicit `font-size: 11pt` for print-appropriate body text
  - Reduced `line-height` from 1.6 to 1.4 (screen-optimised → print-optimised)
  - Scaled down heading sizes (h1: 2em→1.5em, h2: 1.5em→1.3em, h3: 1.25em→1.15em, h4: 1.1em→1.05em)
  - Increases usable lines per page from ~34 to ~48-50

---

## [1.12.0] - 2026-02-02

### Fixed
- 🎨 **Sidebar Layout Improvements** - Fixed overlapping buttons and improved visual alignment in notes sidebar
  - Added 3rem-3.5rem left padding to all sidebar content (search, categories, notes)
  - Repositioned search icon to prevent overlap with sidebar toggle button
  - Balanced right padding for visual symmetry
  - Fixed nested category alignment (4rem padding for depth-1 categories)
  - Note titles indented 3.5rem for visual hierarchy (0.5rem more than categories)

### Changed
- 🔍 **Improved Notes Search Behavior** - Search now provides better results visibility
  - Categories with no matching notes are hidden during search
  - Categories with matches auto-expand to show matching notes
  - Normal collapse/expand behavior returns when search is cleared
  - Added `currentSearchQuery` variable to track search state
  - Modified `renderCategoryNode()` to filter empty categories when searching
  - Updated `restoreCategoryState()` to force-expand during search

---

## [1.11.1] - 2026-01-31

### Security
- 🔒 **Fixed 4 npm audit vulnerabilities** (TC-166)
  - **qs** (high severity) - arrayLimit bypass allowing DoS via memory exhaustion
  - **body-parser** (high severity) - depends on vulnerable qs
  - **express** (high severity) - depends on vulnerable body-parser and qs
  - **eslint** (moderate severity) - stack overflow when serializing circular references

### Changed
- ⬆️ **ESLint v9 Migration** - Updated to ESLint v9 with flat config format
  - New `eslint.config.js` replaces deprecated `.eslintrc.json`
  - Added `@eslint/js` and `globals` packages

### Fixed
- Fixed 20 unused catch variable lint errors (renamed to `_error`, `_e`, `_err` pattern)
- Removed 20 obsolete eslint-disable directives

---

## [1.11.0] - 2025-12-28

### Added
- ➕ **Lists FAB (Floating Action Button)** - Quick actions for list management
  - New List, Import, and Export actions accessible from FAB
  - Positioned to align with search bar for visual consistency
  - Matches Notes FAB styling (subtle bordered style)

### Changed
- 🎨 **Unified UI Design** - Consistent styling between Lists and Notes pages
  - Category select styled to match title input (same border, padding, focus states)
  - Note metadata aligned vertically with sidebar toggle and FAB buttons
  - Lists footer actions replaced by FAB for cleaner interface

### Fixed
- Fixed `.notes-active` class not being applied to main content (incorrect JS selector)
- Fixed note metadata vertical alignment with fixed-position buttons

---

## [1.10.0] - 2025-12-27

### Added
- 🎨 **Font Family Options** - Choose from 6 privacy-respecting font stacks
  - System Default, Classic (Palatino), Modern Serif (Charter), Clean Sans (Avenir), Monospace, and Readable (Atkinson)
  - All fonts use system-installed fonts only (no external font services)
  - Font choice applies consistently across entire UI including buttons, inputs, and sidebar
- 📏 **Font Size Adjustment** - Scale text size from 75% to 150%
  - +/- buttons in Settings with Reset to default
  - Applies globally to all text in the application
- 📄 **Enhanced PDF Export** - More export customization options
  - Paper size selection: A4, Letter, Legal (defaults to A4)
  - Option to include/exclude title header in export
  - Exported PDF uses your selected font family
- 🗂️ **Sidebar Toggle Button** - Always-visible button to toggle notes sidebar
  - Fixed position at top-left of editor area (stays visible when scrolling)
  - Works alongside keyboard shortcut
- ⌨️ **Keyboard Shortcuts** - Quick access to common actions
  - `Cmd/Ctrl + B`: Toggle sidebar
  - `Cmd/Ctrl + N`: Create new note

### Changed
- Subcategories now render above notes within a category for better visual hierarchy
- "Add subcategory" button only appears on root categories (max 2 levels enforced)
- Font now applies consistently to category headers, FAB actions, and all form elements
- FAB (Floating Action Button) restyled and repositioned for UI consistency
  - Moved to left side, aligned below sidebar toggle button
  - Subtle bordered style matching sidebar toggle button
  - Removed redundant "Open Sidebar" option (now handled by dedicated button)

### Fixed
- Fixed font not applying to buttons, inputs, and form elements
- Fixed "Invalid Date" appearing in exported PDF filenames when note creation date was missing
- Fixed subcategory creation allowing more than 2 levels deep
- Fixed sidebar toggle button scrolling out of view (now fixed position)
- Increased note title display width in sidebar (shows more characters before truncation)

---

## [1.9.0] - 2025-12-26

### Added
- 📂 **Subcategories for Notes** - Organize notes with hierarchical categories (up to 2 levels deep)
  - Create subcategories like "Work/Projects" or "Personal/Health"
  - Visual hierarchy in sidebar with indented subcategories
  - "+" buttons appear on hover to add subcategories under any category
  - "Add Category" button at sidebar bottom for root categories
- 🖱️ **Drag and Drop Notes** - Move notes between categories by dragging
  - Drag any note to a category header to reassign it
  - Visual feedback with drop target highlighting
  - Toast notification confirms the move
- 📋 **Improved Category Dropdown** - Note editor category dropdown shows hierarchy
  - Subcategories displayed with visual indentation
  - Sorted alphabetically for easy navigation

### Changed
- Category expansion/collapse now uses `.category-content` wrapper for cleaner structure
- Empty subcategories are now visible (previously hidden until notes were added)

### Fixed
- Category toggle (expand/collapse) now works correctly with new hierarchical structure
- `restoreCategoryState()` updated to use new DOM structure

---

## [1.8.0] - 2025-12-25

### Added
- 🎯 **Notes FAB (Floating Action Button)** - Quick access to note functions from anywhere in the notes view
  - Toggle sidebar, create new note, import, and export actions
  - Positioned top-right under menu bar for easy access
  - Expands with smooth animation to show action menu
  - Only visible on Notes tab (hidden on Lists)
- 📦 **Improved Data Manager** - Clearer, safer import/export/clear operations (TC-20)
  - **Lists page**: Export/Import now handles lists only
  - **Notes page**: Export/Import now handles notes only (with full content)
  - **Settings Data Manager**: Full backup (lists + notes + settings)
  - All imports ADD to existing data (never replace)
  - Clear All Data auto-downloads backup before clearing

### Changed
- Removed redundant sidebar toggle button from notes editor header
- Removed notes footer action buttons (replaced by FAB)
- Streamlined notes UI with consolidated quick actions
- Export/Import behavior is now intuitive and context-specific

### Fixed
- Users no longer need to scroll to access note functions when viewing long notes (TC-19)
- Notes export now includes full content (was metadata only)
- Notes JSON import now functional (was showing "coming soon")
- Fixed route ordering for `/api/data/notes/export` endpoint
- Normalized unusual Unicode line terminators in exported content

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
