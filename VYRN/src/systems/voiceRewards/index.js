// src/systems/voiceRewards.js
const activity = require("./activity"); // Zakładam że są w tym samym folderze

const sessions = new Map(); 
const MINUTE = 60000;

function stopSession(userId) {
  const data = sessions.get(userId);
  if (data?.interval) {
    clearInterval(data.interval);
  }
  sessions.delete(userId);
}

function startSession(member) {
  const userId = member.id;
  stopSession(userId); // Zabezpieczenie: usuwamy starą sesję jeśli istnieje

  const interval = setInterval(() => {
    try {
      // Pobieramy z cache - oszczędza zapytania API
      const freshMember = member.guild.members.cache.get(userId);

      if (!freshMember || !freshMember.voice.channelId) {
        stopSession(userId);
        return;
      }

      // 1. Dodaje 60 sekund do statystyk
      activity.addVoiceTime(userId, 60);           
      // 2. Dodaje 10 XP i od razu przez system 8 monet
      activity.addActivityXP(freshMember, 10, 8);  

      // Możesz to wyciszyć dodając // z przodu, jeśli nie chcesz spamu w konsoli co minutę
      // console.log(`[VOICE] ${freshMember.user.tag} | +60s | +10 XP | +8 Coins`);

    } catch (err) {
      console.error(`[VOICE REWARD ERROR] ${userId}`, err.message);
    }
  }, MINUTE);

  sessions.set(userId, { interval });
}

module.exports = {
  startSession,
  stopSession
};
