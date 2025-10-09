import { createCanvas, loadImage } from "@napi-rs/canvas";

/**
 * Generate a Connections game grid image for multiple players
 * @param {Object} options - Image generation options
 * @param {Array} options.players - Array of player objects: { username, avatarUrl, guessHistory }
 * @param {number} options.puzzleNumber - Puzzle number
 * @returns {Buffer} PNG image buffer
 */
export async function generateGameImage({ players = [], puzzleNumber = null }) {
  // If no players, show empty state
  if (players.length === 0) {
    return generateEmptyImage(puzzleNumber);
  }

  // Settings per player
  const playerWidth = 280;
  const playerSpacing = 40;
  const headerHeight = 80;
  const gridHeight = 320;

  // Canvas dimensions based on number of players
  const width = Math.max(600, players.length * playerWidth + (players.length - 1) * playerSpacing + 40);
  const height = headerHeight + gridHeight;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(0, 0, width, height);

  // Draw each player's section
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const x = 20 + i * (playerWidth + playerSpacing);

    await drawPlayerSection(ctx, player, x, headerHeight, playerWidth);
  }

  return canvas.toBuffer("image/png");
}

/**
 * Generate empty image when no players have joined
 */
function generateEmptyImage(puzzleNumber) {
  const width = 500;
  const height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(0, 0, width, height);

  // Header
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px Arial";
  const title = puzzleNumber ? `Connections #${puzzleNumber}` : "Connections";
  ctx.fillText(title, 20, 40);

  // Message
  ctx.font = "18px Arial";
  ctx.fillStyle = "#999999";
  ctx.fillText("Waiting for players...", 20, 100);
  ctx.font = "14px Arial";
  ctx.fillText("Click 'Play' to join!", 20, 130);

  return canvas.toBuffer("image/png");
}

/**
 * Draw a single player's section (avatar, name, grid, stats)
 */
async function drawPlayerSection(ctx, player, x, y, width) {
  const { username, avatarUrl, guessHistory = [] } = player;

  // Draw avatar
  if (avatarUrl) {
    try {
      console.log(`🖼️ Loading avatar for ${username}`);
      const avatar = await loadImage(avatarUrl);
      const avatarSize = 60;
      const avatarX = x + (width - avatarSize) / 2; // Center avatar
      const avatarY = y - 70;

      // Create circular clipping path
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Draw the avatar
      ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
      console.log(`✅ Avatar loaded for ${username}`);
    } catch (error) {
      console.error(`❌ Failed to load avatar for ${username}:`, error.message);
    }
  }

  // Draw username centered below avatar
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText(username, x + width / 2, y - 10);
  ctx.textAlign = "left"; // Reset alignment

  // Grid settings
  const cellSize = 42;
  const cellSpacing = 5;
  const gridWidth = 4 * cellSize + 3 * cellSpacing;
  const gridX = x + (width - gridWidth) / 2; // Center grid
  let gridY = y + 10;

  // Color mapping for difficulties
  const colors = {
    0: "#f9df6d", // Yellow
    1: "#a0c35a", // Green
    2: "#b0c4ef", // Blue
    3: "#ba81c5" // Purple
  };

  const incorrectColor = "#5a5a5a"; // Gray

  // Draw guess grid
  guessHistory.forEach((guess, rowIndex) => {
    const rowY = gridY + rowIndex * (cellSize + cellSpacing);

    if (guess.correct && guess.difficulty !== null) {
      // Correct guess - show 4 squares of the same color
      const color = colors[guess.difficulty] || incorrectColor;
      for (let col = 0; col < 4; col++) {
        const cellX = gridX + col * (cellSize + cellSpacing);
        ctx.fillStyle = color;
        ctx.fillRect(cellX, rowY, cellSize, cellSize);
      }
    } else {
      // Incorrect guess - show gray squares
      for (let col = 0; col < 4; col++) {
        const cellX = gridX + col * (cellSize + cellSpacing);
        ctx.fillStyle = incorrectColor;
        ctx.fillRect(cellX, rowY, cellSize, cellSize);
      }
    }
  });

  // Stats removed - just show the grid
}

/**
 * Format guess history into emoji grid (like Wordle) for text display
 * @param {Array} guessHistory - Array of guess objects
 * @param {Object} gameData - Game data with categories (optional, for incorrect guesses)
 */
export function formatGuessGrid(guessHistory, gameData = null) {
  const colorEmojis = {
    0: "🟨", // Yellow (easiest)
    1: "🟩", // Green
    2: "🟦", // Blue
    3: "🟪" // Purple (hardest)
  };

  if (!guessHistory || guessHistory.length === 0) {
    return "No data";
  }

  return guessHistory
    .map((guess) => {
      if (guess.correct && guess.difficulty !== null) {
        // Correct guess - show 4 squares of the same color
        const emoji = colorEmojis[guess.difficulty] || "⬜";
        return emoji.repeat(4);
      } else {
        // Incorrect guess - try to get word difficulties from game data
        if (gameData && guess.words) {
          const emojis = guess.words.map((word) => {
            // Find which category this word belongs to
            const category = gameData.categories?.find((cat) => cat.members.includes(word));
            if (category) {
              return colorEmojis[category.difficulty] || "⬜";
            }
            return "⬜";
          });
          return emojis.join("");
        }
        // Fallback if no game data
        return "⬜⬜⬜⬜";
      }
    })
    .join("\n");
}
