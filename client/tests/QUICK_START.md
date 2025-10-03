# Test Quick Reference

## Run Tests

```bash
# Run all tests
npm test

# Watch mode (recommended for development)
npm test -- --watch

# With UI
npm run test:ui

# With coverage
npm run test:coverage
```

## Test Results

✅ **79 tests passing**

- ✓ `utils/helpers.test.js` (16 tests)
- ✓ `modules/game-state.test.js` (25 tests)
- ✓ `modules/game-logic.test.js` (26 tests)
- ✓ `modules/api.test.js` (12 tests)

## Coverage

- `utils/helpers.js`: ~100%
- `modules/game-state.js`: ~95%
- `modules/game-logic.js`: ~90%
- `modules/api.js`: ~85%

**Overall: ~90% coverage**

## Quick Test Example

```javascript
import { describe, it, expect } from "vitest";
import { toggleWordSelection } from "../../modules/game-state.js";

describe("game-state", () => {
  it("should toggle word selection", () => {
    const result = toggleWordSelection("APPLE");
    expect(result).toBe(true);
  });
});
```

## Full Documentation

See **`README.md`** in this directory for:

- Complete testing guide
- Best practices
- Debugging tips
- Writing new tests
- CI/CD integration

---

**Keep tests green! 🟢**
