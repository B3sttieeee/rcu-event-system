// =====================================================
// VOICE REWARDS SYSTEM - OPTIMIZED
// =====================================================
const activity = require("../activity");

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

  const interval = setInterval(() => {
    try {
      // Optymalizacja: Używamy tylko cache. Event voiceStateUpdate i tak
      // zdejmie sesję gdy użytkownik wyjdzie, więc fetch() jest zbędny.
      const freshMember = member.guild.members.cache.get(userId);

      if (!freshMember || !freshMember.voice.channelId) {
        stopSession(userId);
        return;
      }

      // ====================== REWARDS ======================
      activity.addVoiceTime(userId, 60);           // Dodaje czas 
      
      // Dodaje 10 XP i od razu przez wewnętrzny system dodaje 8 monet
      activity.addActivityXP(freshMember, 10, 8);  

      console.log(`[VOICE REWARD] ${freshMember.user.tag} | +60s voice | +8 coins | +10 XP`);

    } catch (err) {
      console.error(`[VOICE REWARD ERROR] ${member?.user?.tag || userId}`, err.message);
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
