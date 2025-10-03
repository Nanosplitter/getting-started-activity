# Architecture Overview

## System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         main.js                              │
│                    (Entry Point)                             │
│  • Initialize Discord SDK                                    │
│  • Load game data                                            │
│  • Render initial state                                      │
└────────────┬────────────────────────────────────────────────┘
             │
             ├──────────────┬──────────────┬──────────────┐
             ▼              ▼              ▼              ▼
      ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
      │ discord  │   │   api    │   │  game-   │   │ renderer │
      │  .js     │   │  .js     │   │ state.js │   │   .js    │
      └──────────┘   └──────────┘   └──────────┘   └──────────┘
           │              │               │              │
           │              │               │              ▼
           │              │               │         ┌─────────┐
           │              │               │         │  game-  │
           │              │               │         │ logic.js│
           │              │               │         └─────────┘
           │              │               │              │
           ▼              ▼               ▼              ▼
      ┌──────────────────────────────────────────────────────┐
      │                    config.js                         │
      │              (Constants & Settings)                  │
      └──────────────────────────────────────────────────────┘
                              │
                              ▼
                        ┌──────────┐
                        │ helpers  │
                        │   .js    │
                        └──────────┘
```

## Data Flow

### 1. **Initialization** (main.js)

```
User Opens App
    ↓
Setup Discord SDK (discord.js)
    ↓
Fetch Game Data (api.js)
    ↓
Store in State (game-state.js)
    ↓
Render UI (renderer.js)
```

### 2. **User Interaction** (User clicks word)

```
User Clicks Word
    ↓
renderer.js captures click
    ↓
game-state.js toggles selection
    ↓
renderer.js updates button style
```

### 3. **Submit Guess** (User clicks submit)

```
User Clicks Submit
    ↓
game-logic.js handles submit
    ↓
game-logic.js checks match
    ↓
game-state.js updates state
    ↓
api.js saves to server (if needed)
    ↓
renderer.js re-renders board
```

## Module Responsibilities

### 🎯 **main.js** - Entry Point

- **Imports:** discord, api, game-state, renderer
- **Exports:** None (entry point)
- **Responsibilities:**
  - Initialize application
  - Coordinate initial setup
  - Handle startup errors

### 🔐 **modules/discord.js** - Authentication

- **Imports:** config, mock-discord
- **Exports:** setupDiscordSdk, getCurrentUser, getGuildId, getDiscordSdk
- **Responsibilities:**
  - Initialize Discord SDK
  - Handle authentication flow
  - Manage mock SDK for local mode
  - Provide user/guild info

### 🎮 **modules/game-state.js** - State Management

- **Imports:** config
- **Exports:** getGameState, updateGameState, toggleWordSelection, etc.
- **Responsibilities:**
  - Store game state
  - Provide state getters/setters
  - Manage word selection
  - Track solved categories
  - NO business logic (just data)

### 🎲 **modules/game-logic.js** - Game Rules

- **Imports:** game-state, discord, api, helpers, config
- **Exports:** checkCategoryMatch, isOneAway, handleSubmit, handleShuffle
- **Responsibilities:**
  - Validate guesses
  - Check win/loss conditions
  - Handle user actions
  - Coordinate between state/API/renderer

### 🎨 **modules/renderer.js** - UI Rendering

- **Imports:** game-state, game-logic, discord, helpers, config
- **Exports:** renderGame
- **Responsibilities:**
  - Convert state to HTML
  - Attach event listeners
  - Update UI elements
  - NO business logic (just presentation)

### 🌐 **modules/api.js** - Server Communication

- **Imports:** config
- **Exports:** fetchGameData, fetchGameState, saveGameResult
- **Responsibilities:**
  - Fetch game data from NYT
  - Load/save game state
  - Transform API data
  - Handle API errors

### ⚙️ **config.js** - Configuration

- **Imports:** None
- **Exports:** isLocalMode, GAME_CONFIG, API_ENDPOINTS, etc.
- **Responsibilities:**
  - Environment detection
  - Game constants
  - API endpoints
  - Color schemes

### 🛠️ **utils/helpers.js** - Utilities

- **Imports:** None
- **Exports:** escapeHtml, showMessage, wait
- **Responsibilities:**
  - Pure utility functions
  - HTML sanitization
  - UI helpers
  - Generic tools

## Dependency Graph

```
main.js
  ├─→ config.js
  ├─→ modules/discord.js
  │     └─→ config.js
  ├─→ modules/game-state.js
  │     └─→ config.js
  ├─→ modules/api.js
  │     └─→ config.js
  └─→ modules/renderer.js
        ├─→ config.js
        ├─→ game-state.js
        ├─→ discord.js
        ├─→ game-logic.js
        │     ├─→ config.js
        │     ├─→ game-state.js
        │     ├─→ discord.js
        │     ├─→ api.js
        │     └─→ utils/helpers.js
        └─→ utils/helpers.js
```

## Key Design Principles

### 1. **Separation of Concerns**

Each module has a single, clear responsibility:

- State management ≠ UI rendering
- Game logic ≠ API calls
- Configuration ≠ Business logic

### 2. **Unidirectional Data Flow**

```
User Action → Logic → State → Renderer → DOM
```

### 3. **Dependency Injection**

Modules don't create their dependencies - they import them:

```javascript
// Good ✅
import { fetchGameData } from "./api.js";
const data = await fetchGameData(date);

// Bad ❌
const data = await fetch("/api/connections/" + date);
```

### 4. **Pure Functions Where Possible**

```javascript
// Pure ✅
export function escapeHtml(text) {
  return text.replace(/</g, "&lt;");
}

// Impure but necessary
export function renderGame(state) {
  document.querySelector("#app").innerHTML = html;
}
```

### 5. **Clear Interfaces**

Each module exports a clear, documented API:

```javascript
/**
 * Check if the selected words match any unsolved category
 * @param {string[]} selectedWords - Array of selected words
 * @returns {Object|null} - Matched category or null
 */
export function checkCategoryMatch(selectedWords) {
  // ...
}
```

## Testing Strategy (Future)

With this structure, testing becomes straightforward:

### Unit Tests

- `game-logic.js` - Test game rules in isolation
- `helpers.js` - Test utility functions
- `game-state.js` - Test state management

### Integration Tests

- Test module interactions
- Mock API calls
- Test event handlers

### E2E Tests

- Test complete user flows
- Test both local and Discord modes

## Performance Considerations

- **Code Splitting**: Vite automatically code-splits modules
- **Tree Shaking**: Unused exports are removed in production
- **Lazy Loading**: renderer.js dynamically imports when needed
- **No Performance Cost**: Modern bundlers optimize this structure

## Future Enhancements

Easy to add with this structure:

- ✅ Unit tests for each module
- ✅ Multiple game modes
- ✅ Different puzzle sources
- ✅ Multiplayer features
- ✅ Analytics tracking
- ✅ A/B testing
- ✅ Plugin system

---

**This architecture makes the codebase maintainable, testable, and extensible! 🚀**
