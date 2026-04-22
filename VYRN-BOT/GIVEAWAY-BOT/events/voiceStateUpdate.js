const { Events } = require("discord.js");

const { handlePrivateChannelCreation } = require("./privateChannelSystem");

module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    // wejście na kanał tworzenia
    const joinedCreate =
      !oldState.channel &&
      newState.channel &&
      newState.channel.id === "1496280414237491220";

    if (joinedCreate) {
      await handlePrivateChannelCreation(member);
      return;
    }
  }
};
