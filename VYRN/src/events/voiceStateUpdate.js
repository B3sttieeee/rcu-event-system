// =====================================================
// src/events/voicestateupdate.js
// VYRN CLEAN VOICE XP SYSTEM
// =====================================================

const { Events } = require("discord.js");

const profile = require("../systems/profile");
const economy = require("../systems/economy");
const level = require("../systems/level");

// ====================== CACHE ======================
const joinTimes = new Map();
const intervals = new Map();

// ====================== CONFIG ======================
const MINUTE = 60000;

// kanały AFK jeśli chcesz dodać ID
const AFK_CHANNEL_IDS = new Set();

// ====================== HELPERS ======================
function isRewardable(channelId) {
  if (!channelId) return false;
  if (AFK_CHANNEL_IDS.has(channelId)) return false;
  return true;
}

function clearUserInterval(userId) {
  const int = intervals.get(userId);

  if (int) {
    clearInterval(int);
    intervals.delete(userId);
  }
}

// ====================== START SESSION ======================
function startVoiceSession(member, channelId) {
  const userId = member.id;

  clearUserInterval(userId);

  joinTimes.set(userId, Date.now());

  const interval = setInterval(async () => {
    try {
      const freshMember =
        member.guild.members.cache.get(userId) ||
        await member.guild.members.fetch(userId).catch(() => null);

      if (!freshMember) {
        clearUserInterval(userId);
        return;
      }

      const voice = freshMember.voice;

      if (!voice?.channelId) {
        clearUserInterval(userId);
        return;
      }

      if (!isRewardable(voice.channelId)) {
        return;
      }

      // ====================== REWARD ======================
      profile.addVoiceTime(userId, 60); // sekundy
      economy.addCoins(userId, 8);
      await level.handleVoiceXP(freshMember);

      const data = level.ensureUser(userId);

      console.log(
        `[VOICE] ${freshMember.user.tag} | +1m | +8 coins | +10 XP | TOTAL: ${data.totalXP}`
      );

    } catch (err) {
      console.error("[VOICE INTERVAL ERROR]", err);
    }
  }, MINUTE);

  intervals.set(userId, interval);
}

// ====================== EXPORT ======================
module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    try {
      const member = newState.member || oldState.member;

      if (!member) return;
      if (member.user?.bot) return;

      const userId = member.id;

      const oldChannel = oldState.channelId;
      const newChannel = newState.channelId;

      // ====================== JOIN ======================
      if (!oldChannel && newChannel) {
        if (isRewardable(newChannel)) {
          startVoiceSession(member, newChannel);
          console.log(`[VOICE JOIN] ${member.user.tag}`);
        }
        return;
      }

      // ====================== LEAVE ======================
      if (oldChannel && !newChannel) {
        clearUserInterval(userId);
        joinTimes.delete(userId);

        console.log(`[VOICE LEAVE] ${member.user.tag}`);
        return;
      }

      // ====================== SWITCH ======================
      if (oldChannel && newChannel && oldChannel !== newChannel) {
        clearUserInterval(userId);

        if (isRewardable(newChannel)) {
          startVoiceSession(member, newChannel);
          console.log(
            `[VOICE SWITCH] ${member.user.tag} | ${oldChannel} -> ${newChannel}`
          );
        }

        return;
      }

    } catch (err) {
      console.error("[VOICE SYSTEM ERROR]", err);
    }
  }
};
