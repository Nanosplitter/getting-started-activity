import { createCanvas } from "@napi-rs/canvas";

/**
 * Generate a Connections game grid image
 * @param {Object} options - Image generation options
 * @param {Array} options.guessHistory - Array of guess objects
 * @param {Object} options.gameData - Game data with categories (for incorrect guesses)
 * @param {string} options.username - Player's username
 * @param {string} options.avatarUrl - Player's avatar URL
 * @param {number} options.puzzleNumber - Puzzle number
 * @returns {Buffer} PNG image buffer
 */
export function generateGameImage({ guessHistory = [], gameData = null, username = "Player", avatarUrl = null, puzzleNumber = null }) {
  // Canvas dimensions
  const width = 500;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(0, 0, width, height);

  // Header
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px Arial";
  ctx.fillText(puzzleNumber ? `Connections #${puzzleNumber}` : "Connections", 20, 40);

  // Player info
  ctx.font = "16px Arial";
  ctx.fillText(username, 20, 70);

  // Grid settings
  const gridStartY = 100;
  const cellSize = 40;
  const cellSpacing = 5;
  const gridX = (width - (4 * cellSize + 3 * cellSpacing)) / 2;

  // Color mapping for difficulties
  const colors = {
    0: "#f9df6d", // Yellow (easiest)
    1: "#a0c35a", // Green
    2: "#b0c4ef", // Blue
    3: "#ba81c5" // Purple (hardest)
  };

  const incorrectColor = "#5a5a5a"; // Gray for incorrect

  // Draw guess grid
  guessHistory.forEach((guess, rowIndex) => {
    const y = gridStartY + rowIndex * (cellSize + cellSpacing);

    if (guess.correct && guess.difficulty !== null) {
      // Correct guess - show 4 squares of the same color
      const color = colors[guess.difficulty] || incorrectColor;
      for (let col = 0; col < 4; col++) {
        const x = gridX + col * (cellSize + cellSpacing);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    } else {
      // Incorrect guess - try to get word difficulties from game data
      if (gameData && guess.words) {
        guess.words.forEach((word, col) => {
          const x = gridX + col * (cellSize + cellSpacing);
          // Find which category this word belongs to
          const category = gameData.categories?.find((cat) => cat.members.includes(word));
          const color = category ? colors[category.difficulty] : incorrectColor;
          ctx.fillStyle = color;
          ctx.fillRect(x, y, cellSize, cellSize);
        });
      } else {
        // Fallback - show gray squares
        for (let col = 0; col < 4; col++) {
          const x = gridX + col * (cellSize + cellSpacing);
          ctx.fillStyle = incorrectColor;
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      }
    }
  });

  // Stats at the bottom
  const correctGuesses = guessHistory.filter((g) => g.correct).length;
  const totalGuesses = guessHistory.length;
  const mistakes = guessHistory.filter((g) => !g.correct).length;

  ctx.fillStyle = "#ffffff";
  ctx.font = "16px Arial";
  const statsY = gridStartY + Math.min(guessHistory.length, 8) * (cellSize + cellSpacing) + 30;
  ctx.fillText(`Score: ${correctGuesses}/4`, 20, statsY);
  ctx.fillText(`Mistakes: ${mistakes}/4`, 200, statsY);

  return canvas.toBuffer("image/png");
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
