const { Events } = require("discord.js");
const {
  handlePrivateChannelCreation
} = require("../utils/privateChannelSystem");

const CREATE_CHANNEL_ID = "1496280414237491220";

module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    try {
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      // DEBUG
      console.log(
        `[VOICE] ${member.user.tag} | ${oldState.channelId ?? "null"} -> ${newState.channelId ?? "null"}`
      );

      // user wszedł / przeniósł się na create channel
      if (
        newState.channelId === CREATE_CHANNEL_ID &&
        oldState.channelId !== CREATE_CHANNEL_ID
      ) {
        console.log(
          `[PRIVATE VC] Trigger create for ${member.user.tag}`
        );

        await handlePrivateChannelCreation(member);
      }
    } catch (err) {
      console.error("[VOICE STATE ERROR]", err);
    }
  }
};
