import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: join(__dirname, "../.env") });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// MySQL connection pool
let pool;

// Track which games we've already posted about
const postedGames = new Set(); // Format: "guildId:userId:date"

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
        new ButtonBuilder().setLabel("Play now!").setStyle(ButtonStyle.Link).setURL(`https://discord.com/activities/${process.env.VITE_DISCORD_CLIENT_ID}`)
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
      const [rows] = await pool.query(`SELECT COUNT(*) as count FROM game_results WHERE guild_id = ? AND game_date = ?`, [guildId, today]);
      completedCount = rows[0]?.count || 0;
    }

    const embed = new EmbedBuilder()
      .setTitle("🎮 Time to play Connections!")
      .setDescription(`Today's puzzle is ready. Can you find all 4 groups?\n\n${completedCount} player${completedCount !== 1 ? "s" : ""} completed today's puzzle.`)
      .setColor(0x5865f2)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Play now!").setStyle(ButtonStyle.Link).setURL(`https://discord.com/activities/${process.env.VITE_DISCORD_CLIENT_ID}`)
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
  await initializeDatabase();

  // Start polling for completed games every 30 seconds
  setInterval(checkForCompletedGames, 30000);
  console.log("✓ Started polling for completed games");
});

// Handle slash commands (if you want to add /connections command)
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "connections") {
    await postDailyPrompt(interaction.guildId, interaction.channelId);
    await interaction.reply({ content: "Posted Connections prompt!", ephemeral: true });
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
