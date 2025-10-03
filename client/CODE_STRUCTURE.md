# Code Organization

This document explains how the Connections game code is organized.

## Directory Structure

```
client/
├── main.js                  # Entry point - initializes the game
├── config.js                # Configuration and constants
├── modules/                 # Core game modules
│   ├── discord.js          # Discord SDK setup and authentication
│   ├── game-state.js       # Game state management
│   ├── game-logic.js       # Game rules, validation, and handlers
│   ├── renderer.js         # UI rendering functions
│   └── api.js              # Server API communication
├── utils/                   # Utility functions
│   └── helpers.js          # Helper utilities (escapeHtml, showMessage, etc.)
├── mock-discord.js         # Mock Discord SDK for local development
├── style.css               # All styles
├── index.html              # Main HTML (Discord mode)
└── local.html              # Local development HTML
```

## Module Responsibilities

### `main.js` (Entry Point)

- Initializes the application
- Sets up Discord SDK authentication
- Loads game data
- Renders the initial game state
- ~75 lines (down from 500!)

### `config.js`

- All configuration constants
- Environment detection (local vs Discord)
- API endpoints
- Game settings (max mistakes, colors, etc.)

### `modules/discord.js`

- Discord SDK initialization
- Authentication flow
- User and guild ID management
- Handles both real and mock SDK

### `modules/game-state.js`

- Centralized game state management
- State getters and setters
- Word selection logic
- Solved categories tracking
- No UI or API calls - just state

### `modules/game-logic.js`

- Game rule validation
- Category matching logic
- "One away" detection
- Win/loss conditions
- Submit and shuffle handlers
- Coordinates between state, API, and renderer

### `modules/renderer.js`

- All UI rendering functions
- Converts state to HTML
- Event listener attachment
- No game logic - just presentation

### `modules/api.js`

- Server communication
- Fetch game data
- Save/load game state
- Data transformation (NYT format → internal format)

### `utils/helpers.js`

- Pure utility functions
- HTML escaping
- Message display
- Generic helpers

## Why This Structure?

### Single Responsibility

Each module has one clear purpose. Want to change how the UI looks? Edit `renderer.js`. Need to adjust game rules? Edit `game-logic.js`.

### Easy to Test

Modules can be tested independently. For example, you can test `game-logic.js` without touching Discord or the UI.

### Easy to Navigate

Looking for something? The file names tell you where to look:

- Authentication issues? → `discord.js`
- Game not validating correctly? → `game-logic.js`
- UI not displaying right? → `renderer.js`

### Easy to Extend

Want to add a new feature?

- New game mode? Add to `game-state.js` and `game-logic.js`
- New UI element? Add to `renderer.js`
- New API endpoint? Add to `api.js`

### Reduced Coupling

Modules import only what they need. Changes in one module rarely require changes in others.

## Import Graph

```
main.js
├── config.js
├── modules/discord.js
│   └── config.js
├── modules/game-state.js
│   └── config.js
├── modules/game-logic.js
│   ├── config.js
│   ├── game-state.js
│   ├── discord.js
│   ├── api.js
│   └── utils/helpers.js
├── modules/renderer.js
│   ├── config.js
│   ├── game-state.js
│   ├── discord.js
│   ├── game-logic.js (for handlers)
│   └── utils/helpers.js
└── modules/api.js
    └── config.js
```

## Development Tips

### Adding a New Feature

1. Identify which module it belongs to
2. Add the function to that module
3. Export it if other modules need it
4. Import it where you need to use it

### Debugging

1. Check the console for module-specific logs
2. Each module is small enough to read completely
3. Follow the import chain to understand data flow

### Making Changes

1. Find the relevant module using this README
2. Make your changes
3. The hot reload will update automatically
4. Test in both local and Discord modes

## Migration from Old Code

The old 500-line `main.js` has been backed up to `main-old-backup.js`. The new structure maintains 100% feature parity with the old code, just organized differently.

If you need to reference the old code, it's still there, but the new structure is much easier to work with!
