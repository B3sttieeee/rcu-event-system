// =====================================================
// VOICE REWARDS SYSTEM - CLEAN & STABLE
// =====================================================
const profile = require("../profile");
const economy = require("../economy");
const level = require("../level");        // lub activity jeśli używasz jednego pliku

const sessions = new Map(); // userId => { interval }
const MINUTE = 60000;

// ====================== SESSION CONTROL ======================
function stopSession(userId) {
  const data = sessions.get(userId);
  if (data?.interval) {
    clearInterval(data.interval);
  }
  sessions.delete(userId);
}

function startSession(member) {
  const userId = member.id;
  stopSession(userId); // reset starej sesji

  const interval = setInterval(async () => {
    try {
      // Pobierz aktualny stan użytkownika
      const freshMember = member.guild.members.cache.get(userId) ||
                          await member.guild.members.fetch(userId).catch(() => null);

      if (!freshMember?.voice?.channelId) {
        stopSession(userId);
        return;
      }

      // ====================== REWARDS ======================
      profile.addVoiceTime(userId, 60);           // +60 sekund voice time
      economy.addCoins(userId, 8);                // +8 monet za minutę
      level.handleVoiceXP(freshMember);           // +XP + level up check

      console.log(`[VOICE REWARD] ${freshMember.user.tag} | +60s voice | +8 coins | +10 XP`);

    } catch (err) {
      console.error(`[VOICE REWARD ERROR] ${member.user.tag}`, err.message);
    }
  }, MINUTE);

  sessions.set(userId, { interval });
  console.log(`[VOICE REWARD] Sesja rozpoczęta dla ${member.user.tag}`);
}

// ====================== EXPORT ======================
module.exports = {
  startSession,
  stopSession
};
