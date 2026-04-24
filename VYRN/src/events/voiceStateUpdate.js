const { handlePrivateChannelCreation } = require("../systems/privatevc");
const { addVoiceTime } = require("../systems/profile");
const { addCoins } = require("../systems/economy");

const CREATE_CHANNEL_ID = "1496280414237491220";

// userId -> timestamp
const joinTimes = new Map();

module.exports = {
  name: "voiceStateUpdate",

  async execute(oldState, newState) {
    try {
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      const userId = member.id;

      // ======================
      // PRIVATE VC SYSTEM
      // ======================
      if (
        newState.channelId === CREATE_CHANNEL_ID &&
        oldState.channelId !== CREATE_CHANNEL_ID
      ) {
        await handlePrivateChannelCreation(member);
      }

      // ======================
      // JOIN VOICE
      // ======================
      if (!oldState.channelId && newState.channelId) {
        joinTimes.set(userId, Date.now());
        return;
      }

      // ======================
      // LEAVE VOICE
      // ======================
      if (oldState.channelId && !newState.channelId) {
        const joinedAt = joinTimes.get(userId);

        if (!joinedAt) return;

        const diffMs = Date.now() - joinedAt;
        const minutes = Math.floor(diffMs / 60000);

        joinTimes.delete(userId);

        // anti-abuse / AFK filter
        if (minutes < 1) return;

        // ======================
        // REWARDS
        // ======================
        addVoiceTime(userId, minutes);
        addCoins(userId, minutes * 10);

        console.log(
          `[VOICE] ${member.user.tag} -> ${minutes} min (+${minutes * 10} coins)`
        );
      }

      // ======================
      // SWITCH CHANNEL (IMPORTANT FIX)
      // ======================
      if (
        oldState.channelId &&
        newState.channelId &&
        oldState.channelId !== newState.channelId
      ) {
        // reset timer (prevents exploit farming)
        joinTimes.set(userId, Date.now());
      }

    } catch (err) {
      console.error("[VOICE STATE ERROR]", err);
    }
  }
};
