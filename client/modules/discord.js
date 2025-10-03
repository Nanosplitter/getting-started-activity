/**
 * Discord SDK setup and authentication
 */

import { DiscordSDK } from "@discord/embedded-app-sdk";
import { MockDiscordSDK, mockTokenEndpoint } from "../mock-discord.js";
import { isLocalMode, DISCORD_CLIENT_ID, API_ENDPOINTS } from "../config.js";

let auth;
let currentUser;
let discordSdk;

/**
 * Initialize the Discord SDK (real or mock)
 * @returns {Object} - Discord SDK instance
 */
export function initializeDiscordSdk() {
  discordSdk = isLocalMode ? new MockDiscordSDK(DISCORD_CLIENT_ID) : new DiscordSDK(DISCORD_CLIENT_ID);

  return discordSdk;
}

/**
 * Set up and authenticate with Discord SDK
 * @returns {Promise<Object>} - Authentication result with user info
 */
export async function setupDiscordSdk() {
  if (!discordSdk) {
    initializeDiscordSdk();
  }

  await discordSdk.ready();
  console.log("Discord SDK is ready");

  // Authorize with Discord Client
  const { code } = await discordSdk.commands.authorize({
    client_id: DISCORD_CLIENT_ID,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify", "guilds"]
  });

  // Retrieve an access_token from your activity's server
  let tokenData;
  if (isLocalMode) {
    // Use mock token endpoint in local mode
    tokenData = await mockTokenEndpoint(code);
  } else {
    // Use real server endpoint in Discord mode
    const response = await fetch(API_ENDPOINTS.token, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ code })
    });
    tokenData = await response.json();
  }

  const { access_token } = tokenData;

  // Authenticate with Discord client (using the access_token)
  auth = await discordSdk.commands.authenticate({
    access_token
  });

  if (auth == null) {
    throw new Error("Authenticate command failed");
  }

  // Get current user info
  currentUser = auth.user;
  console.log("Current user:", currentUser);

  return { auth, user: currentUser, sdk: discordSdk };
}

/**
 * Get the current authenticated user
 * @returns {Object} - Current user object
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Get the Discord SDK instance
 * @returns {Object} - Discord SDK instance
 */
export function getDiscordSdk() {
  return discordSdk;
}

/**
 * Get the guild ID (or default for local mode)
 * @returns {string} - Guild ID
 */
export function getGuildId() {
  return discordSdk?.guildId || "default";
}
