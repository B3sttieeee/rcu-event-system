// =====================================================
// src/events/voicestateupdate.js
// VYRN CLEAN VOICE XP SYSTEM - FIXED STABLE
// =====================================================

const { Events } = require("discord.js");

const profile = require("../systems/profile");
const economy = require("../systems/economy");
const level = require("../systems/level");

// ====================== CACHE ======================
const intervals = new Map();

// ====================== CONFIG ======================
const MINUTE = 60000;

// AFK channels (optional)
const AFK_CHANNEL_IDS = new Set();

// ====================== HELPERS ======================
function isRewardable(channelId) {
  return channelId && !AFK_CHANNEL_IDS.has(channelId);
}

function stopSession(userId) {
  const int = intervals.get(userId);
  if (int) clearInterval(int);
  intervals.delete(userId);
}

// ====================== VOICE LOOP ======================
function startSession(member) {
  const userId = member.id;

  // 🔥 FIX: always reset old interval
  stopSession(userId);

  intervals.set(
    userId,
    setInterval(async () => {
      try {
        const fresh =
          member.guild.members.cache.get(userId) ||
          (await member.guild.members.fetch(userId).catch(() => null));

        if (!fresh) return stopSession(userId);

        const voice = fresh.voice;

        if (!voice?.channelId) {
          return stopSession(userId);
        }

        if (!isRewardable(voice.channelId)) return;

        // ====================== REWARDS ======================
        profile.addVoiceTime(userId, 60); // seconds
        economy.addCoins(userId, 8);

        const user = level.handleVoiceXP(fresh);

        const totalXP = user?.totalXP ?? 0;
        const levelVal = user?.level ?? 0;

        console.log(
          `[VOICE] ${fresh.user.tag} | +1m | +8 coins | +10 XP | LVL: ${levelVal} | XP: ${totalXP}`
        );

      } catch (err) {
        console.error("[VOICE LOOP ERROR]", err);
      }
    }, MINUTE)
  );
}

// ====================== EXPORT ======================
module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    try {
      const member = newState.member || oldState.member;
      if (!member || member.user?.bot) return;

      const userId = member.id;

      const oldChannel = oldState.channelId;
      const newChannel = newState.channelId;

      // ====================== JOIN ======================
      if (!oldChannel && newChannel) {
        if (isRewardable(newChannel)) {
          startSession(member);
          console.log(`[VOICE JOIN] ${member.user.tag}`);
        }
        return;
      }

      // ====================== LEAVE ======================
      if (oldChannel && !newChannel) {
        stopSession(userId);
        console.log(`[VOICE LEAVE] ${member.user.tag}`);
        return;
      }

      // ====================== SWITCH ======================
      if (oldChannel && newChannel && oldChannel !== newChannel) {
        stopSession(userId);

        if (isRewardable(newChannel)) {
          startSession(member);
          console.log(`[VOICE SWITCH] ${member.user.tag}`);
        }
      }

    } catch (err) {
      console.error("[VOICE SYSTEM ERROR]", err);
    }
  }
};
