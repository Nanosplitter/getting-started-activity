# Local Development Guide

This guide explains how to run the Connections game locally without needing Discord setup.

## Why Local Mode?

Local mode allows you to:

- 🚀 Test the game instantly without Discord configuration
- 🔧 Develop and debug features quickly
- 🎮 Demo the game to others without Discord
- ✅ Run automated tests
- 👥 Simulate multiple users easily

## Quick Start

### 1. Start the Backend Server

```bash
cd server
npm run dev
```

You should see:

```
Server listening at http://localhost:3001
```

### 2. Start the Frontend

```bash
cd client
npm run dev
```

You should see:

```
VITE ready in XXX ms
➜  Local:   http://localhost:5173/
```

### 3. Open in Browser

Open your browser to:

- **http://localhost:5173/local.html** (recommended for local dev)
- **http://localhost:5173/** (also works)

That's it! The game will run with mock Discord data.

## How It Works

### Automatic Detection

The app automatically detects if it's running in Discord or locally by checking:

- If the page is in an iframe (Discord embeds the app in an iframe)
- If the hostname is `localhost`

### Mock Discord Data

In local mode, the app generates:

- Random user ID and username (e.g., "TestUser742")
- Mock guild/server ID
- Fake access tokens
- Simulated Discord SDK responses

### Real Backend

Even in local mode, the app uses the real backend server, so:

- ✅ Game state is saved
- ✅ Leaderboards work
- ✅ Multiple local "users" can compete
- ✅ Database integration works (if configured)

## Features That Work in Local Mode

All game features work in local mode:

- ✅ Play the daily Connections puzzle
- ✅ Submit guesses and track mistakes
- ✅ Complete categories
- ✅ Save scores
- ✅ View leaderboard
- ✅ All game mechanics (shuffle, deselect, etc.)

## Simulating Multiple Users

Want to test multiplayer features? Easy!

1. Open the game in multiple browser tabs or windows
2. Each tab/window gets a different random user ID
3. Play as different users and watch the leaderboard update

Or use different browsers:

- Chrome: TestUser123
- Firefox: TestUser456
- Edge: TestUser789

## Development Tips

### Console Logging

The app logs helpful info to the browser console:

- `[Mock Discord]` - Mock SDK actions
- `[Mock Server]` - Mock token endpoint
- User data and game state

Press F12 to open DevTools and see the logs.

### Testing Specific Dates

By default, local mode uses a fallback date (2024-10-02) since future dates don't have games yet.

To test a specific date, modify `client/main.js`:

```javascript
const fallbackDate = "2024-10-02"; // Change this date
```

### Changing Mock User Data

Edit `client/mock-discord.js` to customize:

- Username format
- User IDs
- Guild IDs
- Channel names

### Hot Reload

Vite automatically reloads when you edit files:

- Edit `client/main.js` → Browser auto-refreshes
- Edit `client/style.css` → Styles update instantly
- Edit `server/server.js` → Restart server manually

## Switching to Discord Mode

When you're ready to test in Discord:

1. Keep the same servers running
2. Set up Discord Activity in Developer Portal
3. Configure URL mapping to point to your server
4. Access through Discord Activity

The app automatically switches to Discord mode when accessed through Discord!

## Troubleshooting

### Port Already in Use

If port 5173 is in use:

```bash
# Vite will automatically try the next available port
# Check the console output for the actual port
```

### Server Not Running

Make sure both servers are running:

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

### Blank Screen

1. Check browser console for errors (F12)
2. Make sure both servers are running
3. Try refreshing the page
4. Check if the server URL is correct (localhost:3001)

### Mock Data Not Working

1. Open browser console
2. Look for `Running in LOCAL mode` message
3. If it says `DISCORD mode`, check that you're on localhost
4. Clear browser cache and reload

## Files Involved

### Local Mode Files

- `client/mock-discord.js` - Mock Discord SDK implementation
- `client/local.html` - Local development HTML page
- `client/main.js` - Auto-detects and switches modes

### How to Disable Local Mode

If you only want Discord mode, you can:

1. Remove the mode detection from `main.js`:

```javascript
// Remove this line:
const isLocalMode = !window.location.ancestorOrigins?.length && window.location.hostname === "localhost";

// And always use:
const discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
```

2. Or just don't use `local.html` and always access through Discord

## Need Help?

- Check the browser console for error messages
- Look at the server terminal for backend errors
- Review the main README.md for general setup
- Check DATABASE_SETUP.md for database configuration
