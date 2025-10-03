/**
 * UI rendering functions
 */

import { getGameState, getRemainingWords, toggleWordSelection, clearSelection } from "./game-state.js";
import { handleSubmit, handleShuffle } from "./game-logic.js";
import { getCurrentUser, getDiscordSdk } from "./discord.js";
import { isLocalMode, CATEGORY_COLORS } from "../config.js";
import { escapeHtml } from "../utils/helpers.js";

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

  // Show local mode indicator
  if (isLocalMode) {
    html += `
      <div style="background: #2c5aa0; color: white; padding: 0.5rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.9rem; text-align: center;">
        🔧 Local Development Mode | User: ${currentUser?.username || "Unknown"} | Guild: ${
      discordSdk?.guildId || "default"
    }
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
}

/**
 * Render the list of completed players
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
      <h2>Completed Players</h2>
      ${completedPlayers
        .map(
          ([userId, player]) => `
        <div class="player-result">
          <span class="player-name">${escapeHtml(player.username)}</span>
          <span class="player-score">${player.score}/4 categories • ${player.mistakes} mistakes</span>
        </div>
      `
        )
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

  return `
    <div class="game-over">
      <h2>You've already completed today's Connections!</h2>
      <div class="final-score">
        Score: ${playerData.score}/4 categories<br>
        Mistakes: ${playerData.mistakes}/4
      </div>
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

  // In local mode, keep words in category order for easier development
  // In Discord mode, shuffle for normal gameplay
  let displayWords;
  let html = "";

  if (isLocalMode) {
    displayWords = remainingWords; // Keep in category order
    html += `<div class="dev-hint">
      💡 Dev Mode: Words are in category order | Each row = one category | Color bars show grouping
    </div>`;
  } else {
    displayWords = [...remainingWords].sort(() => Math.random() - 0.5); // Shuffle
  }

  html += `
    <div class="game-grid ${isLocalMode ? "dev-mode" : ""}">
      ${displayWords
        .map(
          (word) => `
        <button class="word-button" data-word="${escapeHtml(word)}">
          ${escapeHtml(word)}
        </button>
      `
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
