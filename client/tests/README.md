# Testing Guide

## Overview

This project uses [Vitest](https://vitest.dev/) for unit testing. Vitest is a fast, Vite-native testing framework that's compatible with Jest's API.

## Running Tests

### Run all tests

```bash
npm test
```

### Run tests in watch mode (auto-rerun on changes)

```bash
npm test -- --watch
```

### Run tests with UI

```bash
npm run test:ui
```

Then open http://localhost:51204 (or the URL shown in terminal)

### Run tests with coverage

```bash
npm run test:coverage
```

Coverage report will be in `coverage/` directory

### Run specific test file

```bash
npm test game-state
```

### Run tests matching a pattern

```bash
npm test -- -t "should toggle word"
```

## Test Structure

```
client/
├── tests/
│   ├── setup.js              # Global test setup and mocks
│   ├── modules/
│   │   ├── api.test.js       # API communication tests
│   │   ├── game-logic.test.js # Game rules & validation tests
│   │   └── game-state.test.js # State management tests
│   └── utils/
│       └── helpers.test.js    # Utility function tests
├── vitest.config.js           # Vitest configuration
└── package.json               # Test scripts
```

## What's Tested

### ✅ `utils/helpers.js`

- **escapeHtml**: XSS protection, special character handling
- **showMessage**: Message display, timing, error handling
- **wait**: Promise-based delays

### ✅ `modules/game-state.js`

- State initialization and reset
- Word selection (toggle, clear, max limit)
- Category management (add solved, get remaining)
- Mistake tracking
- Game completion
- Data persistence (get/set game data, dates)

### ✅ `modules/game-logic.js`

- **checkCategoryMatch**: Correct/incorrect guesses, order independence
- **isOneAway**: 3-of-4 match detection
- **isGameWon**: Victory conditions
- **isGameLost**: Defeat conditions
- **hasUserPlayed**: User tracking

### ✅ `modules/api.js`

- **fetchGameData**: Data fetching, transformation, error handling
- **fetchGameState**: State retrieval, error handling
- **saveGameResult**: Data posting, error handling

## Coverage Goals

Current coverage:

- **utils/helpers.js**: ~100%
- **modules/game-state.js**: ~95%
- **modules/game-logic.js**: ~90%
- **modules/api.js**: ~85%

Target: 80%+ overall coverage

## Writing New Tests

### Basic Test Structure

```javascript
import { describe, it, expect, beforeEach } from "vitest";
import { functionToTest } from "../../path/to/module.js";

describe("module name", () => {
  describe("functionToTest", () => {
    beforeEach(() => {
      // Setup before each test
    });

    it("should do something specific", () => {
      const result = functionToTest(input);
      expect(result).toBe(expectedOutput);
    });
  });
});
```

### Mocking fetch

```javascript
import { vi } from "vitest";

beforeEach(() => {
  global.fetch = vi.fn();
});

it("should fetch data", async () => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: "test" })
  });

  const result = await fetchFunction();
  expect(result).toEqual({ data: "test" });
});
```

### Testing async functions

```javascript
it("should handle async operations", async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Testing timers

```javascript
import { vi } from "vitest";

it("should work with timers", () => {
  vi.useFakeTimers();

  functionWithTimer();
  vi.advanceTimersByTime(1000);

  expect(something).toHaveHappened();

  vi.useRealTimers();
});
```

### Testing DOM

```javascript
beforeEach(() => {
  document.body.innerHTML = '<div id="test"></div>';
});

it("should update DOM", () => {
  const element = document.getElementById("test");
  expect(element).toBeTruthy();
});
```

## Best Practices

### 1. **Test Behavior, Not Implementation**

```javascript
// Good ✅
it("should select up to 4 words", () => {
  toggleWordSelection("WORD1");
  toggleWordSelection("WORD2");
  toggleWordSelection("WORD3");
  toggleWordSelection("WORD4");
  toggleWordSelection("WORD5");

  expect(getGameState().selectedWords).toHaveLength(4);
});

// Bad ❌ (testing internal implementation)
it("should check array length before pushing", () => {
  // Testing how it's done, not what it does
});
```

### 2. **Use Descriptive Test Names**

```javascript
// Good ✅
it("should return true when exactly 3 words match a category");

// Bad ❌
it("should work");
```

### 3. **Arrange, Act, Assert (AAA Pattern)**

```javascript
it("should add a solved category", () => {
  // Arrange
  const category = { group: "TEST", members: ["A", "B", "C", "D"] };

  // Act
  addSolvedCategory(category);

  // Assert
  expect(getGameState().solvedCategories).toContain(category);
});
```

### 4. **Test Edge Cases**

```javascript
it("should handle empty strings", () => {
  expect(escapeHtml("")).toBe("");
});

it("should handle null input", () => {
  expect(processData(null)).toBeNull();
});
```

### 5. **Isolate Tests**

```javascript
beforeEach(() => {
  resetGameState(); // Ensure clean state for each test
  vi.clearAllMocks(); // Clear all mocks
});
```

## Continuous Integration

Tests run automatically on:

- Every commit
- Pull requests
- Before deployment

CI will fail if:

- Any test fails
- Coverage drops below threshold
- Linting errors exist

## Debugging Tests

### View test output

```bash
npm test -- --reporter=verbose
```

### Debug in VS Code

1. Set breakpoints in test files
2. Use "Run and Debug" panel
3. Select "Debug Tests" configuration

### Console output

Tests run with `console.log` visible by default. To suppress:

```javascript
// In tests/setup.js
global.console = {
  ...console,
  log: vi.fn()
};
```

## Common Issues

### Issue: Tests timing out

**Solution**: Increase timeout

```javascript
it("slow test", async () => {
  // ...
}, 10000); // 10 second timeout
```

### Issue: Fetch not mocked

**Solution**: Clear and setup mock in beforeEach

```javascript
beforeEach(() => {
  global.fetch = vi.fn();
});
```

### Issue: DOM not available

**Solution**: Check vitest.config.js has `environment: 'jsdom'`

### Issue: Module not found

**Solution**: Check import paths are relative (`../../modules/...`)

## Adding Tests for New Features

1. Create test file in appropriate directory:

   - Modules: `tests/modules/your-module.test.js`
   - Utils: `tests/utils/your-util.test.js`

2. Follow existing test structure

3. Test all function behaviors:

   - Happy path (normal usage)
   - Edge cases (empty, null, extreme values)
   - Error cases (invalid input, failures)

4. Run tests and check coverage:

   ```bash
   npm run test:coverage
   ```

5. Aim for 80%+ coverage for new code

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Jest Matchers Reference](https://jestjs.io/docs/expect) (Vitest is compatible)

---

**Keep tests simple, focused, and maintainable!** 🧪
