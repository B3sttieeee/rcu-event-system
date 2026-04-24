// =====================================================
// VOICE SYSTEM - VYRN PRO (ADVANCED FIXED)
// =====================================================

const { addVoiceTime } = require("../systems/profile");
const { addCoins } = require("../systems/economy");
const { addXP } = require("../systems/level");

const joinTimes = new Map();
const sessionData = new Map(); // userId -> { channelId, joinedAt, totalMs }

// ====================== CONFIG ======================
const MIN_REWARD_MINUTES = 1;
const COINS_PER_MINUTE = 10;
const XP_PER_MINUTE = 6;

// anti-AFK threshold (idle detection simple)
const AFK_CHANNEL_IDS = new Set([
  // możesz tu wrzucić AFK voice channel ID
]);

// ====================== HELPERS ======================
function getMinutes(ms) {
  return Math.floor(ms / 60000);
}

// ====================== MAIN ======================
module.exports = {
  name: "voiceStateUpdate",

  async execute(oldState, newState) {
    try {
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      const id = member.id;

      const oldChannel = oldState.channelId;
      const newChannel = newState.channelId;

      // ======================
      // JOIN VOICE
      // ======================
      if (!oldChannel && newChannel) {
        joinTimes.set(id, Date.now());

        sessionData.set(id, {
          channelId: newChannel,
          joinedAt: Date.now(),
          totalMs: 0
        });

        return;
      }

      // ======================
      // LEAVE VOICE
      // ======================
      if (oldChannel && !newChannel) {
        const start = joinTimes.get(id);
        const session = sessionData.get(id);

        joinTimes.delete(id);

        if (!start || !session) return;

        const duration = Date.now() - start;
        const minutes = getMinutes(duration);

        sessionData.delete(id);

        if (minutes < MIN_REWARD_MINUTES) return;

        // ======================
        // REWARDS
        // ======================
        const coins = minutes * COINS_PER_MINUTE;
        const xp = minutes * XP_PER_MINUTE;

        addVoiceTime(id, minutes);
        addCoins(id, coins);
        addXP(member, xp);

        console.log(
          `[VOICE] ${member.user.tag} | +${minutes}m | +${coins} coins | +${xp} XP`
        );
      }

      // ======================
      // SWITCH CHANNEL (ANTI FARM FIX)
      // ======================
      if (oldChannel && newChannel && oldChannel !== newChannel) {
        const start = joinTimes.get(id);

        if (start) {
          const session = sessionData.get(id);

          const duration = Date.now() - start;

          if (session) {
            session.totalMs += duration;
            session.channelId = newChannel;
          }

          joinTimes.set(id, Date.now());
        }
      }

      // ======================
      // AFK DETECTION (OPTIONAL)
      // ======================
      if (AFK_CHANNEL_IDS.has(newChannel)) {
        console.log(`[VOICE] ${member.user.tag} went AFK`);
      }

    } catch (err) {
      console.error("[VOICE SYSTEM ERROR]", err);
    }
  }
};
