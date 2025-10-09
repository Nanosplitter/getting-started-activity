import fetch from "node-fetch";
import { createPlayButton, formatPlayerMessage, updateSessionMessage, createGameAttachment } from "./discord-utils.js";

export async function checkSessionUpdates(client, activeSessions) {
  if (activeSessions.size === 0) return;

  console.log(`🔍 Polling ${activeSessions.size} active session(s)...`);

  for (const [sessionId, session] of activeSessions.entries()) {
    try {
      const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}`);
      if (!response.ok) {
        if (response.status !== 404) {
          console.warn(`Session ${sessionId} returned ${response.status}`);
        }
        continue;
      }

      let serverSession;
      try {
        const text = await response.text();
        serverSession = JSON.parse(text);
      } catch (parseError) {
        console.error(`Failed to parse session response for ${sessionId}:`, parseError.message);
        continue;
      }

      const serverPlayers = serverSession.players || {};
      console.log(`📊 Session ${sessionId}: ${Object.keys(serverPlayers).length} player(s)`);

      let hasUpdates = false;

      for (const userId in serverPlayers) {
        const serverPlayer = serverPlayers[userId];
        const localPlayer = session.players.find((p) => p.userId === userId);

        if (localPlayer) {
          const serverGuessCount = serverPlayer.guessHistory?.length || 0;
          const localGuessCount = localPlayer.lastGuessCount || 0;

          if (serverGuessCount > localGuessCount) {
            console.log(
              `🎮 Player ${serverPlayer.username} has new guesses: ${localGuessCount} -> ${serverGuessCount}`
            );
            localPlayer.guessHistory = serverPlayer.guessHistory;
            localPlayer.lastGuessCount = serverGuessCount;
            hasUpdates = true;
          }
        }
      }

      if (hasUpdates) {
        console.log(`📤 Updating Discord message with new progress...`);

        try {
          const attachment = await createGameAttachment(session.players, session.puzzleNumber);
          const button = createPlayButton(sessionId);
          const messageText = formatPlayerMessage(session.players, session.puzzleNumber);
          await updateSessionMessage(client, session, attachment, messageText, button);
          console.log(`✅ Message updated!`);

          const allComplete = session.players.every((player) => {
            const guesses = player.guessHistory || [];
            const correctCount = guesses.filter((g) => g.correct).length;
            const mistakeCount = guesses.filter((g) => !g.correct).length;
            return correctCount === 4 || mistakeCount >= 4;
          });

          if (allComplete && session.players.length > 0) {
            activeSessions.delete(sessionId);
            console.log(`✓ Game session ${sessionId} completed - all players done`);
          }
        } catch (editError) {
          console.error(`❌ Failed to edit message:`, editError.message);
        }
      }
    } catch (error) {
      console.error(`Error checking session ${sessionId}:`, error.message);
      activeSessions.delete(sessionId);
    }
  }
}
