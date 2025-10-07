# Connections Discord Bot

A Discord bot that prompts users to play the daily Connections game and posts live results as players complete the game.

## Features

- 🎮 Post daily prompts to play Connections
- 📊 Automatically post player results as they complete games
- 🔘 Includes "Play now!" buttons that launch the Discord Activity
- 🎨 Displays results with colored emoji grids (like Wordle)

## Setup

### 1. Create a Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" tab and click "Add Bot"
4. Under "Privileged Gateway Intents", enable:
   - Message Content Intent
5. Copy the bot token and add it to your `.env` file:
   ```
   DISCORD_BOT_TOKEN=your_bot_token_here
   ```

### 2. Invite the Bot to Your Server

1. In the Developer Portal, go to "OAuth2" > "URL Generator"
2. Select scopes:
   - `bot`
   - `applications.commands`
3. Select bot permissions:
   - Send Messages
   - Embed Links
   - Read Message History
4. Copy the generated URL and open it in your browser to invite the bot

### 3. Install Dependencies

```bash
cd bot
npm install
```

### 4. Register Slash Commands

```bash
node register-commands.js
```

### 5. Run the Bot

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

## Usage

### Commands

- `/connections` - Post a prompt to play today's Connections game
- `!connections` - Same as above (message command for testing)

### Automatic Posting

The bot automatically checks for completed games every 30 seconds and posts results to:
1. A channel named "connections" (if it exists)
2. Or the first available text channel

### Result Format

When a player completes the game, the bot posts:
- Player's username and avatar
- Colored emoji grid showing their guesses
- Score (categories solved)
- Mistakes made
- "Play now!" button to launch the Activity

## Configuration

You can customize the bot by modifying `bot.js`:

- **Polling interval**: Change `30000` (30 seconds) in `setInterval(checkForCompletedGames, 30000)`
- **Channel selection**: Modify the channel finding logic in `checkForCompletedGames()`
- **Embed colors**: Adjust the colors in the `EmbedBuilder` calls

## Notes

- The bot requires the MySQL database to be configured (same as the server)
- Results are only posted once per player per day
- The bot tracks posted games in memory, so restarting will re-post recent games
