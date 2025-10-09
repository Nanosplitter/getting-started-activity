import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { getPuzzleNumber, getTodayDate } from "./utils.js";
import { createGameAttachment, createPlayButton, launchActivity } from "./discord-utils.js";
import { notifySessionStart, notifyPlayerJoin, fetchSession } from "./server-api.js";

export async function startGameSession(interaction, client, activeSessions) {
  try {
    const guildId = interaction.guildId || "dm";
    const channelId = interaction.channelId;
    const puzzleNumber = getPuzzleNumber();

    console.log(`🎬 Starting new multi-user session for guild: ${guildId}`);

    await interaction.deferReply();

    const attachment = await createGameAttachment([], puzzleNumber);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`launch_activity_temp`).setLabel("Play now!").setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({
      content: `Click **Play** to join today's Connections #${puzzleNumber}`,
      files: [attachment],
      components: [row]
    });

    const reply = await interaction.fetchReply();
    const actualChannelId = reply.channel?.id || reply.channelId || channelId;
    const sessionId = reply.id;

    console.log(`📍 Created session ${sessionId} in channel ${actualChannelId}`);

    const updatedRow = createPlayButton(sessionId);
    await interaction.editReply({
      content: `Click **Play** to join today's Connections #${puzzleNumber}`,
      files: [attachment],
      components: [updatedRow]
    });

    activeSessions.set(sessionId, {
      sessionId,
      channelId: actualChannelId,
      messageId: reply.id,
      guildId,
      puzzleNumber,
      players: [],
      interaction
    });

    await notifySessionStart(sessionId, guildId, actualChannelId, reply.id);

    console.log(`✓ Started multi-user game session ${sessionId}`);
  } catch (error) {
    console.error("Error starting game session:", error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "Failed to start game session. Please try again.",
          flags: 64
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

export async function createReplySession(interaction, originalSession, client, activeSessions) {
  try {
    const userId = interaction.user.id;
    const username = interaction.user.username;
    const avatarUrl = interaction.user.displayAvatarURL({ format: "png" });
    const puzzleNumber = originalSession.puzzleNumber;

    console.log(`🔄 Creating reply session for ${username} (original session complete)`);

    const attachment = await createGameAttachment(
      [{ userId, username, avatarUrl, guessHistory: [], lastGuessCount: 0 }],
      puzzleNumber
    );

    const channel = await client.channels.fetch(originalSession.channelId);
    if (!channel || !channel.isTextBased()) {
      throw new Error("Channel not found or is not text-based");
    }

    const replyMessage = await channel.send({
      content: `**${username}** is playing Connections #${puzzleNumber}`,
      files: [attachment],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`launch_activity_temp`)
            .setLabel("Play")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🎮")
        )
      ],
      reply: { messageReference: originalSession.messageId }
    });

    const newSessionId = replyMessage.id;
    console.log(`✅ Created reply message ${newSessionId} in response to ${originalSession.messageId}`);

    await replyMessage.edit({
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`launch_activity_${newSessionId}`)
            .setLabel("Play")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🎮")
        )
      ]
    });

    activeSessions.set(newSessionId, {
      sessionId: newSessionId,
      channelId: interaction.channelId,
      messageId: replyMessage.id,
      guildId: originalSession.guildId,
      puzzleNumber,
      players: [{ userId, username, avatarUrl, guessHistory: [], lastGuessCount: 0 }],
      interaction: null,
      parentMessageId: originalSession.messageId
    });

    const gameDate = getTodayDate();
    await notifySessionStart(newSessionId, originalSession.guildId, interaction.channelId, replyMessage.id);
    await notifyPlayerJoin(newSessionId, userId, username, avatarUrl, originalSession.guildId, gameDate);

    console.log(`✓ Reply session ${newSessionId} created with ${username} as first player`);

    await launchActivity(client, interaction);
    console.log(`🚀 Activity launched for ${username} in new reply session`);
  } catch (error) {
    console.error("Error creating reply session:", error);
    try {
      await interaction.deferUpdate();
    } catch (e) {
      // Ignore
    }
  }
}

export async function restoreSessionFromServer(sessionId, activeSessions) {
  console.log(`⚠️ Session ${sessionId} not in cache, fetching from server...`);

  const serverSession = await fetchSession(sessionId);
  if (!serverSession) {
    console.warn(`❌ Session ${sessionId} not found on server`);
    return null;
  }

  const session = {
    sessionId,
    channelId: serverSession.channelId,
    messageId: sessionId,
    guildId: serverSession.guildId,
    puzzleNumber: getPuzzleNumber(),
    players: Object.entries(serverSession.players || {}).map(([userId, player]) => ({
      userId,
      username: player.username,
      avatarUrl: player.avatarUrl,
      guessHistory: player.guessHistory || [],
      lastGuessCount: player.guessHistory?.length || 0
    })),
    interaction: null
  };

  activeSessions.set(sessionId, session);
  console.log(`✅ Session ${sessionId} restored from server`);
  return session;
}
