// =====================================================
// VOICE STATE UPDATE - PROFESSIONAL VERSION
// =====================================================
const { Events } = require("discord.js");

const profile = require("../systems/profile");
const economy = require("../systems/economy");
const level = require("../systems/level");

// ====================== STATE ======================
const sessions = new Map(); // userId => { interval }

// ====================== CONFIG ======================
const MINUTE = 60000;

// ====================== HELPERS ======================
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
      // Pobierz aktualny stan membera
      const freshMember = member.guild.members.cache.get(userId) ||
                          await member.guild.members.fetch(userId).catch(() => null);

      if (!freshMember?.voice?.channelId) {
        stopSession(userId);
        return;
      }

      // ====================== REWARDS ======================
      profile.addVoiceTime(userId, 60);                    // +60 sekund voice
      economy.addCoins(userId, 8);                         // +8 monet za minutę
      await level.addXP(freshMember, 8, 0);                // +8 XP za minutę (voiceXP)

      console.log(`[VOICE] ${freshMember.user.tag} | +60s voice | +8 coins | +8 XP`);

    } catch (err) {
      console.error(`[VOICE ERROR] ${member.user.tag}`, err.message);
    }
  }, MINUTE);

  sessions.set(userId, { interval });
  console.log(`[VOICE JOIN] ${member.user.tag} — sesja rozpoczęta`);
}

// ====================== EVENT ======================
module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    try {
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      const oldChannel = oldState.channelId;
      const newChannel = newState.channelId;

      // JOIN
      if (!oldChannel && newChannel) {
        startSession(member);
        return;
      }

      // LEAVE
      if (oldChannel && !newChannel) {
        stopSession(member.id);
        console.log(`[VOICE LEAVE] ${member.user.tag}`);
        return;
      }

      // SWITCH CHANNEL
      if (oldChannel && newChannel && oldChannel !== newChannel) {
        stopSession(member.id);
        startSession(member);
        console.log(`[VOICE SWITCH] ${member.user.tag}`);
      }
    } catch (err) {
      console.error("[VOICE STATE ERROR]", err);
    }
  }
};
