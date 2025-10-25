# Development Guide

This guide is for developers who want to modify or fork List Manager for their own use.

**Note:** This is a personal project maintained for simplicity and low overhead. While you're welcome to fork and customize it, this guide focuses on personal development rather than contributing back.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Development Server](#development-server)
3. [Code Quality Tools](#code-quality-tools)
4. [Project Structure](#project-structure)
5. [Coding Standards](#coding-standards)
6. [Testing](#testing)
7. [Development Workflow](#development-workflow)

---

## Quick Start

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher

### Setup

```bash
# 1. Clone or download the project
cd list-manager

# 2. Install dependencies
npm install

# 3. Run the development server
npm run dev

# 4. Open in browser
# http://localhost:3000
```

---

## Development Server

### Why a Dev Server?

The app works perfectly without a server for core features. However, **AI features require a development server** due to browser CORS restrictions.

The dev server provides:
- ✅ Static file serving
- ✅ Claude API proxy (bypasses CORS)
- ✅ Local development at `localhost:3000`

### Usage

```bash
# Start development server
npm run dev

# Server will run on http://localhost:3000
# AI features will automatically use the proxy
```

### How It Works

The `server.js` file:
1. Serves static files (HTML, CSS, JS)
2. Proxies `/api/claude` requests to `https://api.anthropic.com`
3. Automatically adds CORS headers
4. Forwards your API key securely

The client (`claude-api.js`) automatically detects:
- If running on `localhost` → uses proxy (`/api/claude`)
- If running from `file://` → shows helpful error message

---

## Code Quality Tools

We use industry-standard tools to maintain code quality:

### ESLint (Linting)

Finds bugs and enforces code style:

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

**Configuration:** `.eslintrc.json`

- Uses `eslint:recommended` rules
- Includes `eslint-plugin-security` for security checks
- Configured for vanilla JavaScript (no frameworks)

### Prettier (Formatting)

Formats code consistently:

```bash
# Format all files
npm run format

# Check formatting (no changes)
npm run format:check
```

**Configuration:** `.prettierrc`

- 4-space indentation
- Single quotes
- Semicolons
- 100 character line width

### Security Auditing

Checks for vulnerable dependencies:

```bash
# Audit production dependencies
npm run security:audit

# Fix vulnerabilities
npm audit fix
```

### Pre-commit Validation

Run all checks before committing:

```bash
# Run all quality checks
npm run validate

# Or manually before commit
npm run precommit
```

This runs:
1. ESLint (linting)
2. Prettier (format check)
3. npm audit (security)

---

## Project Structure

```
list-manager/
├── index.html              # Main app entry point
├── server.js               # Development server (Node.js)
├── package.json            # Dependencies and scripts
│
├── js/                     # JavaScript modules
│   ├── app.js             # Main application logic
│   ├── storage.js         # localStorage wrapper
│   ├── ui-helpers.js      # DOM utilities
│   ├── utils.js           # General utilities
│   └── claude-api.js      # AI integration (proxy-aware)
│
├── styles/                 # CSS files
│   ├── themes.css         # Color variables & themes
│   ├── main.css           # Layout & base styles
│   └── components.css     # UI components
│
├── assets/                 # Static assets
│   └── sample-data.json   # Example data
│
├── .eslintrc.json         # ESLint configuration
├── .prettierrc            # Prettier configuration
├── .prettierignore        # Prettier ignore patterns
├── .gitignore             # Git ignore patterns
│
├── README.md              # User documentation
├── SETUP.md               # Setup instructions
├── DEVELOPMENT.md         # This file
├── CHANGELOG.md           # Version history
└── LICENSE                # MIT License
```

---

## Coding Standards

### JavaScript

**Style Guide:**
- Use ES6+ features (const/let, arrow functions, template literals)
- No `var` declarations
- Use strict equality (`===`)
- Always use braces for blocks
- Prefer `const` over `let`

**Patterns:**
- IIFEs for module scope (avoid global pollution)
- Expose public API via returned object
- Use meaningful variable names
- Add JSDoc comments for functions

**Example:**

```javascript
const MyModule = (function() {
    'use strict';

    /**
     * Does something useful
     * @param {string} input - The input
     * @returns {string} The result
     */
    function doSomething(input) {
        const result = input.toUpperCase();
        return result;
    }

    // Expose public API
    return {
        doSomething
    };
})();
```

### CSS

**Conventions:**
- Use CSS variables for theming
- Mobile-first responsive design
- BEM-inspired naming (not strict)
- Group related styles
- Comment sections

### HTML

**Best Practices:**
- Semantic HTML5 elements
- ARIA labels for accessibility
- Proper form labels
- Descriptive button text

---

## Testing

### Manual Testing Checklist

**Core Features:**
- [ ] Create, edit, delete lists
- [ ] Add, check, delete items
- [ ] Search lists and items
- [ ] Filter by category, tags, favorites
- [ ] Export data as JSON
- [ ] Import data from JSON
- [ ] Switch themes (light/dark)
- [ ] Toggle view (grid/list)

**AI Features (with dev server):**
- [ ] Add API key in settings
- [ ] Test API connection
- [ ] Generate list suggestions
- [ ] Add suggested items

**Responsive Design:**
- [ ] Desktop (1024px+)
- [ ] Tablet (640px-1023px)
- [ ] Mobile (320px-639px)

**Browser Compatibility:**
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

---

## Development Workflow

### Before Committing Changes

If you're forking and maintaining your own version, here's a good workflow:

1. **Run quality checks:**
   ```bash
   npm run validate
   ```

2. **Fix any issues:**
   ```bash
   npm run lint:fix
   npm run format
   ```

3. **Test manually:**
   - Test your changes in browser
   - Check console for errors
   - Verify on mobile/desktop

### Commit Message Format

Use clear, descriptive commit messages:

```
Add feature: AI suggestion panel
Fix bug: Search not working with items
Update docs: Add development guide
Refactor: Simplify storage module
```

### Pre-Release Checklist

Before tagging a new version of your fork:

- [ ] Code passes `npm run validate`
- [ ] Tested manually in browser
- [ ] No console errors
- [ ] Works on mobile and desktop
- [ ] Documentation updated (if needed)
- [ ] CHANGELOG.md updated

---

## Common Development Tasks

### Adding a New Feature

1. Plan the feature (update spec if needed)
2. Create a new branch (if using git)
3. Implement the feature
4. Test thoroughly
5. Run `npm run validate`
6. Update documentation
7. Update CHANGELOG.md
8. Commit and push

### Fixing a Bug

1. Reproduce the bug
2. Identify the root cause
3. Fix the issue
4. Test the fix
5. Ensure no regressions
6. Run `npm run validate`
7. Update CHANGELOG.md
8. Commit with clear message

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update specific package
npm update package-name

# Update all (be careful!)
npm update

# Test after updating
npm run validate
```

---

## Troubleshooting

### AI Features Not Working

**Problem:** API calls fail or CORS errors

**Solution:**
1. Make sure you're running the dev server (`npm run dev`)
2. Access via `http://localhost:3000` (not `file://`)
3. Check your API key is valid
4. Check browser console for errors

### ESLint Errors

**Problem:** Linting fails

**Solution:**
1. Read the error message carefully
2. Fix the code issue
3. Use `npm run lint:fix` for auto-fixable issues
4. Some issues require manual fixes

### Prettier Conflicts

**Problem:** Code keeps getting reformatted

**Solution:**
1. Use `npm run format` before committing
2. Configure your editor to use the `.prettierrc`
3. Add files to `.prettierignore` if needed

---

## Resources

- [ESLint Documentation](https://eslint.org/docs/latest/)
- [Prettier Documentation](https://prettier.io/docs/en/)
- [Claude API Documentation](https://docs.anthropic.com/claude/reference/messages_post)
- [Express Documentation](https://expressjs.com/)

---

## Getting Help

- **Questions?** Open an issue on GitHub
- **Found a bug?** Report it with steps to reproduce
- **Want to fork?** Feel free to fork and customize for your needs!

---

**Last Updated:** 2025-01-15
**Version:** 1.0.0
