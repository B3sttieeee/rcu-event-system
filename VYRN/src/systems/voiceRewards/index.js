const activity = require("../activity"); // POPRAWKA ŚCIEŻKI

const sessions = new Map();
const MINUTE = 60000;

function stopSession(userId) {
  const data = sessions.get(userId);
  if (data?.interval) clearInterval(data.interval);
  sessions.delete(userId);
}

function startSession(member) {
  const userId = member.id;
  stopSession(userId);

  const interval = setInterval(() => {
    try {
      const freshMember = member.guild.members.cache.get(userId);
      if (!freshMember || !freshMember.voice.channelId) return stopSession(userId);

      activity.addVoiceTime(userId, 60);
      activity.addActivityXP(freshMember, 10, 8);
    } catch (err) { console.error(`[VOICE ERR] ${userId}`, err.message); }
  }, MINUTE);

  sessions.set(userId, { interval });
}

module.exports = { startSession, stopSession };
