/**
 * Configuration and constants for the Connections game
 */

// Check if we're in local development mode (not in Discord iframe)
export const isLocalMode = !window.location.ancestorOrigins?.length && window.location.hostname === "localhost";

// Game configuration
export const GAME_CONFIG = {
  maxMistakes: 4,
  wordsPerCategory: 4,
  totalCategories: 4,
  selectableWords: 4
};

// Date configuration
export const DATE_CONFIG = {
  // Hardcoded for testing - uncomment the line below for production
  // current: new Date().toISOString().split("T")[0],
  current: "2025-10-02",
  fallback: "2024-10-02"
};

// Category difficulty colors
export const CATEGORY_COLORS = ["yellow", "green", "blue", "purple"];

// Discord client configuration
export const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID || "mock-client-id";

// API endpoints
export const API_ENDPOINTS = {
  token: "/api/token",
  connections: (date) => `/api/connections/${date}`,
  gameState: (guildId, date) => `/api/gamestate/${guildId}/${date}`,
  completeGame: (guildId, date) => `/api/gamestate/${guildId}/${date}/complete`
};
