/**
 * Test setup and global mocks
 */

import { vi } from "vitest";

// Mock fetch globally
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests (optional)
// global.console = {
//   ...console,
//   log: vi.fn(),
//   error: vi.fn(),
//   warn: vi.fn(),
// };

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Mock import.meta.env for Vite environment variables
vi.mock("import.meta", () => ({
  env: {
    VITE_DISCORD_CLIENT_ID: "test-client-id"
  }
}));
