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

      // PRIVATE VC
      if (
        newState.channelId === CREATE_CHANNEL_ID &&
        oldState.channelId !== CREATE_CHANNEL_ID
      ) {
        await handlePrivateChannelCreation(member);
      }

      // WEJŚCIE NA VOICE
      if (!oldState.channelId && newState.channelId) {
        joinTimes.set(member.id, Date.now());
        console.log(`[VOICE] ${member.user.tag} wszedł`);
      }

      // WYJŚCIE Z VOICE
      if (oldState.channelId && !newState.channelId) {
        const joined = joinTimes.get(member.id);

        if (joined) {
          const minutes = Math.floor((Date.now() - joined) / 60000);

          if (minutes > 0) {
            addVoiceTime(member.id, minutes);
            addCoins(member.id, minutes * 10);
          }

          joinTimes.delete(member.id);
        }

        console.log(`[VOICE] ${member.user.tag} wyszedł`);
      }

    } catch (err) {
      console.error("[VOICE STATE ERROR]", err);
    }
  }
};
