import { DiscordSDK } from "@discord/embedded-app-sdk";
import { MockDiscordSDK, mockTokenEndpoint } from "./mock-discord.js";
import "./style.css";

// Check if we're in local development mode (not in Discord iframe)
const isLocalMode = !window.location.ancestorOrigins?.length && window.location.hostname === "localhost";

console.log(`Running in ${isLocalMode ? "LOCAL" : "DISCORD"} mode`);

// Will eventually store the authenticated user's access_token
let auth;
let currentUser;
let gameData;
let currentDate; // Store the date being played
let gameState = {
  selectedWords: [],
  solvedCategories: [],
  mistakes: 0,
  maxMistakes: 4,
  isGameOver: false,
  hasPlayed: false
};

// Use mock SDK in local mode, real SDK in Discord
const discordSdk = isLocalMode
  ? new MockDiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID || "mock-client-id")
  : new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);

setupDiscordSdk().then(() => {
  console.log("Discord SDK is authenticated");
  initializeGame();
});

async function setupDiscordSdk() {
  await discordSdk.ready();
  console.log("Discord SDK is ready");

  // Authorize with Discord Client
  const { code } = await discordSdk.commands.authorize({
    client_id: import.meta.env.VITE_DISCORD_CLIENT_ID || "mock-client-id",
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify", "guilds"]
  });

  // Retrieve an access_token from your activity's server
  let tokenData;
  if (isLocalMode) {
    // Use mock token endpoint in local mode
    tokenData = await mockTokenEndpoint(code);
  } else {
    // Use real server endpoint in Discord mode
    const response = await fetch("/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code
      })
    });
    tokenData = await response.json();
  }

  const { access_token } = tokenData;

  // Authenticate with Discord client (using the access_token)
  auth = await discordSdk.commands.authenticate({
    access_token
  });

  if (auth == null) {
    throw new Error("Authenticate command failed");
  }

  // Get current user info
  currentUser = auth.user;
  console.log("Current user:", currentUser);
}

async function initializeGame() {
  const app = document.querySelector("#app");

  // Get today's date in YYYY-MM-DD format
  // let today = new Date().toISOString().split("T")[0];
  let today = "2025-10-02";

  // Fallback to a known working date if today's game doesn't exist
  // (NYT Connections may not have future dates)
  const fallbackDate = "2024-10-02";

  try {
    // Fetch today's connections game
    let gameResponse = await fetch(`/api/connections/${today}`);

    // If today's game doesn't exist, try the fallback
    if (!gameResponse.ok) {
      console.log(`No game found for ${today}, using fallback date ${fallbackDate}`);
      today = fallbackDate;
      gameResponse = await fetch(`/api/connections/${today}`);
    }

    if (!gameResponse.ok) {
      throw new Error("Failed to fetch game data");
    }

    // Store the current date globally
    currentDate = "2025-10-01";

    gameData = await gameResponse.json();
    console.log("Game data received:", gameData);
    console.log("Categories:", gameData.categories);

    // Transform NYT format to our internal format
    if (gameData.categories) {
      gameData.categories = gameData.categories.map((cat, index) => ({
        group: cat.title,
        members: cat.cards.map((card) => card.content),
        difficulty: index // 0=Yellow, 1=Green, 2=Blue, 3=Purple
      }));
    }
    console.log("Transformed categories:", gameData.categories);

    // Fetch game state for this guild
    const guildId = discordSdk.guildId || "default";
    const stateResponse = await fetch(`/api/gamestate/${guildId}/${today}`);
    const serverGameState = await stateResponse.json();

    console.log("Server game state:", serverGameState);
    console.log("Current user:", currentUser);
    // Check if current user has already played
    if (serverGameState.players && serverGameState.players[currentUser.id]) {
      gameState.hasPlayed = true;
      gameState.isGameOver = true;
    }

    renderGame(serverGameState);
  } catch (error) {
    console.error("Error initializing game:", error);
    app.innerHTML = `
      <div id="loading">
        <h1>Error Loading Game</h1>
        <p>Could not load today's Connections game. Please try again later.</p>
      </div>
    `;
  }
}

function renderGame(serverGameState) {
  const app = document.querySelector("#app");

  let html = `
    <h1>Connections</h1>
  `;

  // Show local mode indicator
  if (isLocalMode) {
    html += `
      <div style="background: #2c5aa0; color: white; padding: 0.5rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.9rem; text-align: center;">
        🔧 Local Development Mode | User: ${currentUser?.username || "Unknown"} | Guild: ${discordSdk.guildId}
      </div>
    `;
  }

  // Show completed players
  const completedPlayers = Object.entries(serverGameState.players || {});
  if (completedPlayers.length > 0) {
    html += `
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

  if (gameState.hasPlayed) {
    const playerData = serverGameState.players[currentUser.id];
    html += `
      <div class="game-over">
        <h2>You've already completed today's Connections!</h2>
        <div class="final-score">
          Score: ${playerData.score}/4 categories<br>
          Mistakes: ${playerData.mistakes}/4
        </div>
      </div>
    `;
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

function renderGameBoard() {
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
  if (gameState.solvedCategories.length > 0) {
    html += `<div class="solved-categories">`;
    const colorMap = ["yellow", "green", "blue", "purple"];
    gameState.solvedCategories.forEach((category) => {
      const colorClass = colorMap[category.difficulty] || "yellow";
      html += `
        <div class="category ${colorClass}">
          <div class="category-title">${escapeHtml(category.group)}</div>
          <div class="category-words">${category.members.map(escapeHtml).join(", ")}</div>
        </div>
      `;
    });
    html += `</div>`;
  }

  // Message area
  html += `<div id="message"></div>`;

  // Word grid - show remaining words
  const remainingWords = getRemainingWords();

  // In local mode, keep words in category order for easier development
  // In Discord mode, shuffle for normal gameplay
  let displayWords;
  if (isLocalMode) {
    displayWords = remainingWords; // Keep in category order (each row = one category)
    html += `<div class="dev-hint">
      💡 Dev Mode: Words are in category order | Each row = one category | Color bars show grouping
    </div>`;
  } else {
    displayWords = [...remainingWords].sort(() => Math.random() - 0.5); // Shuffle for normal play
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

  // Controls
  html += `
    <div class="game-controls">
      <button id="shuffle" class="secondary">Shuffle</button>
      <button id="deselect" class="secondary">Deselect All</button>
      <button id="submit" disabled>Submit</button>
    </div>
  `;

  return html;
}

function renderGameOver() {
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

function getRemainingWords() {
  const solvedWords = new Set(gameState.solvedCategories.flatMap((cat) => cat.members));

  console.log("gameData:", gameData);
  console.log("gameData.categories:", gameData?.categories);

  if (!gameData || !gameData.categories) {
    console.error("No game data or categories available!");
    return [];
  }

  // Get remaining words while preserving category order
  // This will naturally group words by category (4 words per category)
  const remaining = [];
  gameData.categories.forEach((category) => {
    category.members.forEach((word) => {
      if (!solvedWords.has(word)) {
        remaining.push(word);
      }
    });
  });

  console.log(
    "All categories:",
    gameData.categories.map((c) => c.group)
  );
  console.log("Remaining words (in category order):", remaining);

  return remaining;
}

function attachEventListeners() {
  // Word buttons
  document.querySelectorAll(".word-button").forEach((button) => {
    button.addEventListener("click", () => {
      const word = button.dataset.word;

      if (gameState.selectedWords.includes(word)) {
        gameState.selectedWords = gameState.selectedWords.filter((w) => w !== word);
        button.classList.remove("selected");
      } else if (gameState.selectedWords.length < 4) {
        gameState.selectedWords.push(word);
        button.classList.add("selected");
      }

      updateSubmitButton();
    });
  });

  // Shuffle button
  document.getElementById("shuffle")?.addEventListener("click", () => {
    gameState.selectedWords = [];
    const guildId = discordSdk.guildId || "default";

    fetch(`/api/gamestate/${guildId}/${currentDate}`)
      .then((res) => res.json())
      .then((serverGameState) => renderGame(serverGameState));
  });

  // Deselect button
  document.getElementById("deselect")?.addEventListener("click", () => {
    gameState.selectedWords = [];
    document.querySelectorAll(".word-button").forEach((btn) => {
      btn.classList.remove("selected");
    });
    updateSubmitButton();
  });

  // Submit button
  document.getElementById("submit")?.addEventListener("click", handleSubmit);
}

function updateSubmitButton() {
  const submitBtn = document.getElementById("submit");
  if (submitBtn) {
    submitBtn.disabled = gameState.selectedWords.length !== 4;
  }
}

async function handleSubmit() {
  if (gameState.selectedWords.length !== 4) return;

  const selected = new Set(gameState.selectedWords);

  // Check if selection matches any category
  const matchedCategory = gameData.categories.find((category) => {
    if (gameState.solvedCategories.some((solved) => solved.group === category.group)) {
      return false;
    }
    return category.members.every((member) => selected.has(member));
  });

  const messageDiv = document.getElementById("message");

  if (matchedCategory) {
    // Correct guess!
    gameState.solvedCategories.push(matchedCategory);
    gameState.selectedWords = [];

    showMessage("Correct! 🎉", "success");

    // Check if game is complete
    if (gameState.solvedCategories.length === 4) {
      gameState.isGameOver = true;
      await saveGameResult();
    }

    // Refresh the board
    setTimeout(() => {
      const guildId = discordSdk.guildId || "default";

      fetch(`/api/gamestate/${guildId}/${currentDate}`)
        .then((res) => res.json())
        .then((serverGameState) => renderGame(serverGameState));
    }, 1000);
  } else {
    // Wrong guess
    gameState.mistakes++;
    gameState.selectedWords = [];

    // Check for "one away"
    let isOneAway = false;
    for (const category of gameData.categories) {
      if (gameState.solvedCategories.some((solved) => solved.group === category.group)) {
        continue;
      }
      const matches = category.members.filter((member) => selected.has(member)).length;
      if (matches === 3) {
        isOneAway = true;
        break;
      }
    }

    if (isOneAway) {
      showMessage("One away...", "info");
    } else {
      showMessage("Not quite. Try again!", "error");
    }

    if (gameState.mistakes >= gameState.maxMistakes) {
      gameState.isGameOver = true;
      await saveGameResult();
    }

    // Refresh the board
    setTimeout(() => {
      const guildId = discordSdk.guildId || "default";

      fetch(`/api/gamestate/${guildId}/${currentDate}`)
        .then((res) => res.json())
        .then((serverGameState) => renderGame(serverGameState));
    }, 1500);
  }
}

function showMessage(text, type) {
  const messageDiv = document.getElementById("message");
  if (messageDiv) {
    messageDiv.innerHTML = `<div class="message ${type}">${escapeHtml(text)}</div>`;
    setTimeout(() => {
      messageDiv.innerHTML = "";
    }, 2000);
  }
}

async function saveGameResult() {
  const guildId = discordSdk.guildId || "default";

  try {
    const response = await fetch(`/api/gamestate/${guildId}/${currentDate}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: currentUser.id,
        username: currentUser.username,
        score: gameState.solvedCategories.length,
        mistakes: gameState.mistakes
      })
    });

    const result = await response.json();
    gameState.hasPlayed = true;

    // Refresh to show updated leaderboard
    const stateResponse = await fetch(`/api/gamestate/${guildId}/${currentDate}`);
    const serverGameState = await stateResponse.json();
    renderGame(serverGameState);
  } catch (error) {
    console.error("Error saving game result:", error);
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
