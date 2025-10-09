/**
 * UI rendering functions
 */

import {
  getGameState,
  getGameData,
  getRemainingWords,
  toggleWordSelection,
  clearSelection,
  getCurrentDate
} from "./game-state.js";
import { handleSubmit, handleShuffle } from "./game-logic.js";
import { getCurrentUser, getDiscordSdk } from "./discord.js";
import { isLocalMode, isDevMode, CATEGORY_COLORS } from "../config.js";
import { escapeHtml } from "../utils/helpers.js";
import { deleteGameResult } from "./api.js";

/**
 * Render the complete game UI
 * @param {Object} serverGameState - Server game state with player data
 */
export function renderGame(serverGameState) {
  const app = document.querySelector("#app");
  const gameState = getGameState();
  const currentUser = getCurrentUser();
  const discordSdk = getDiscordSdk();

  let html = `<h1>Connections</h1>`;

  // Show dev mode indicator
  if (isDevMode) {
    const modeText = isLocalMode ? "Local Development Mode" : "Dev Mode (Discord SDK Active)";
    html += `
      <div class="dev-mode-banner">
        🔧 ${modeText} | User: ${currentUser?.username || "Unknown"} | Guild: ${discordSdk?.guildId || "default"}
      </div>
    `;
  }

  // Show completed players
  html += renderCompletedPlayers(serverGameState);

  // Show appropriate game state
  if (gameState.hasPlayed) {
    html += renderAlreadyPlayed(serverGameState, currentUser);
  } else if (gameState.isGameOver) {
    html += renderGameOver();
  } else {
    html += renderGameBoard();
  }

  app.innerHTML = html;

  // Attach event listeners if game is active
  if (!gameState.isGameOver && !gameState.hasPlayed) {
    attachEventListeners();
  }

  // Attach delete button listener if in dev mode and game is finished
  if (isDevMode && (gameState.isGameOver || gameState.hasPlayed)) {
    attachDeleteListener();
  }
}

/**
 * Render the list of completed players with visual guess history
 * @param {Object} serverGameState - Server game state
 * @returns {string} - HTML string
 */
function renderCompletedPlayers(serverGameState) {
  const completedPlayers = Object.entries(serverGameState.players || {});

  if (completedPlayers.length === 0) {
    return "";
  }

  return `
    <div class="completed-players">
      <h2>Completed Today</h2>
      <div class="player-results-grid">
        ${completedPlayers
          .map(([userId, player]) => {
            const guessHistory =
              typeof player.guessHistory === "string" ? JSON.parse(player.guessHistory) : player.guessHistory;
            return `
          <div class="player-result-card">
            ${renderPlayerAvatar(player, userId)}
            <div class="player-name">${escapeHtml(player.username)}</div>
            ${renderGuessGrid(guessHistory)}
          </div>
        `;
          })
          .join("")}
      </div>
    </div>
  `;
}

/**
 * Render a player's avatar
 * @param {Object} player - Player data
 * @param {string} userId - User ID
 * @returns {string} - HTML string
 */
function renderPlayerAvatar(player, userId) {
  // Discord CDN avatar URL
  if (player.avatar) {
    const avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${player.avatar}.png?size=128`;
    return `<img src="${avatarUrl}" alt="${escapeHtml(player.username)}" class="player-avatar" />`;
  }

  // Fallback to initials if no avatar
  const initials = player.username.substring(0, 2).toUpperCase();
  return `<div class="player-avatar-fallback">${initials}</div>`;
}

/**
 * Get the difficulty level for a specific word
 * @param {string} word - The word to check
 * @returns {number|null} - Difficulty level (0-3) or null if not found
 */
function getWordDifficulty(word) {
  const gameData = getGameData();
  if (!gameData || !gameData.categories) return null;

  for (const category of gameData.categories) {
    if (category.members.includes(word)) {
      return category.difficulty;
    }
  }
  return null;
}

/**
 * Render the visual guess grid (colored squares)
 * @param {Array} guessHistory - Array of guess objects
 * @returns {string} - HTML string
 */
function renderGuessGrid(guessHistory) {
  if (!guessHistory || guessHistory.length === 0) {
    return '<div class="guess-grid">No data</div>';
  }

  const colorEmojis = {
    0: "🟨", // Yellow (easiest)
    1: "🟩", // Green
    2: "🟦", // Blue
    3: "🟪" // Purple (hardest)
  };

  return `
    <div class="guess-grid">
      ${guessHistory
        .map((guess) => {
          if (guess.correct && guess.difficulty !== null) {
            // Correct guess - show 4 squares of the same color
            const emoji = colorEmojis[guess.difficulty] || "⬜";
            return `<div class="guess-row">${emoji}${emoji}${emoji}${emoji}</div>`;
          } else {
            // Incorrect guess - show the actual colors of the words guessed
            const emojis = guess.words.map((word) => {
              const difficulty = getWordDifficulty(word);
              return colorEmojis[difficulty] || "⬜";
            });
            return `<div class="guess-row">${emojis.join("")}</div>`;
          }
        })
        .join("")}
    </div>
  `;
}

/**
 * Render message for players who already completed the game
 * @param {Object} serverGameState - Server game state
 * @param {Object} currentUser - Current user object
 * @returns {string} - HTML string
 */
function renderAlreadyPlayed(serverGameState, currentUser) {
  const playerData = serverGameState.players[currentUser.id];
  const guessHistory =
    typeof playerData.guessHistory === "string" ? JSON.parse(playerData.guessHistory) : playerData.guessHistory;

  return `
    <div class="game-over">
      <h2>You've already completed today's Connections!</h2>
      <div class="final-score">
        Score: ${playerData.score}/4 categories<br>
        Mistakes: ${playerData.mistakes}/4
      </div>
      ${renderGuessGrid(guessHistory)}
      ${isDevMode ? '<button id="delete-record" class="dev-delete-btn">🗑️ Delete My Record (Dev Mode)</button>' : ""}
    </div>
  `;
}

/**
 * Render the game over screen
 * @returns {string} - HTML string
 */
function renderGameOver() {
  const gameState = getGameState();
  const score = gameState.solvedCategories.length;
  const won = score === 4;

  return `
    <div class="game-over">
      <h2>${won ? "🎉 Congratulations!" : "Game Over"}</h2>
      <div class="final-score">
        You solved ${score}/4 categories<br>
        Mistakes: ${gameState.mistakes}/${gameState.maxMistakes}
      </div>
      ${renderGuessGrid(gameState.guessHistory)}
      ${isDevMode ? '<button id="delete-record" class="dev-delete-btn">🗑️ Delete My Record (Dev Mode)</button>' : ""}
    </div>
  `;
}

/**
 * Render the active game board
 * @returns {string} - HTML string
 */
function renderGameBoard() {
  const gameState = getGameState();

  let html = `
    <div class="game-status">
      <div class="mistakes">
        Mistakes remaining: ${gameState.maxMistakes - gameState.mistakes}
      </div>
      <div class="mistake-dots">
        ${Array.from(
          { length: gameState.maxMistakes },
          (_, i) => `<div class="mistake-dot ${i < gameState.mistakes ? "used" : ""}"></div>`
        ).join("")}
      </div>
    </div>
  `;

  // Show solved categories
  html += renderSolvedCategories();

  // Message area
  html += `<div id="message"></div>`;

  // Word grid
  html += renderWordGrid();

  // Controls
  html += renderControls();

  return html;
}

/**
 * Render solved categories
 * @returns {string} - HTML string
 */
function renderSolvedCategories() {
  const gameState = getGameState();

  if (gameState.solvedCategories.length === 0) {
    return "";
  }

  let html = `<div class="solved-categories">`;

  gameState.solvedCategories.forEach((category) => {
    const colorClass = CATEGORY_COLORS[category.difficulty] || "yellow";
    html += `
      <div class="category ${colorClass}">
        <div class="category-title">${escapeHtml(category.group)}</div>
        <div class="category-words">${category.members.map(escapeHtml).join(", ")}</div>
      </div>
    `;
  });

  html += `</div>`;
  return html;
}

/**
 * Render the word grid
 * @returns {string} - HTML string
 */
function renderWordGrid() {
  const remainingWords = getRemainingWords();

  // In dev mode, keep words in category order for easier development
  // In normal mode, shuffle for gameplay
  let displayWords;
  let html = "";

  if (isDevMode) {
    displayWords = remainingWords; // Keep in category order
    html += `<div class="dev-hint">
      💡 Dev Mode: Words are in category order | Each row = one category | Color bars show grouping
    </div>`;
  } else {
    displayWords = [...remainingWords].sort(() => Math.random() - 0.5); // Shuffle
  }

  // Check which words are currently selected
  const gameState = getGameState();
  const selectedWords = gameState.selectedWords || [];

  html += `
    <div class="game-grid ${isDevMode ? "dev-mode" : ""}">
      ${displayWords
        .map(
          (word) => {
            const isSelected = selectedWords.includes(word);
            return `
        <button class="word-button ${isSelected ? "selected" : ""}" data-word="${escapeHtml(word)}">
          ${escapeHtml(word)}
        </button>
      `;
          }
        )
        .join("")}
    </div>
  `;

  return html;
}

/**
 * Render game controls
 * @returns {string} - HTML string
 */
function renderControls() {
  return `
    <div class="game-controls">
      <button id="shuffle" class="secondary">Shuffle</button>
      <button id="deselect" class="secondary">Deselect All</button>
      <button id="submit" disabled>Submit</button>
    </div>
  `;
}

/**
 * Attach event listeners to interactive elements
 */
function attachEventListeners() {
  // Word buttons
  document.querySelectorAll(".word-button").forEach((button) => {
    button.addEventListener("click", () => {
      const word = button.dataset.word;
      const isSelected = toggleWordSelection(word);

      if (isSelected) {
        button.classList.add("selected");
      } else {
        button.classList.remove("selected");
      }

      updateSubmitButton();
    });
  });

  // Shuffle button
  document.getElementById("shuffle")?.addEventListener("click", handleShuffle);

  // Deselect button
  document.getElementById("deselect")?.addEventListener("click", () => {
    clearSelection();
    document.querySelectorAll(".word-button").forEach((btn) => {
      btn.classList.remove("selected");
    });
    updateSubmitButton();
  });

  // Submit button
  document.getElementById("submit")?.addEventListener("click", handleSubmit);
}

/**
 * Update the submit button's enabled state
 */
function updateSubmitButton() {
  const gameState = getGameState();
  const submitBtn = document.getElementById("submit");
  if (submitBtn) {
    submitBtn.disabled = gameState.selectedWords.length !== 4;
  }
}

/**
 * Attach event listener to delete button (dev mode only)
 */
function attachDeleteListener() {
  const deleteBtn = document.getElementById("delete-record");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      const currentUser = getCurrentUser();
      const discordSdk = getDiscordSdk();
      const guildId = discordSdk?.guildId || "default";
      const currentDate = getCurrentDate();

      try {
        deleteBtn.disabled = true;
        deleteBtn.textContent = "Deleting...";

        await deleteGameResult(guildId, currentDate, currentUser.id);

        // Reload the page to restart the game
        window.location.reload();
      } catch (error) {
        console.error("Error deleting game result:", error);
        alert("Failed to delete record. Please try again.");
        deleteBtn.disabled = false;
        deleteBtn.textContent = "🗑️ Delete My Record (Dev Mode)";
      }
    });
  }
}
