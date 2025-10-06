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

// Add security headers for Discord Activities
app.use((req, res, next) => {
  // CORS - Allow Discord origins
  const allowedOrigins = [
    "https://discord.com",
    "https://canary.discord.com",
    "https://ptb.discord.com",
    "null" // For Discord's embedded iframe
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || !origin) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Allow Discord to embed the app - frame-ancestors in CSP replaces X-Frame-Options
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' https:; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.discordapp.com https://static.cloudflareinsights.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https: wss:; " +
      "frame-ancestors https://discord.com https://*.discord.com;"
  );

  // Handle preflight requests
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
