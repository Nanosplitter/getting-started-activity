import fetch from "node-fetch";

const SERVER_URL = "http://localhost:3001";

export async function notifySessionStart(sessionId, guildId, channelId, messageId) {
  try {
    const response = await fetch(`${SERVER_URL}/api/sessions/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, guildId, channelId, messageId })
    });

    if (!response.ok) {
      console.warn(`Server returned ${response.status} for session start`);
    }
  } catch (error) {
    console.error("Failed to notify server about session:", error.message);
  }
}

export async function notifyPlayerJoin(sessionId, userId, username, avatarUrl, guildId, date) {
  try {
    const response = await fetch(`${SERVER_URL}/api/sessions/${sessionId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, username, avatarUrl, guildId, date })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Server notified of player join: ${data.userSessionId} -> ${data.messageSessionId}`);
      return data;
    } else {
      console.warn(`⚠️ Failed to notify server of player join: ${response.status}`);
    }
  } catch (error) {
    console.error("Failed to notify server about player join:", error.message);
  }
}

export async function fetchSession(sessionId) {
  try {
    const response = await fetch(`${SERVER_URL}/api/sessions/${sessionId}`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch session from server:", error.message);
    return null;
  }
}
