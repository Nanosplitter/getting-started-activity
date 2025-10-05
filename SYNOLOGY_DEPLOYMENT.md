# Deployment Guide for Synology NAS

This guide walks you through deploying the Connections game to your Synology NAS using Docker, with an external MySQL database.

## Prerequisites

✅ Synology NAS with Container Manager installed
✅ Existing MySQL database (configured in your .env file)
✅ SSH access to your NAS
✅ Discord Developer Application configured

---

## Step 1: Prepare Your Project

### 1.1 Ensure your `.env` file is configured

Make sure your `.env` file contains:

```env
VITE_DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
MYSQL_CONNECTION_STRING=mysql://user:password@your-db-host:3306/connections_game
```

**Important:** If your MySQL database is on a different machine, make sure your NAS can reach it over the network.

### 1.2 Test database connection (optional)

```bash
# Test if your NAS can reach the database
mysql -h your-db-host -u your-db-user -p -e "USE connections_game; SHOW TABLES;"
```

---

## Step 2: Transfer Files to Synology NAS

### Option A: Using Git (Recommended)

```bash
# SSH into your NAS
ssh your_username@your_nas_ip

# Navigate to docker directory
cd /volume1/docker

# Clone your repository
git clone https://github.com/Nanosplitter/getting-started-activity.git connections-game
cd connections-game

# Copy your .env file to the project
# (Upload via File Station or scp)
```

### Option B: Using File Station

1. Open **File Station** on Synology
2. Navigate to `/docker/` (create if it doesn't exist)
3. Create folder `connections-game`
4. Upload your entire project folder
5. Upload your `.env` file to the root of the project

### Option C: Using SCP from Windows

```powershell
# From your project directory
scp -r . your_username@your_nas_ip:/volume1/docker/connections-game/
```

---

## Step 3: Build and Deploy

### Option A: Using Container Manager UI

1. Open **Container Manager** on your Synology
2. Go to **Project** tab
3. Click **Create**
4. **Project Name:** `connections-game`
5. **Path:** `/docker/connections-game`
6. **Source:** Upload from computer → Select your `docker-compose.yml`
7. Click **Next** → **Done**

The container will build and start automatically.

### Option B: Using SSH/Terminal

```bash
# SSH into your NAS
ssh your_username@your_nas_ip

# Navigate to project directory
cd /volume1/docker/connections-game

# Build and start the container
sudo docker-compose up -d --build
```

This will:

- Build the client (Vite build)
- Build the server
- Create a Docker image
- Start the container on port 3001

---

## Step 4: Verify Deployment

### 4.1 Check if container is running

**Via Container Manager:**

- Open Container Manager → Container
- Look for `connections-game` with status "Running"

**Via SSH:**

```bash
sudo docker ps | grep connections-game
```

### 4.2 View logs

**Via Container Manager:**

- Container Manager → Container → connections-game → Details → Log

**Via SSH:**

```bash
sudo docker logs -f connections-game
```

You should see:

```
✓ MySQL connected successfully!
Server listening at http://localhost:3001
```

### 4.3 Test local access

```bash
# From your NAS or local network
curl http://your_nas_ip:3001/api/health

# Should return something like:
# {"status":"ok","timestamp":...}
```

---

## Step 5: Expose to Internet (Required for Discord)

Discord Activities require HTTPS. Choose one option:

### Option 1: Cloudflare Tunnel (Recommended - Free & Easy)

#### 5.1 Install cloudflared on your NAS

```bash
ssh your_username@your_nas_ip

# Download cloudflared
cd /tmp
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
```

#### 5.2 Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This will open a browser. Select your Cloudflare domain.

#### 5.3 Create a tunnel

```bash
cloudflared tunnel create connections-game
```

Copy the tunnel ID from the output.

#### 5.4 Configure the tunnel

```bash
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

Add:

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: connections.yourdomain.com
    service: http://localhost:3001
  - service: http_status:404
```

#### 5.5 Create DNS record

In Cloudflare Dashboard:

1. Go to DNS settings
2. Add CNAME record:
   - Name: `connections`
   - Target: `YOUR_TUNNEL_ID.cfargotunnel.com`
   - Proxy status: Proxied

#### 5.6 Start the tunnel

```bash
# Test run
cloudflared tunnel run connections-game

# If working, set up as service
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

**Your app is now available at:** `https://connections.yourdomain.com`

---

### Option 2: Synology Reverse Proxy + Let's Encrypt

#### 5.1 Port forwarding

Configure your router:

- External Port 443 → NAS IP:443
- External Port 80 → NAS IP:80

#### 5.2 Get SSL Certificate

1. **Control Panel** → **Security** → **Certificate**
2. Click **Add** → **Add a new certificate**
3. Select **Get a certificate from Let's Encrypt**
4. Domain name: `connections.yourdomain.com`
5. Email: your email
6. Click **Apply**

#### 5.3 Configure Reverse Proxy

1. **Control Panel** → **Login Portal** → **Advanced** → **Reverse Proxy**
2. Click **Create**
3. Configure:
   - Description: `Connections Game`
   - **Source:**
     - Protocol: `HTTPS`
     - Hostname: `connections.yourdomain.com`
     - Port: `443`
   - **Destination:**
     - Protocol: `HTTP`
     - Hostname: `localhost`
     - Port: `3001`
4. **Custom Header** tab:
   - Click **Create** → **WebSocket**
5. Click **Save**

**Your app is now available at:** `https://connections.yourdomain.com`

---

## Step 6: Configure Discord Activity

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to **Activities** section
4. **URL Mappings:**
   - URL Prefix: `/`
   - Target: `https://connections.yourdomain.com`
5. Click **Save Changes**

---

## Step 7: Test Your Deployment

### 7.1 Test the public URL

```bash
curl https://connections.yourdomain.com/api/health
```

### 7.2 Test in Discord

1. Open Discord
2. Join any voice channel
3. Click the **Activities** button (🚀 rocket icon)
4. Select your Connections game
5. Play!

---

## Maintenance & Updates

### Update the application

```bash
ssh your_username@your_nas_ip
cd /volume1/docker/connections-game

# Pull latest changes (if using git)
git pull

# Rebuild and restart
sudo docker-compose down
sudo docker-compose up -d --build
```

### View logs

```bash
sudo docker logs -f connections-game
```

### Restart container

```bash
sudo docker restart connections-game
```

### Stop container

```bash
sudo docker-compose down
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs
sudo docker logs connections-game

# Common issues:
# - Database connection failed → Check MYSQL_CONNECTION_STRING in .env
# - Port already in use → Change port in docker-compose.yml
# - Permission denied → Use sudo
```

### Can't connect to database

```bash
# Test database connection from NAS
mysql -h your-db-host -u your-user -p

# If this fails, check:
# - Database host allows connections from NAS IP
# - Firewall settings
# - MySQL user permissions
```

### Discord Activity not loading

1. Check HTTPS is working: `curl https://connections.yourdomain.com`
2. Verify Discord URL mapping matches your public URL exactly
3. Check Discord Developer Portal for error messages
4. Try clearing Discord cache (Ctrl+R in Discord)

### Build fails

```bash
# Clear docker cache and rebuild
sudo docker-compose down
sudo docker system prune -a
sudo docker-compose up -d --build
```

---

## Security Recommendations

1. ✅ Use strong MySQL password
2. ✅ Keep Discord client secret safe
3. ✅ Use HTTPS (required for Discord anyway)
4. ✅ Regularly update dependencies
5. ✅ Don't commit `.env` to git
6. ✅ Enable firewall on Synology
7. ✅ Use Cloudflare proxy for DDoS protection

---

## Performance Tuning

### Allocate more resources (if needed)

Edit `docker-compose.yml`:

```yaml
services:
  connections-game:
    # ... existing config
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          cpus: "0.5"
          memory: 256M
```

---

## Need Help?

- Check logs: `sudo docker logs -f connections-game`
- Discord Developer Docs: https://discord.com/developers/docs/activities/overview
- Cloudflare Tunnel Docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/

---

**Your Connections game is now live on your Synology NAS! 🎉**
