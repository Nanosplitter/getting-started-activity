# Developer Quick Start

## 🎯 Common Tasks

### Adding a New Feature

When adding a feature, follow these steps:

1. Write the code in the appropriate module
2. **Write tests for the new feature** ✨
3. Run tests to ensure everything works
4. Update documentation if needed

#### 1. **New Game Rule**

Edit: `modules/game-logic.js`

```javascript
// Example: Add a hint system
export function getHint() {
  const gameState = getGameState();
  const gameData = getGameData();

  // Find an unsolved category
  const unsolved = gameData.categories.find(
    (cat) => !gameState.solvedCategories.some((solved) => solved.group === cat.group)
  );

  return unsolved ? unsolved.members[0] : null;
}
```

**Then write a test** in `tests/modules/game-logic.test.js`:

```javascript
it("should return a hint from an unsolved category", () => {
  const hint = getHint();
  expect(hint).toBeDefined();
  expect(gameData.categories.some((cat) => cat.members.includes(hint))).toBe(true);
});
```

#### 2. **New UI Element**

Edit: `modules/renderer.js`

```javascript
// Example: Add a timer display
function renderTimer() {
  const elapsed = Date.now() - gameState.startTime;
  return `
    <div class="timer">
      Time: ${Math.floor(elapsed / 1000)}s
    </div>
  `;
}

// Then add to renderGameBoard():
html += renderTimer();
```

#### 3. **New API Endpoint**

Edit: `modules/api.js`

```javascript
// Example: Fetch user stats
export async function fetchUserStats(userId) {
  const response = await fetch(`/api/user/${userId}/stats`);
  if (!response.ok) {
    throw new Error("Failed to fetch user stats");
  }
  return response.json();
}
```

#### 4. **New Configuration**

Edit: `config.js`

```javascript
// Example: Add timer settings
export const TIMER_CONFIG = {
  enabled: true,
  maxTime: 300, // 5 minutes in seconds
  warningTime: 60 // Show warning at 1 minute
};
```

### Debugging

#### Finding Where Code Lives

1. **UI issue?** → Start in `modules/renderer.js`
2. **Game rule problem?** → Check `modules/game-logic.js`
3. **State not updating?** → Look at `modules/game-state.js`
4. **API failing?** → Debug `modules/api.js`
5. **Auth issue?** → Investigate `modules/discord.js`

#### Common Debugging Flow

```javascript
// Add console.logs at module boundaries

// In renderer.js
export function renderGame(serverGameState) {
  console.log("[Renderer] Rendering with state:", serverGameState);
  // ...
}

// In game-logic.js
export async function handleSubmit() {
  console.log("[Logic] Handling submit:", gameState.selectedWords);
  // ...
}

// In game-state.js
export function updateGameState(updates) {
  console.log("[State] Updating state:", updates);
  // ...
}
```

### Testing Changes

#### Local Mode (Fastest)

```bash
# Terminal 1: Server
cd server
npm run dev

# Terminal 2: Client
cd client
npm run dev

# Open: http://localhost:5173/local.html
```

#### Discord Mode

```bash
# Same as above, but open: http://localhost:5173
# (Must be in Discord Activity iframe)
```

## 📝 Code Examples

### Example 1: Add a "Give Up" Button

**Step 1:** Add the handler in `game-logic.js`:

```javascript
export async function handleGiveUp() {
  const gameState = getGameState();

  // Mark as game over
  completeGame();

  // Save result with 0 score
  await saveGameResult();

  // Refresh to show game over screen
  await refreshGame();
}
```

**Step 2:** Add the button in `renderer.js`:

```javascript
function renderControls() {
  return `
    <div class="game-controls">
      <button id="shuffle" class="secondary">Shuffle</button>
      <button id="deselect" class="secondary">Deselect All</button>
      <button id="giveup" class="secondary danger">Give Up</button>
      <button id="submit" disabled>Submit</button>
    </div>
  `;
}

// Add to attachEventListeners():
document.getElementById("giveup")?.addEventListener("click", handleGiveUp);
```

**Step 3:** Add styling in `style.css`:

```css
.game-controls button.danger {
  background-color: #dc3545;
  color: white;
}

.game-controls button.danger:hover {
  background-color: #c82333;
}
```

### Example 2: Add a Score History

**Step 1:** Create new API endpoint in `api.js`:

```javascript
export async function fetchUserHistory(userId) {
  const response = await fetch(`/api/user/${userId}/history`);
  if (!response.ok) {
    throw new Error("Failed to fetch history");
  }
  return response.json();
}
```

**Step 2:** Add state management in `game-state.js`:

```javascript
let userHistory = [];

export function setUserHistory(history) {
  userHistory = history;
}

export function getUserHistory() {
  return userHistory;
}
```

**Step 3:** Load history in `main.js`:

```javascript
// After authentication
const history = await fetchUserHistory(currentUser.id);
setUserHistory(history);
```

**Step 4:** Display in `renderer.js`:

```javascript
function renderUserHistory() {
  const history = getUserHistory();

  if (history.length === 0) return "";

  return `
    <div class="user-history">
      <h3>Your History</h3>
      ${history
        .map(
          (game) => `
        <div class="history-item">
          ${game.date}: ${game.score}/4 (${game.mistakes} mistakes)
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

// Add to renderGame():
html += renderUserHistory();
```

## 🔍 Module Cheat Sheet

| I want to...                | Edit this file                      |
| --------------------------- | ----------------------------------- |
| Change authentication       | `modules/discord.js`                |
| Add/modify game rules       | `modules/game-logic.js`             |
| Update game state structure | `modules/game-state.js`             |
| Change UI appearance        | `modules/renderer.js` + `style.css` |
| Add new API call            | `modules/api.js`                    |
| Add constants/settings      | `config.js`                         |
| Add utility function        | `utils/helpers.js`                  |
| Change app initialization   | `main.js`                           |

## 🚀 Best Practices

### 1. **Keep Modules Focused**

```javascript
// Good ✅ - game-logic.js
export function checkCategoryMatch(words) {
  // Just logic, no UI, no API
}

// Bad ❌ - mixing concerns
export function checkCategoryMatch(words) {
  const match = /* logic */;
  showMessage("Correct!"); // UI concern
  saveToServer(match); // API concern
}
```

### 2. **Document Public Functions**

```javascript
/**
 * Check if the selected words match any category
 * @param {string[]} selectedWords - Array of 4 words
 * @returns {Object|null} - Category object or null
 */
export function checkCategoryMatch(selectedWords) {
  // ...
}
```

### 3. **Use Meaningful Names**

```javascript
// Good ✅
export function hasUserPlayed(serverGameState, userId)

// Bad ❌
export function check(state, id)
```

### 4. **Handle Errors Gracefully**

```javascript
export async function fetchGameData(date) {
  try {
    const response = await fetch(`/api/connections/${date}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error("Failed to fetch game data:", error);
    throw error; // Re-throw for caller to handle
  }
}
```

### 5. **Keep Config Separate**

```javascript
// Good ✅ - in config.js
export const MAX_MISTAKES = 4;

// Bad ❌ - hardcoded
if (mistakes >= 4) {
  /* ... */
}
```

### 6. **Write Tests for New Code**

```javascript
// Write tests as you develop
describe("new feature", () => {
  it("should work as expected", () => {
    const result = newFeature();
    expect(result).toBeDefined();
  });

  it("should handle edge cases", () => {
    expect(newFeature(null)).toBeNull();
  });
});
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm test -- --watch

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui
```

### Test Coverage

Current status: **79 tests passing** ✅

| Module                  | Tests | Coverage |
| ----------------------- | ----- | -------- |
| `utils/helpers.js`      | 16    | ~100%    |
| `modules/game-state.js` | 25    | ~95%     |
| `modules/game-logic.js` | 26    | ~90%     |
| `modules/api.js`        | 12    | ~85%     |

### Writing Tests

Tests live in `tests/` directory, mirroring the source structure:

```
client/
├── modules/
│   └── game-logic.js
└── tests/
    └── modules/
        └── game-logic.test.js
```

Example test:

```javascript
import { describe, it, expect } from "vitest";
import { checkCategoryMatch } from "../../modules/game-logic.js";

describe("checkCategoryMatch", () => {
  it("should match correct category", () => {
    const result = checkCategoryMatch(["APPLE", "ORANGE", "BANANA", "GRAPE"]);
    expect(result.group).toBe("FRUITS");
  });
});
```

**See `tests/README.md` for comprehensive testing guide!**

## 📚 Further Reading

- **`CODE_STRUCTURE.md`** - Detailed module documentation
- **`ARCHITECTURE.md`** - System architecture and data flow
- **`REFACTORING_SUMMARY.md`** - What changed and why

## 💡 Tips

1. **Use your IDE's "Go to Definition"** (F12 in VS Code) to navigate between modules
2. **Use search** (Ctrl+Shift+F) to find where functions are used
3. **Check imports** at the top of files to understand dependencies
4. **Follow the data flow**: User Action → Logic → State → Renderer
5. **Test in local mode first** - it's faster and easier to debug

---

**Happy coding! 🎉 The modular structure makes development much easier!**
