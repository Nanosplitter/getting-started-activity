/**
 * Connections Game - Main Entry Point
 *
 * This is the main entry point for the Connections game.
 * The code is organized into modules for better maintainability:
 *
 * - config.js: Configuration and constants
 * - modules/discord.js: Discord SDK setup and authentication
 * - modules/game-state.js: Game state management
 * - modules/game-logic.js: Game rules and validation logic
 * - modules/renderer.js: UI rendering functions
 * - modules/api.js: Server API communication
 * - utils/helpers.js: Utility functions
 */

import "./style.css";
import { isLocalMode, DATE_CONFIG } from "./config.js";
import { setupDiscordSdk, getCurrentUser, getGuildId, getChannelId } from "./modules/discord.js";
import { fetchGameData, fetchGameState, lookupUserSession } from "./modules/api.js";
import { setGameData, setCurrentDate, updateGameState, restoreFromGuessHistory } from "./modules/game-state.js";
import { hasUserPlayed } from "./modules/game-logic.js";
import { renderGame } from "./modules/renderer.js";

// Log the current mode
console.log(`Running in ${isLocalMode ? "LOCAL" : "DISCORD"} mode`);

/**
 * Initialize and start the game
 */
async function initializeGame() {
  const app = document.querySelector("#app");

  try {
    // Set up Discord SDK and authenticate
    await setupDiscordSdk();
    console.log("Discord SDK is authenticated");

    // Get the current date (or fallback)
    let gameDate = DATE_CONFIG.current;

    // Fetch today's connections game
    let gameData;
    try {
      gameData = await fetchGameData(gameDate);
    } catch (error) {
      // If today's game doesn't exist, try the fallback date
      console.log(`No game found for ${gameDate}, using fallback date ${DATE_CONFIG.fallback}`);
      gameDate = DATE_CONFIG.fallback;
      gameData = await fetchGameData(gameDate);
    }

    console.log("Game data received:", gameData);
    console.log("Categories:", gameData.categories);

    // Store game data and date
    setGameData(gameData);
    setCurrentDate(gameDate);

    // Fetch game state for this guild
    const guildId = getGuildId();
    const channelId = getChannelId();
    const currentUser = getCurrentUser();
    const serverGameState = await fetchGameState(guildId, gameDate);

    console.log("Server game state:", serverGameState);
    console.log("Current user:", currentUser);

    // Look up if this user has an active session in this channel
    const sessionLookup = await lookupUserSession(channelId, currentUser.id);

    // Always use userSessionId format for updates (server maps to messageSessionId internally)
    const sessionId = `${guildId}_${currentUser.id}_${gameDate}`;

    if (sessionLookup.found) {
      // User has an existing session - restore their progress
      console.log("✅ Found existing session:", sessionLookup.messageSessionId);

      // Restore progress from guess history
      if (sessionLookup.guessHistory && sessionLookup.guessHistory.length > 0) {
        restoreFromGuessHistory(sessionLookup.guessHistory);
        console.log(`🔄 Restored ${sessionLookup.guessHistory.length} guesses from server`);
      }

      // Update game state with userSessionId
      updateGameState({ sessionId });
    } else {
      // No active session found - check if user has completed this game before
      console.log("❌ No active session found, checking completion status");

      if (hasUserPlayed(serverGameState, currentUser.id)) {
        updateGameState({
          hasPlayed: true,
          isGameOver: true,
          sessionId
        });
      } else {
        updateGameState({
          sessionId
        });
      }
    }

    console.log("Session ID:", sessionId);

    console.log("Rendering game...");

    // Render the game
    renderGame(serverGameState);
  } catch (error) {
    console.error("Error initializing game:", error);
    app.innerHTML = `
      <div id="loading">
        <h1>Error Loading Game</h1>
        <p>Could not load today's Connections game. Please try again later.</p>
        <p style="color: #888; font-size: 0.9rem;">Error: ${error.message}</p>
      </div>
    `;
  }
}

// Start the application
initializeGame();
