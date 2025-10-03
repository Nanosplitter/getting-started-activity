# 🎮 Local Development Mode - Setup Complete!

Your Connections game now supports local development without Discord!

## 🚀 Quick Start (No Discord Needed!)

```bash
# Terminal 1 - Start the backend
cd server
npm run dev

# Terminal 2 - Start the frontend and open local mode
cd client
npm run dev:local
```

Or manually open: **http://localhost:5173/local.html**

## ✨ What Was Added

### New Files

1. **`client/mock-discord.js`**

   - Mock Discord SDK that simulates Discord environment
   - Generates random user data
   - Simulates authentication flow
   - No actual Discord connection needed

2. **`client/local.html`**

   - Special HTML page optimized for local development
   - Shows dev mode indicator
   - Automatically uses mock Discord data

3. **`LOCAL_DEV.md`**
   - Complete guide for local development
   - Troubleshooting tips
   - How to simulate multiple users

### Modified Files

1. **`client/main.js`**

   - Auto-detects if running locally or in Discord
   - Switches between real and mock Discord SDK
   - Shows local mode indicator in UI
   - Works seamlessly in both modes

2. **`client/package.json`**

   - Added `npm run dev:local` script
   - Opens browser directly to local mode

3. **`README.md`**
   - Added Local Development Mode section
   - Quick start instructions
   - Mode switching information

## 🎯 Features

### Works in Both Modes

The app now works in two modes seamlessly:

**Local Mode** (localhost)

- ✅ No Discord setup required
- ✅ Mock user data generated automatically
- ✅ Full game functionality
- ✅ Real backend integration
- ✅ Perfect for quick testing

**Discord Mode** (in Discord Activity)

- ✅ Real Discord integration
- ✅ Actual user accounts
- ✅ Guild/server tracking
- ✅ Production ready

### Automatic Mode Detection

The app automatically determines which mode to use:

- **Local**: When accessed via `localhost` and not in iframe
- **Discord**: When accessed through Discord Activity

No configuration needed! It just works.

## 📋 How to Use

### Method 1: Quick Start (Recommended)

```bash
cd client
npm run dev:local
```

This automatically opens your browser to the local development page.

### Method 2: Manual

```bash
# Start both servers
cd server && npm run dev  # Terminal 1
cd client && npm run dev  # Terminal 2

# Then open your browser to:
http://localhost:5173/local.html
```

### Method 3: Regular Index (Also Works)

```bash
# Visit the regular index page
http://localhost:5173/

# It will auto-detect local mode and use mock data
```

## 🧪 Testing Features

### Test as Single User

1. Open http://localhost:5173/local.html
2. Play the game normally
3. Your score is saved

### Test Multiplayer

1. Open in multiple tabs/windows
2. Each gets a different random username
3. Complete games in each tab
4. See all scores in the leaderboard

### Test Different Browsers

- Chrome → TestUser123
- Firefox → TestUser456
- Edge → TestUser789
- Each browser = different user!

## 🔍 How It Works

### Mode Detection

```javascript
// In main.js
const isLocalMode = !window.location.ancestorOrigins?.length && window.location.hostname === "localhost";
```

This checks:

- Is it in an iframe? (Discord uses iframes)
- Is the hostname localhost?

### Mock Data Generation

```javascript
// Mock Discord SDK generates:
{
  user: {
    id: "mock-user-abc123",
    username: "TestUser742",
    discriminator: "0001"
  },
  guildId: "mock-guild-456",
  channelId: "mock-channel-123"
}
```

### Backend Integration

- Mock data is sent to the real backend
- Backend treats it like any other user
- Saves to database (if configured)
- Leaderboards work normally

## 🎨 Visual Indicators

### In Local Mode

You'll see a blue banner at the top:

```
🔧 Local Development Mode | User: TestUser742 | Guild: mock-guild-456
```

### In Discord Mode

No banner - normal game appearance

### In Browser DevTools

Console shows:

```
Running in LOCAL mode
[Mock Discord] SDK Ready
[Mock Discord] Authorize called with: {...}
[Mock Discord] Authenticate called with: {...}
```

## 🔧 Customization

### Change Mock Usernames

Edit `client/mock-discord.js`:

```javascript
username: "TestUser" + Math.floor(Math.random() * 1000);
// Change to:
username: "Player" + Math.floor(Math.random() * 100);
```

### Change Mock Guild

Edit `client/mock-discord.js`:

```javascript
this.guildId = "mock-guild-456";
// Change to:
this.guildId = "my-test-server";
```

### Disable Local Mode

To force Discord mode only, remove the mode detection in `main.js`:

```javascript
// Remove this:
const isLocalMode = ...

// Always use real SDK:
const discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
```

## 📊 Comparison

| Feature             | Local Mode     | Discord Mode          |
| ------------------- | -------------- | --------------------- |
| Setup Required      | ❌ None        | ✅ Discord Dev Portal |
| User Authentication | Mock data      | Real Discord OAuth    |
| Game Functionality  | ✅ Full        | ✅ Full               |
| Backend Integration | ✅ Yes         | ✅ Yes                |
| Database Support    | ✅ Yes         | ✅ Yes                |
| Multiplayer Testing | ✅ Easy (tabs) | ✅ Real users         |
| Dev Speed           | ⚡ Instant     | 🐌 Slower             |
| Use Case            | Development    | Production            |

## 🎓 Use Cases

### Perfect For:

- 🔧 Rapid prototyping
- 🐛 Debugging game logic
- 🎨 UI/UX development
- 📝 Writing tests
- 👨‍🏫 Demos and presentations
- 🚀 Quick iterations

### Not For:

- 🚫 Testing Discord-specific features
- 🚫 OAuth flow testing
- 🚫 Production deployment
- 🚫 Real user data testing

## 📚 Documentation

- **LOCAL_DEV.md** - Complete local development guide
- **README.md** - General setup and usage
- **DATABASE_SETUP.md** - Database configuration

## 🎉 Benefits

1. **No Discord Configuration**

   - Skip the Discord Developer Portal setup
   - No client ID/secret needed for testing
   - No OAuth complications

2. **Instant Testing**

   - Start servers → Open browser → Play
   - No waiting for Discord Activity to load
   - Faster development cycles

3. **Easy Debugging**

   - Full browser DevTools access
   - Console logging works perfectly
   - No iframe restrictions

4. **Flexible Testing**

   - Test with multiple users instantly
   - Simulate different scenarios
   - No need for multiple Discord accounts

5. **Seamless Transition**
   - Same codebase works in both modes
   - No code changes to switch modes
   - Deploy to Discord when ready

## 🐛 Known Limitations

1. **Discord-specific features won't work in local mode:**

   - Voice channel info
   - Guild avatar/icon
   - Real user permissions
   - Discord RPC features

2. **Mock data is random:**

   - New user ID on each page load
   - Can't persist as same user across sessions
   - (Can be changed in mock-discord.js if needed)

3. **No actual Discord integration:**
   - Can't test Discord Activity features
   - Can't test embed behavior
   - Can't test Discord permissions

## 💡 Tips

1. **Keep both terminals open** - You need both server and client running
2. **Use browser DevTools** - Check console for helpful debug info
3. **Test in multiple tabs** - Great for multiplayer testing
4. **Check the blue banner** - Confirms you're in local mode
5. **Use `npm run dev:local`** - Easiest way to start

## 🆘 Need Help?

If something doesn't work:

1. Check both servers are running (server:3001, client:5173)
2. Open browser console (F12) for error messages
3. Look for the "Running in LOCAL mode" log
4. Check LOCAL_DEV.md for troubleshooting
5. Make sure you're accessing via localhost

---

**That's it! You can now develop and test the Connections game without any Discord setup!** 🎉

Just run `npm run dev:local` and start coding!
