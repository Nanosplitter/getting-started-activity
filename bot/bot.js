import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  Routes
} from "discord.js";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { generateGameImage } from "./image-generator.js";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: join(__dirname, "../.env") });

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [] // Ensure we get full objects
});

// MySQL connection pool
let pool;

// Track which games we've already posted about
const postedGames = new Set(); // Format: "guildId:userId:date"

// Track active game sessions
// Format: { sessionId: { channelId, messageId, lastGuessCount } }
const activeSessions = new Map();

/**
 * Initialize MySQL connection
 */
async function initializeDatabase() {
  try {
    if (!process.env.MYSQL_CONNECTION_STRING) {
      console.log("⚠️  No MySQL connection string found - bot will not function properly");
      return;
    }

    pool = mysql.createPool(process.env.MYSQL_CONNECTION_STRING);
    const connection = await pool.getConnection();
    console.log("✓ MySQL connected successfully!");
    connection.release();
  } catch (error) {
    console.error("✗ Database initialization error:", error.message);
  }
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

/**
 * Format guess history into emoji grid (like Wordle)
 * @param {Array} guessHistory - Array of guess objects
 * @param {Object} gameData - Game data with categories (optional, for incorrect guesses)
 */
function formatGuessGrid(guessHistory, gameData = null) {
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

/**
 * Check for new completed games and post them
 */
async function checkForCompletedGames() {
  if (!pool) return;

  try {
    const today = getTodayDate();

    // Get all games completed today
    const [rows] = await pool.query(
      `SELECT guild_id, user_id, username, avatar, score, mistakes, guess_history, completed_at
       FROM game_results
       WHERE game_date = ?
       ORDER BY completed_at DESC`,
      [today]
    );

    for (const row of rows) {
      const gameKey = `${row.guild_id}:${row.user_id}:${today}`;

      // Skip if we've already posted this game
      if (postedGames.has(gameKey)) continue;

      // Try to find a channel to post in (you may want to store channel IDs per guild)
      const guild = client.guilds.cache.get(row.guild_id);
      if (!guild) continue;

      // Find a suitable channel (look for a channel named "connections" or the first text channel)
      let channel = guild.channels.cache.find((ch) => ch.name === "connections" && ch.isTextBased());
      if (!channel) {
        channel = guild.channels.cache.find((ch) => ch.isTextBased());
      }
      if (!channel) continue;

      // Parse guess history
      const guessHistory = typeof row.guess_history === "string" ? JSON.parse(row.guess_history) : row.guess_history;

      // Create embed for the result
      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${row.username} completed Connections!`,
          iconURL: row.avatar ? `https://cdn.discordapp.com/avatars/${row.user_id}/${row.avatar}.png` : undefined
        })
        .setDescription(formatGuessGrid(guessHistory))
        .addFields(
          { name: "Score", value: `${row.score}/4 categories`, inline: true },
          { name: "Mistakes", value: `${row.mistakes}/4`, inline: true }
        )
        .setColor(row.score === 4 ? 0x57f287 : row.mistakes >= 4 ? 0xed4245 : 0x5865f2)
        .setTimestamp(new Date(row.completed_at));

      // Add button to play
      const row_buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Play now!")
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/activities/${process.env.VITE_DISCORD_CLIENT_ID}`)
      );

      await channel.send({
        embeds: [embed],
        components: [row_buttons]
      });

      // Mark as posted
      postedGames.add(gameKey);
    }
  } catch (error) {
    console.error("Error checking for completed games:", error);
  }
}

/**
 * Post daily prompt to play Connections
 */
async function postDailyPrompt(guildId, channelId) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) return;

    const today = getTodayDate();

    // Get today's completed players
    let completedCount = 0;
    if (pool) {
      const [rows] = await pool.query(
        `SELECT COUNT(*) as count FROM game_results WHERE guild_id = ? AND game_date = ?`,
        [guildId, today]
      );
      completedCount = rows[0]?.count || 0;
    }

    const embed = new EmbedBuilder()
      .setTitle("🎮 Time to play Connections!")
      .setDescription(
        `Today's puzzle is ready. Can you find all 4 groups?\n\n${completedCount} player${
          completedCount !== 1 ? "s" : ""
        } completed today's puzzle.`
      )
      .setColor(0x5865f2)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Play now!")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/activities/${process.env.VITE_DISCORD_CLIENT_ID}`)
    );

    await channel.send({
      embeds: [embed],
      components: [row]
    });

    console.log(`✓ Posted daily prompt to guild ${guildId}, channel ${channelId}`);
  } catch (error) {
    console.error("Error posting daily prompt:", error);
  }
}

// Bot ready event
client.on("ready", async () => {
  console.log(`✓ Logged in as ${client.user.tag}!`);
  console.log(`🏰 Bot is in ${client.guilds.cache.size} guild(s):`);
  client.guilds.cache.forEach((guild) => {
    console.log(`   - ${guild.name} (${guild.id})`);
  });

  await initializeDatabase();

  // Start polling for completed games every 30 seconds
  setInterval(checkForCompletedGames, 30000);
  console.log("✓ Started polling for completed games");

  // Start polling for session updates every 5 seconds
  setInterval(checkSessionUpdates, 5000);
  console.log("✓ Started polling for session updates");
});

/**
 * Get today's puzzle number (days since first puzzle)
 */
function getPuzzleNumber() {
  const firstPuzzleDate = new Date("2023-06-12"); // First Connections puzzle
  const today = new Date();
  const diffTime = Math.abs(today - firstPuzzleDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Start a game session and post initial message
 */
async function startGameSession(interaction) {
  try {
    const guildId = interaction.guildId || "dm";
    const channelId = interaction.channelId;
    const puzzleNumber = getPuzzleNumber();

    console.log(`🎬 Starting new multi-user session for guild: ${guildId}`);

    // Defer the reply immediately to avoid timeout (we have 15 minutes after deferring)
    await interaction.deferReply();

    // Generate initial image (empty state - no players yet)
    const imageBuffer = await generateGameImage({
      players: [], // Empty players array
      puzzleNumber: puzzleNumber
    });

    const attachment = new AttachmentBuilder(imageBuffer, { name: "connections.png" });

    // We'll set the session ID after we get the message ID
    // For now, use a temporary ID in the button
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`launch_activity_temp`).setLabel("Play now!").setStyle(ButtonStyle.Primary)
    );

    // Edit the deferred reply with the game message
    await interaction.editReply({
      content: `Click **Play** to join today's Connections #${puzzleNumber}`,
      files: [attachment],
      components: [row]
    });

    // Get the message object from the response
    const reply = await interaction.fetchReply();
    const actualChannelId = reply.channel?.id || reply.channelId || channelId;

    // Now use the message ID as the session ID
    const sessionId = reply.id;

    console.log(`📍 Created session ${sessionId} in channel ${actualChannelId}`);

    // Update the button with the real session ID
    const updatedRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`launch_activity_${sessionId}`)
        .setLabel("Play now!")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({
      content: `Click **Play** to join today's Connections #${puzzleNumber}`,
      files: [attachment],
      components: [updatedRow]
    });

    // Track the session with new multi-player structure
    activeSessions.set(sessionId, {
      sessionId,
      channelId: actualChannelId,
      messageId: reply.id,
      guildId: guildId,
      puzzleNumber,
      players: [], // Array of player objects: { userId, username, avatarUrl, guessHistory, lastGuessCount }
      interaction: interaction // Store for editing
    });

    // Notify server about the session (if server is available)
    try {
      const response = await fetch(`http://localhost:3001/api/sessions/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          guildId: guildId,
          channelId: actualChannelId,
          messageId: reply.id
        })
      });

      if (!response.ok) {
        console.warn(`Server returned ${response.status} for session start`);
      }
    } catch (error) {
      console.error("Failed to notify server about session:", error.message);
    }

    console.log(`✓ Started multi-user game session ${sessionId}`);
  } catch (error) {
    console.error("Error starting game session:", error);
    // Try to reply or edit if we haven't already replied
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "Failed to start game session. Please try again.",
          flags: 64 // EPHEMERAL flag
        });
      } else if (interaction.deferred) {
        await interaction.editReply({
          content: "Failed to start game session. Please try again."
        });
      }
    } catch (replyError) {
      console.error("Failed to send error message:", replyError.message);
    }
  }
}

/**
 * Check for session updates and update messages
 */
async function checkSessionUpdates() {
  if (activeSessions.size === 0) {
    return; // No sessions to check
  }

  console.log(`🔍 Polling ${activeSessions.size} active session(s)...`);

  for (const [sessionId, session] of activeSessions.entries()) {
    try {
      // Fetch session data from server
      const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}`);
      if (!response.ok) {
        // Session not found on server, only log if not 404
        if (response.status !== 404) {
          console.warn(`Session ${sessionId} returned ${response.status}`);
        }
        continue; // Don't delete yet, might just be starting up
      }

      // Parse JSON safely
      let serverSession;
      try {
        const text = await response.text();
        serverSession = JSON.parse(text);
      } catch (parseError) {
        console.error(`Failed to parse session response for ${sessionId}:`, parseError.message);
        continue;
      }

      // Server now returns players object: { userId: { username, avatarUrl, guessHistory } }
      const serverPlayers = serverSession.players || {};

      console.log(`📊 Session ${sessionId}: ${Object.keys(serverPlayers).length} player(s)`);

      // Check if any player has new guesses
      let hasUpdates = false;

      for (const userId in serverPlayers) {
        const serverPlayer = serverPlayers[userId];
        const localPlayer = session.players.find((p) => p.userId === userId);

        if (localPlayer) {
          const serverGuessCount = serverPlayer.guessHistory?.length || 0;
          const localGuessCount = localPlayer.lastGuessCount || 0;

          if (serverGuessCount > localGuessCount) {
            console.log(
              `🎮 Player ${serverPlayer.username} has new guesses: ${localGuessCount} -> ${serverGuessCount}`
            );
            localPlayer.guessHistory = serverPlayer.guessHistory;
            localPlayer.lastGuessCount = serverGuessCount;
            hasUpdates = true;
          }
        }
      }

      // Update Discord message if there are changes
      if (hasUpdates) {
        console.log(`📤 Updating Discord message with new progress...`);

        try {
          const imageBuffer = await generateGameImage({
            players: session.players,
            puzzleNumber: session.puzzleNumber
          });

          const attachment = new AttachmentBuilder(imageBuffer, { name: "connections.png" });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`launch_activity_${sessionId}`)
              .setLabel("Play now!")
              .setStyle(ButtonStyle.Primary)
          );

          // Generate message text based on number of players
          let messageText;
          if (session.players.length === 1) {
            messageText = `**${session.players[0].username}** is playing Connections #${session.puzzleNumber}`;
          } else if (session.players.length === 2) {
            messageText = `**${session.players[0].username}** and **${session.players[1].username}** are playing Connections #${session.puzzleNumber}`;
          } else {
            const names = session.players
              .slice(0, -1)
              .map((p) => `**${p.username}**`)
              .join(", ");
            messageText = `${names}, and **${
              session.players[session.players.length - 1].username
            }** are playing Connections #${session.puzzleNumber}`;
          }

          if (session.interaction) {
            await session.interaction.editReply({
              content: messageText,
              files: [attachment],
              components: [row]
            });
            console.log(`✅ Message updated via interaction!`);
          } else {
            console.warn(`⚠️ No interaction stored, cannot update message`);
          }

          // Check if all players are complete (4 correct or 4 mistakes)
          const allComplete = session.players.every((player) => {
            const guesses = player.guessHistory || [];
            const correctCount = guesses.filter((g) => g.correct).length;
            const mistakeCount = guesses.filter((g) => !g.correct).length;
            return correctCount === 4 || mistakeCount >= 4;
          });

          if (allComplete && session.players.length > 0) {
            activeSessions.delete(sessionId);
            console.log(`✓ Game session ${sessionId} completed - all players done`);
          }
        } catch (editError) {
          console.error(`❌ Failed to edit message:`, editError.message);
        }
      }
    } catch (error) {
      console.error(`Error checking session ${sessionId}:`, error.message);
      // Remove problematic session
      activeSessions.delete(sessionId);
    }
  }
}

// Handle slash commands and button clicks
client.on("interactionCreate", async (interaction) => {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "connections") {
      await startGameSession(interaction);
    }
    return;
  }

  // Handle button clicks
  if (interaction.isButton()) {
    if (interaction.customId.startsWith("launch_activity_")) {
      try {
        // Extract session ID from the button's custom ID
        const sessionId = interaction.customId.replace("launch_activity_", "");

        // Find the session
        const session = activeSessions.get(sessionId);

        if (session) {
          const userId = interaction.user.id;
          const username = interaction.user.username;
          const avatarUrl = interaction.user.displayAvatarURL({ format: "png" });

          // Check if user is already in the session
          const existingPlayer = session.players.find((p) => p.userId === userId);

          if (!existingPlayer) {
            // Add new player to the session
            session.players.push({
              userId,
              username,
              avatarUrl,
              guessHistory: [],
              lastGuessCount: 0
            });

            console.log(`➕ Added ${username} to session ${sessionId}. Total players: ${session.players.length}`);

            // Notify server about the player joining
            try {
              const gameDate = getTodayDate();
              const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId,
                  username,
                  avatarUrl,
                  guildId: session.guildId,
                  date: gameDate
                })
              });

              if (response.ok) {
                const data = await response.json();
                console.log(`✅ Server notified of player join: ${data.userSessionId} -> ${data.messageSessionId}`);
              } else {
                console.warn(`⚠️ Failed to notify server of player join: ${response.status}`);
              }
            } catch (error) {
              console.error("Failed to notify server about player join:", error.message);
            }

            // Update the Discord message to show the new player
            try {
              const imageBuffer = await generateGameImage({
                players: session.players,
                puzzleNumber: session.puzzleNumber
              });

              const attachment = new AttachmentBuilder(imageBuffer, { name: "connections.png" });

              const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId(`launch_activity_${sessionId}`)
                  .setLabel("Play now!")
                  .setStyle(ButtonStyle.Primary)
              );

              // Generate message text based on number of players
              let messageText;
              if (session.players.length === 1) {
                messageText = `**${session.players[0].username}** is playing Connections #${session.puzzleNumber}`;
              } else if (session.players.length === 2) {
                messageText = `**${session.players[0].username}** and **${session.players[1].username}** are playing Connections #${session.puzzleNumber}`;
              } else {
                const names = session.players
                  .slice(0, -1)
                  .map((p) => `**${p.username}**`)
                  .join(", ");
                messageText = `${names}, and **${
                  session.players[session.players.length - 1].username
                }** are playing Connections #${session.puzzleNumber}`;
              }

              if (session.interaction) {
                await session.interaction.editReply({
                  content: messageText,
                  files: [attachment],
                  components: [row]
                });
                console.log(`✅ Message updated with new player!`);
              }
            } catch (updateError) {
              console.error("Failed to update message:", updateError.message);
            }
          } else {
            console.log(`♻️ ${username} rejoining session ${sessionId}`);
          }
        }

        // Use Discord's LAUNCH_ACTIVITY response type (type 12)
        // This launches the activity silently without announcements
        await client.rest.post(`/interactions/${interaction.id}/${interaction.token}/callback`, {
          body: {
            type: 12, // LAUNCH_ACTIVITY
            data: {
              activity_instance_id: process.env.VITE_DISCORD_CLIENT_ID
            }
          }
        });

        console.log(`🚀 Activity launched silently for ${interaction.user.username}`);
      } catch (error) {
        console.error("Error launching activity:", error);
        // Fallback: acknowledge the interaction
        await interaction.deferUpdate();
      }
    }
  }
});

// Handle simple message commands for testing
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!connections") {
    await postDailyPrompt(message.guildId, message.channelId);
  }
});

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN);
