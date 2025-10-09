/**
 * Game state management
 */

import { GAME_CONFIG } from "../config.js";

// Game state object
let gameState = {
  selectedWords: [],
  solvedCategories: [],
  guessHistory: [], // Array of guess attempts with category colors
  mistakes: 0,
  maxMistakes: GAME_CONFIG.maxMistakes,
  isGameOver: false,
  hasPlayed: false,
  sessionId: null // Session ID for live updates
};

// Game data (puzzle data from NYT API)
let gameData = null;
let currentDate = null;

/**
 * Get the current game state
 * @returns {Object} - Current game state
 */
export function getGameState() {
  return gameState;
}

/**
 * Reset the game state
 */
export function resetGameState() {
  gameState = {
    selectedWords: [],
    solvedCategories: [],
    guessHistory: [],
    mistakes: 0,
    maxMistakes: GAME_CONFIG.maxMistakes,
    isGameOver: false,
    hasPlayed: false,
    sessionId: null
  };
}

/**
 * Update game state properties
 * @param {Object} updates - Properties to update
 */
export function updateGameState(updates) {
  Object.assign(gameState, updates);
}

/**
 * Toggle word selection
 * @param {string} word - Word to toggle
 * @returns {boolean} - Whether the word is now selected
 */
export function toggleWordSelection(word) {
  if (gameState.selectedWords.includes(word)) {
    gameState.selectedWords = gameState.selectedWords.filter((w) => w !== word);
    return false;
  } else if (gameState.selectedWords.length < GAME_CONFIG.selectableWords) {
    gameState.selectedWords.push(word);
    return true;
  }
  return false;
}

/**
 * Clear all selected words
 */
export function clearSelection() {
  gameState.selectedWords = [];
}

/**
 * Add a solved category
 * @param {Object} category - Category object to add
 */
export function addSolvedCategory(category) {
  gameState.solvedCategories.push(category);
}

/**
 * Increment mistake counter
 */
export function incrementMistakes() {
  gameState.mistakes++;
  if (gameState.mistakes >= gameState.maxMistakes) {
    gameState.isGameOver = true;
  }
}

/**
 * Mark game as complete
 */
export function completeGame() {
  gameState.isGameOver = true;
}

/**
 * Record a guess in the history
 * @param {string[]} words - Words that were guessed
 * @param {boolean} correct - Whether the guess was correct
 * @param {number|null} difficulty - Difficulty level if correct (0-3), null if incorrect
 * @param {number[]|null} wordDifficulties - Array of difficulties for each word (for incorrect guesses)
 */
export function recordGuess(words, correct, difficulty = null, wordDifficulties = null) {
  gameState.guessHistory.push({
    words: [...words],
    correct,
    difficulty, // 0=yellow, 1=green, 2=blue, 3=purple (for correct guesses)
    wordDifficulties, // Array of difficulties for each word (for incorrect guesses)
    timestamp: Date.now()
  });
}

/**
 * Get the guess history
 * @returns {Array} - Array of guess objects
 */
export function getGuessHistory() {
  return gameState.guessHistory;
}

/**
 * Set the game data
 * @param {Object} data - Game data from API
 */
export function setGameData(data) {
  gameData = data;
}

/**
 * Get the game data
 * @returns {Object} - Game data
 */
export function getGameData() {
  return gameData;
}

/**
 * Set the current game date
 * @param {string} date - Date string (YYYY-MM-DD)
 */
export function setCurrentDate(date) {
  currentDate = date;
}

/**
 * Get the current game date
 * @returns {string} - Current date
 */
export function getCurrentDate() {
  return currentDate;
}

/**
 * Get remaining unsolved words in category order
 * @returns {string[]} - Array of remaining words
 */
export function getRemainingWords() {
  const solvedWords = new Set(gameState.solvedCategories.flatMap((cat) => cat.members));

  if (!gameData || !gameData.categories) {
    console.error("No game data or categories available!");
    return [];
  }

  // Get remaining words while preserving category order
  const remaining = [];
  gameData.categories.forEach((category) => {
    category.members.forEach((word) => {
      if (!solvedWords.has(word)) {
        remaining.push(word);
      }
    });
  });

  return remaining;
}
