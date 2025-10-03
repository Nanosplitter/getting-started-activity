# Discord Connections Game

A Discord Activity that lets you play the NYT Connections word game with your friends! This app fetches the daily Connections puzzle and allows players in your Discord server to compete and see each other's scores in real-time.

## Features

- 🎮 **Daily Connections Puzzle**: Automatically fetches today's puzzle from the New York Times
- 👥 **Multi-Player Tracking**: See who has completed the puzzle and their scores
- 🏆 **Live Leaderboard**: Completed player scores display at the top while others are still playing
- 💾 **Server-Based Storage**: Game progress is tracked per Discord server (guild)
- 🎯 **Full Game Mechanics**:
  - Select 4 words to find connections
  - 4 mistakes allowed before game over
  - "One away" hints when you're close
  - Color-coded difficulty categories (Yellow, Green, Blue, Purple)
  - Shuffle and deselect buttons for gameplay

## How It Works

### Game Flow

1. When you open the activity, it fetches today's Connections puzzle
2. You select 4 words at a time to guess a category
3. If correct, the category is revealed and those words are removed
4. If incorrect, you lose one of your 4 allowed mistakes
5. Complete all 4 categories or run out of mistakes to finish
6. Your score is saved and displayed to other players in your server

### Data Structure

The NYT Connections API provides puzzle data in this format:

```
https://www.nytimes.com/svc/connections/v2/YYYY-MM-DD.json
```

Each puzzle contains:

- 4 categories with different difficulty levels (0-3)
- Each category has a group name and 4 member words
- The app shuffles words and tracks your progress

### Server State

Game state is stored per Discord server and includes:

- Date of the current game
- Player results (userId, username, score, mistakes, completion time)
- Allows players to see who has finished while they play

## Setup

### Prerequisites

- Node.js installed
- Discord Developer Application configured
- MySQL database (optional, falls back to in-memory storage)
- Environment variables set in `.env`

### Installation

1. Install dependencies:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

2. Configure your `.env` file with Discord credentials:

```
VITE_DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret

# Optional: MySQL Database Connection
# Format: mysql://username:password@host:port/database
MYSQL_CONNECTION_STRING=mysql://root:password@localhost:3306/connections_game
```

3. (Optional) Set up MySQL Database:

The server will automatically create the required table on startup. You can also manually create the database using:

```bash
mysql -u root -p < server/schema.sql
```

Or connect to your MySQL instance and run the SQL from `server/schema.sql`.

**Note:** If no MySQL connection string is provided, the app will use in-memory storage (data will be lost on server restart).

4. Run both servers:

```bash
# Terminal 1 - Start the backend
cd server
npm run dev

# Terminal 2 - Start the frontend
cd client
npm run dev
```

5. **Choose your development mode:**

   **Option A: Local Development (No Discord Required)**

   - Just open http://localhost:5173/local.html in your browser
   - The app will use mock Discord data
   - Perfect for testing game logic without Discord setup
   - Mock user and guild IDs are automatically generated

   **Option B: Discord Activity**

   - Set up Discord Activity in Developer Portal
   - Configure the Activity URL Mapping to point to your local/hosted URLs
   - Use cloudflared or similar for local testing
   - Full Discord integration with real user data

## Local Development Mode

The app now supports running locally without Discord! This is perfect for:

- Testing game mechanics quickly
- Developing new features without Discord setup
- Running automated tests
- Demoing the game without Discord

### How Local Mode Works

When you access the app via `localhost` (not in a Discord iframe), it automatically:

- ✅ Uses a mock Discord SDK
- ✅ Generates fake user data (random username and ID)
- ✅ Simulates a guild/server environment
- ✅ Works with all game features
- ✅ Saves data to the same backend

### Quick Start (Local Mode)

```bash
# Start the server
cd server
npm run dev

# In another terminal, start the client
cd client
npm run dev

# Open your browser to:
# http://localhost:5173/local.html
```

That's it! No Discord configuration needed for local development.

### Switching Between Modes

- **Local Mode**: Access via `http://localhost:5173/local.html` or `http://localhost:5173/`
- **Discord Mode**: Access via Discord Activity URL (requires Discord Developer setup)

The app automatically detects which mode to use based on the environment.

## API Endpoints

### Server Endpoints

- `POST /api/token` - Exchange Discord OAuth code for access token
- `GET /api/connections/:date` - Fetch NYT Connections data for a specific date
- `GET /api/gamestate/:guildId/:date` - Get game state for a guild on a specific date
- `POST /api/gamestate/:guildId/:date/complete` - Save a player's completed game result

## File Structure

```
├── client/
│   ├── index.html          # Main HTML file
│   ├── main.js             # Game logic and UI
│   ├── style.css           # Connections game styling
│   └── package.json
├── server/
│   ├── server.js           # Express server with game state management
│   ├── schema.sql          # MySQL database schema
│   └── package.json
└── README.md
```

## Database Schema

The MySQL database uses a single table `game_results` to store player game data:

| Column       | Type         | Description                   |
| ------------ | ------------ | ----------------------------- |
| id           | INT          | Auto-incrementing primary key |
| guild_id     | VARCHAR(255) | Discord server/guild ID       |
| user_id      | VARCHAR(255) | Discord user ID               |
| username     | VARCHAR(255) | Discord username              |
| game_date    | DATE         | Date of the game played       |
| score        | INT          | Categories solved (0-4)       |
| mistakes     | INT          | Mistakes made (0-4)           |
| completed_at | TIMESTAMP    | When completed                |

The table includes indexes for efficient querying and a unique constraint to ensure one entry per player per game per guild.

## Game Rules

1. **Objective**: Find 4 groups of 4 related words
2. **Mistakes**: You get 4 mistakes before game over
3. **Categories**: 4 difficulty levels (Yellow = Easiest, Purple = Hardest)
4. **Scoring**: Number of categories solved (0-4)
5. **One Play Per Day**: Each player can only complete the puzzle once per day

## Customization

### Changing the Date

The app automatically uses today's date, but you can modify the date logic in `main.js`:

```javascript
const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
```

### Styling

All game styling is in `client/style.css`. Category colors match the NYT Connections theme:

- Yellow: `#f9df6d`
- Green: `#a0c35a`
- Blue: `#b0c4ef`
- Purple: `#ba81c5`

### Database Storage

The app supports two storage modes:

1. **MySQL Database** (Recommended for production): Set `MYSQL_CONNECTION_STRING` in `.env`

   - Persistent storage across server restarts
   - Supports multiple concurrent users
   - Scales well for production use

2. **In-Memory Storage** (Development fallback): No database configuration needed
   - Data is lost when server restarts
   - Quick setup for testing
   - Automatically used if MySQL connection fails

## Notes

- The NYT Connections API is unofficial and may change
- MySQL database is optional but recommended for production
- If no database is configured, data will be lost on server restart
- The app requires Discord Activity permissions (identify, guilds)

## License

ISC

This template is used in the [Building An Activity](https://discord.com/developers/docs/activities/building-an-activity) tutorial in the Discord Developer Docs.

Read more about building Discord Activities with the Embedded App SDK at [https://discord.com/developers/docs/activities/overview](https://discord.com/developers/docs/activities/overview).
