import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: "../.env" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

app.use((req, res, next) => {
  // CORS - Allow Discord origins
  const allowedOrigins = [
    "https://discord.com",
    "https://canary.discord.com",
    "https://ptb.discord.com",
    "https://connections-3wdu.onrender.com",
    "null"
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // CSP headers
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' https:; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.discordapp.com https://static.cloudflareinsights.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https: wss: https://discord.com https://*.discord.com; " +
      "frame-ancestors https://discord.com https://*.discord.com;"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// Allow express to parse JSON bodies
app.use(express.json());

// MySQL connection pool
let pool;

// Initialize MySQL connection
async function initializeDatabase() {
  try {
    // Check if MySQL connection string is provided
    if (!process.env.MYSQL_CONNECTION_STRING) {
      console.log("No MySQL connection string found - using in-memory storage");
      console.log("To enable database storage, add MYSQL_CONNECTION_STRING to your .env file");
      return;
    }

    // Create connection pool
    pool = mysql.createPool(process.env.MYSQL_CONNECTION_STRING);

    // Test the connection
    const connection = await pool.getConnection();
    console.log("✓ MySQL connected successfully!");

    // Create tables if they don't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS game_results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        avatar VARCHAR(255) DEFAULT NULL,
        game_date DATE NOT NULL,
        score INT NOT NULL,
        mistakes INT NOT NULL,
        guess_history JSON DEFAULT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_guild_date (guild_id, game_date),
        UNIQUE KEY unique_player_game (guild_id, user_id, game_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("✓ Database tables initialized!");
    connection.release();
  } catch (error) {
    console.error("✗ Database initialization error:", error.message);
    console.log("→ Continuing without database - using in-memory storage");
    pool = null; // Ensure pool is null so we use fallback
  }
}

// Initialize database on startup
initializeDatabase();

// Store game state per guild (fallback if DB is not available)
// Format: { guildId: { date: string, players: { userId: { username: string, score: number, mistakes: number, completedAt: timestamp } } } }
const gameState = {};

// Track active game sessions for live updates (message-based sessions)
// Format: { messageId: { guildId, channelId, messageId, players: { userId: { username, avatarUrl, guessHistory } }, lastUpdate } }
const activeSessions = {};

// Map user session IDs to message session IDs
// Format: { "guildId_userId_date": "messageId" }
const userToMessageSession = {};

app.post("/api/token", async (req, res) => {
  // Exchange the code for an access_token
  const response = await fetch(`https://discord.com/api/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: process.env.VITE_DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code: req.body.code
    })
  });

  // Retrieve the access_token from the response
  const { access_token } = await response.json();

  // Return the access_token to our client as { access_token: "..."}
  res.send({ access_token });
});

// Fetch NYT Connections game data for a given date
app.get("/api/connections/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const response = await fetch(`https://www.nytimes.com/svc/connections/v2/${date}.json`);

    if (!response.ok) {
      return res.status(404).json({ error: "Game not found for this date" });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching connections data:", error);
    res.status(500).json({ error: "Failed to fetch game data" });
  }
});

// Get game state for a guild
app.get("/api/gamestate/:guildId/:date", async (req, res) => {
  const { guildId, date } = req.params;

  try {
    if (pool) {
      // Fetch from database
      const [rows] = await pool.query(
        `SELECT user_id, username, avatar, score, mistakes, guess_history, completed_at 
         FROM game_results 
         WHERE guild_id = ? AND game_date = ?`,
        [guildId, date]
      );

      // Transform database results to match expected format
      const players = {};
      rows.forEach((row) => {
        players[row.user_id] = {
          username: row.username,
          avatar: row.avatar,
          score: row.score,
          mistakes: row.mistakes,
          guessHistory: row.guess_history,
          completedAt: new Date(row.completed_at).getTime()
        };
      });

      res.json({ date, players });
    } else {
      // Fallback to in-memory storage
      if (!gameState[guildId] || gameState[guildId].date !== date) {
        gameState[guildId] = { date, players: {} };
      }
      res.json(gameState[guildId]);
    }
  } catch (error) {
    console.error("Error fetching game state:", error);
    // Fallback to in-memory on error
    if (!gameState[guildId] || gameState[guildId].date !== date) {
      gameState[guildId] = { date, players: {} };
    }
    res.json(gameState[guildId]);
  }
});

// Save player's game result
app.post("/api/gamestate/:guildId/:date/complete", async (req, res) => {
  const { guildId, date } = req.params;
  const { userId, username, avatar, score, mistakes, guessHistory } = req.body;

  try {
    if (pool) {
      // Save to database
      await pool.query(
        `INSERT INTO game_results (guild_id, user_id, username, avatar, game_date, score, mistakes, guess_history)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           username = VALUES(username),
           avatar = VALUES(avatar),
           score = VALUES(score),
           mistakes = VALUES(mistakes),
           guess_history = VALUES(guess_history),
           completed_at = CURRENT_TIMESTAMP`,
        [guildId, userId, username, avatar, date, score, mistakes, JSON.stringify(guessHistory)]
      );

      // Fetch updated game state
      const [rows] = await pool.query(
        `SELECT user_id, username, avatar, score, mistakes, guess_history, completed_at 
         FROM game_results 
         WHERE guild_id = ? AND game_date = ?`,
        [guildId, date]
      );

      const players = {};
      rows.forEach((row) => {
        players[row.user_id] = {
          username: row.username,
          avatar: row.avatar,
          score: row.score,
          mistakes: row.mistakes,
          guessHistory: row.guess_history,
          completedAt: new Date(row.completed_at).getTime()
        };
      });

      res.json({ success: true, gameState: { date, players } });
    } else {
      // Fallback to in-memory storage
      if (!gameState[guildId] || gameState[guildId].date !== date) {
        gameState[guildId] = { date, players: {} };
      }

      gameState[guildId].players[userId] = {
        username,
        avatar,
        score,
        mistakes,
        guessHistory,
        completedAt: Date.now()
      };

      res.json({ success: true, gameState: gameState[guildId] });
    }
  } catch (error) {
    console.error("Error saving game result:", error);
    res.status(500).json({ error: "Failed to save game result" });
  }
});

// Start a new game session for live updates (message-based)
app.post("/api/sessions/start", async (req, res) => {
  const { sessionId, guildId, channelId, messageId } = req.body;

  console.log(`📝 Creating message session: ${sessionId}`);

  activeSessions[sessionId] = {
    guildId,
    channelId,
    messageId: sessionId, // sessionId IS the messageId
    players: {}, // Will be populated as users join
    lastUpdate: Date.now()
  };

  console.log(`✅ Message session created. Active sessions:`, Object.keys(activeSessions));

  res.json({ success: true, session: activeSessions[sessionId] });
});

// Register a user joining a message session
app.post("/api/sessions/:messageSessionId/join", async (req, res) => {
  const { messageSessionId } = req.params;
  const { userId, username, avatarUrl, guildId, date } = req.body;

  console.log(`👤 User ${username} (${userId}) joining session ${messageSessionId}`);

  if (!activeSessions[messageSessionId]) {
    console.warn(`❌ Message session not found: ${messageSessionId}`);
    return res.status(404).json({ error: "Session not found" });
  }

  // Create user session ID format that client uses
  const userSessionId = `${guildId}_${userId}_${date}`;

  // Map user session to message session
  userToMessageSession[userSessionId] = messageSessionId;

  // Add player to message session if not already there
  if (!activeSessions[messageSessionId].players[userId]) {
    activeSessions[messageSessionId].players[userId] = {
      username,
      avatarUrl,
      guessHistory: []
    };
  }

  console.log(`✅ User mapped: ${userSessionId} -> ${messageSessionId}`);
  console.log(`   Total players in session: ${Object.keys(activeSessions[messageSessionId].players).length}`);

  res.json({ success: true, userSessionId, messageSessionId });
});

// Update a game session with new guess (user reports progress)
app.post("/api/sessions/:userSessionId/update", async (req, res) => {
  const { userSessionId } = req.params;
  const { guessHistory } = req.body;

  console.log(`🔄 Update request for user session: ${userSessionId}, guesses: ${guessHistory?.length || 0}`);

  // Look up the message session from user session
  const messageSessionId = userToMessageSession[userSessionId];

  if (!messageSessionId) {
    console.warn(`❌ No message session mapped for user session: ${userSessionId}`);
    console.log(`Available user mappings:`, Object.keys(userToMessageSession));
    return res.status(404).json({ error: "User session not found" });
  }

  const messageSession = activeSessions[messageSessionId];

  if (!messageSession) {
    console.warn(`❌ Message session not found: ${messageSessionId}`);
    return res.status(404).json({ error: "Message session not found" });
  }

  // Extract userId from userSessionId (format: guildId_userId_date)
  const parts = userSessionId.split("_");
  const userId = parts[1]; // Get userId from the middle

  // Update the specific player's guess history
  if (messageSession.players[userId]) {
    messageSession.players[userId].guessHistory = guessHistory;
    messageSession.lastUpdate = Date.now();

    console.log(`✅ Player ${userId} updated in message session ${messageSessionId}, guesses: ${guessHistory.length}`);

    res.json({ success: true, messageSessionId, userId });
  } else {
    console.warn(`⚠️ Player ${userId} not found in message session ${messageSessionId}`);
    res.status(404).json({ error: "Player not in session" });
  }
});

// Look up user's active session by channelId and userId
app.get("/api/sessions/lookup/:channelId/:userId", async (req, res) => {
  const { channelId, userId } = req.params;

  console.log(`🔍 Looking up active session for user ${userId} in channel ${channelId}`);

  // Find any active session in this channel that contains this user
  for (const [sessionId, session] of Object.entries(activeSessions)) {
    if (session.channelId === channelId && session.players[userId]) {
      console.log(`✅ Found active session ${sessionId} for user ${userId}`);

      // Return session info and user's progress
      const userProgress = session.players[userId];
      return res.json({
        found: true,
        sessionId,
        messageSessionId: sessionId,
        guessHistory: userProgress.guessHistory || [],
        session
      });
    }
  }

  console.log(`❌ No active session found for user ${userId} in channel ${channelId}`);
  res.json({ found: false });
});

// Get a game session (returns message session with all players)
app.get("/api/sessions/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  if (!activeSessions[sessionId]) {
    return res.status(404).json({ error: "Session not found" });
  }

  // Return message session with players
  res.json(activeSessions[sessionId]);
});

// Check and clear launch request
app.post("/api/sessions/:sessionId/launch", async (req, res) => {
  const { sessionId} = req.params;

  if (!activeSessions[sessionId]) {
    return res.json({ launchRequested: false });
  }

  const launchRequested = activeSessions[sessionId].launchRequested || false;

  // Clear the flag after reading
  if (launchRequested) {
    activeSessions[sessionId].launchRequested = false;
    console.log(`✅ Launch request cleared for session ${sessionId}`);
  }

  res.json({ launchRequested });
});

// End a game session
app.delete("/api/sessions/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  if (activeSessions[sessionId]) {
    delete activeSessions[sessionId];
  }

  res.json({ success: true });
});

// Delete player's game result (for dev/testing purposes)
app.delete("/api/gamestate/:guildId/:date/:userId", async (req, res) => {
  const { guildId, date, userId } = req.params;

  try {
    if (pool) {
      // Delete from database
      await pool.query(
        `DELETE FROM game_results WHERE guild_id = ? AND game_date = ? AND user_id = ?`,
        [guildId, date, userId]
      );

      // Fetch updated game state
      const [rows] = await pool.query(
        `SELECT user_id, username, avatar, score, mistakes, guess_history, completed_at
         FROM game_results
         WHERE guild_id = ? AND game_date = ?`,
        [guildId, date]
      );

      const players = {};
      rows.forEach((row) => {
        players[row.user_id] = {
          username: row.username,
          avatar: row.avatar,
          score: row.score,
          mistakes: row.mistakes,
          guessHistory: row.guess_history,
          completedAt: new Date(row.completed_at).getTime()
        };
      });

      res.json({ success: true, gameState: { date, players } });
    } else {
      // Fallback to in-memory storage
      if (gameState[guildId] && gameState[guildId].players) {
        delete gameState[guildId].players[userId];
      }
      res.json({ success: true, gameState: gameState[guildId] || { date, players: {} } });
    }
  } catch (error) {
    console.error("Error deleting game result:", error);
    res.status(500).json({ error: "Failed to delete game result" });
  }
});

// Serve static files from the client build (for production)
const distPath = path.join(__dirname, "../client/dist");
console.log("📁 Serving static files from:", distPath);
console.log("📂 Directory contents:", distPath);

app.use(express.static(distPath));

// Handle client-side routing - serve index.html for all non-API routes
app.get("*", (req, res) => {
  const indexPath = path.join(distPath, "index.html");
  console.log("📄 Serving index.html from:", indexPath);
  res.sendFile(indexPath);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
