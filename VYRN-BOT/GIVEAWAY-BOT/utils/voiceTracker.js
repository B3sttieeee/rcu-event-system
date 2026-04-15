const { addVoiceTime } = require("./profileSystem");

// userId -> { start, channelId }
const voiceSessions = new Map();

/**
 * VOICE TRACKER (REAL TIME SESSION BASED)
 */
function initVoiceTracker(client) {
  console.log("🎤 Voice Tracker v2 ONLINE");

  client.on("voiceStateUpdate", (oldState, newState) => {
    const userId = newState.id || oldState.id;

    const joined = !oldState.channelId && newState.channelId;
    const left = oldState.channelId && !newState.channelId;
    const switched =
      oldState.channelId &&
      newState.channelId &&
      oldState.channelId !== newState.channelId;

    // ================= JOIN =================
    if (joined) {
      voiceSessions.set(userId, {
        start: Date.now(),
        channelId: newState.channelId,
      });
      return;
    }

    // ================= LEAVE =================
    if (left) {
      const session = voiceSessions.get(userId);
      if (!session) return;

      const duration = Math.floor((Date.now() - session.start) / 1000);
      voiceSessions.delete(userId);

      if (duration > 0) {
        addVoiceTime(userId, duration);
      }
      return;
    }

    // ================= SWITCH CHANNEL =================
    if (switched) {
      const session = voiceSessions.get(userId);

      if (session) {
        const duration = Math.floor((Date.now() - session.start) / 1000);

        if (duration > 0) {
          addVoiceTime(userId, duration);
        }
      }

      voiceSessions.set(userId, {
        start: Date.now(),
        channelId: newState.channelId,
      });
    }
  });

  // ================= SAFETY CLEANUP =================
  setInterval(() => {
    const now = Date.now();

    for (const [userId, session] of voiceSessions.entries()) {
      const duration = (now - session.start) / 1000;

      // anti bug / AFK leak protection
      if (duration > 60 * 60 * 12) {
        voiceSessions.delete(userId);
      }
    }
  }, 60_000);
}

module.exports = { initVoiceTracker };
