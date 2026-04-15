const voiceSessions = new Map();
const { addVoiceTime } = require("./profileSystem");

/**
 * START FULL VOICE TRACKING SYSTEM
 */
function initVoiceTracker(client) {
  console.log("🎤 Voice Tracker ONLINE");

  client.on("voiceStateUpdate", (oldState, newState) => {
    const userId = newState.id || oldState.id;

    const joined = !oldState.channelId && newState.channelId;
    const left = oldState.channelId && !newState.channelId;

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
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
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

      // anty bug / AFK memory leak protection
      if (duration > 60 * 60 * 12) {
        voiceSessions.delete(userId);
      }
    }
  }, 60_000);
}

module.exports = { initVoiceTracker };
