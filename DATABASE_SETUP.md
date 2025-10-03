# MySQL Database Setup Guide

## Quick Start

1. **Add your MySQL connection string to `.env`:**

```env
MYSQL_CONNECTION_STRING=mysql://username:password@host:port/database
```

## Connection String Format

The connection string follows this format:

```
mysql://[username]:[password]@[host]:[port]/[database]
```

### Examples

**Local MySQL (default port 3306):**

```
MYSQL_CONNECTION_STRING=mysql://root:mypassword@localhost:3306/connections_game
```

**Remote MySQL server:**

```
MYSQL_CONNECTION_STRING=mysql://dbuser:secretpass@db.example.com:3306/my_database
```

**With special characters in password:**
If your password contains special characters, URL-encode them:

- `@` becomes `%40`
- `#` becomes `%23`
- `$` becomes `%24`
- `&` becomes `%26`

Example:

```
MYSQL_CONNECTION_STRING=mysql://root:p%40ssw%23rd@localhost:3306/connections_game
```

## Database Setup

### Option 1: Automatic (Recommended)

The server automatically creates the required table when it starts. Just ensure:

1. The MySQL server is running
2. The database exists (or user has permission to create it)
3. The connection string is correct in `.env`

### Option 2: Manual Setup

1. Connect to MySQL:

```bash
mysql -u root -p
```

2. Create the database:

```sql
CREATE DATABASE connections_game CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. Run the schema file:

```bash
mysql -u root -p connections_game < server/schema.sql
```

Or manually run the SQL commands from `server/schema.sql`.

## Testing the Connection

When you start the server, you should see:

```
MySQL connected successfully!
Database tables initialized!
Server listening at http://localhost:3001
```

If the connection fails, you'll see:

```
Database initialization error: [error details]
Continuing without database - using in-memory storage
```

The server will continue to work using in-memory storage if the database connection fails.

## Common Issues

### Error: "Access denied for user"

- Check username and password in connection string
- Ensure the MySQL user has proper permissions

### Error: "Unknown database"

- Create the database first: `CREATE DATABASE connections_game;`
- Or ensure the database name in the connection string is correct

### Error: "connect ECONNREFUSED"

- MySQL server is not running
- Check if the host and port are correct
- For localhost, try `127.0.0.1` instead of `localhost`

### Error: "ER_NOT_SUPPORTED_AUTH_MODE"

- Modern MySQL uses caching_sha2_password which may not be compatible
- Try changing the user's authentication method:

```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

## Hosting Providers

### PlanetScale

```
MYSQL_CONNECTION_STRING=mysql://[username]:[password]@[host]/[database]?ssl={"rejectUnauthorized":true}
```

### AWS RDS

```
MYSQL_CONNECTION_STRING=mysql://admin:password@database-1.xxxxx.us-east-1.rds.amazonaws.com:3306/connections_game
```

### DigitalOcean Managed Database

```
MYSQL_CONNECTION_STRING=mysql://doadmin:password@db-mysql-nyc1-xxxxx.ondigitalocean.com:25060/connections_game?ssl-mode=REQUIRED
```

## Database Maintenance

### View all game results:

```sql
SELECT * FROM game_results ORDER BY completed_at DESC LIMIT 100;
```

### See leaderboard for a specific date:

```sql
SELECT username, score, mistakes
FROM game_results
WHERE game_date = '2024-10-02'
ORDER BY score DESC, mistakes ASC;
```

### Clear old data (older than 30 days):

```sql
DELETE FROM game_results WHERE game_date < DATE_SUB(CURDATE(), INTERVAL 30 DAY);
```

### Check database size:

```sql
SELECT
  COUNT(*) as total_games,
  COUNT(DISTINCT user_id) as unique_players,
  COUNT(DISTINCT guild_id) as unique_guilds
FROM game_results;
```
