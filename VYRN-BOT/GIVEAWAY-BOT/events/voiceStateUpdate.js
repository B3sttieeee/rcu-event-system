const { Events } = require("discord.js");
const { handlePrivateChannelCreation } = require("../utils/privateChannelSystem");

const CREATE_CHANNEL_ID = "1496280414237491220";

module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    if (
      newState.channel &&
      newState.channel.id === CREATE_CHANNEL_ID &&
      oldState.channel?.id !== CREATE_CHANNEL_ID
    ) {
      await handlePrivateChannelCreation(member);
    }
  }
};
