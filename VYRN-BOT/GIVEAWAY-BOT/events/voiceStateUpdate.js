const { Events } = require("discord.js");

const {
  handlePrivateChannelCreation
} = require("../utils/privateChannelSystem");

module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    if (
      !oldState.channel &&
      newState.channel &&
      newState.channel.id === "1496280414237491220"
    ) {
      await handlePrivateChannelCreation(member);
    }
  }
};
