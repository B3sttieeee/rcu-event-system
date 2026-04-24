const { handlePrivateChannelCreation } = require("../systems/privatevc");
const { addVoiceTime } = require("../systems/profile");
const { addCoins } = require("../systems/economy");

const CREATE_CHANNEL_ID = "1496280414237491220";

const joinTimes = new Map();

module.exports = {
  name: "voiceStateUpdate",

  async execute(oldState, newState) {
    try {
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      const userId = member.id;

      if (
        newState.channelId === CREATE_CHANNEL_ID &&
        oldState.channelId !== CREATE_CHANNEL_ID
      ) {
        await handlePrivateChannelCreation(member);
      }

      if (!oldState.channelId && newState.channelId) {
        joinTimes.set(userId, Date.now());
        return;
      }

      if (oldState.channelId && !newState.channelId) {
        const joinedAt = joinTimes.get(userId);
        if (!joinedAt) return;

        const diff = Date.now() - joinedAt;

        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return;

        joinTimes.delete(userId);

        // 🔥 FIX: voice system EXPECTS SECONDS, not minutes
        addVoiceTime(userId, minutes * 60);

        addCoins(userId, minutes * 10);
      }

      if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        joinTimes.set(userId, Date.now());
      }

    } catch (err) {
      console.error("[VOICE ERROR]", err);
    }
  }
};
