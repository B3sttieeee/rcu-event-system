const { addVoiceTime } = require("../systems/profile");
const { addCoins } = require("../systems/economy");
const { handleMessageXP } = require("../systems/level");

const joinTimes = new Map();

module.exports = {
  name: "voiceStateUpdate",

  async execute(oldState, newState) {
    try {
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      const userId = member.id;

      // JOIN
      if (!oldState.channelId && newState.channelId) {
        joinTimes.set(userId, Date.now());
        return;
      }

      // LEAVE
      if (oldState.channelId && !newState.channelId) {
        const joinedAt = joinTimes.get(userId);
        if (!joinedAt) return;

        const minutes = Math.floor((Date.now() - joinedAt) / 60000);

        joinTimes.delete(userId);

        if (minutes < 1) return;

        addVoiceTime(userId, minutes);
        addCoins(userId, minutes * 10);

        // VOICE XP BONUS
        await handleMessageXP(member, `voice-${minutes}`);
      }

      // SWITCH CHANNEL
      if (
        oldState.channelId &&
        newState.channelId &&
        oldState.channelId !== newState.channelId
      ) {
        joinTimes.set(userId, Date.now());
      }

    } catch (err) {
      console.error("[VOICE ERROR]", err);
    }
  }
};
