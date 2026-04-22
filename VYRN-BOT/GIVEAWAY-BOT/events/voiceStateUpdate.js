const { Events } = require("discord.js");

// poprawna ścieżka do utils
const {
  handlePrivateChannelCreation
} = require("../utils/privateChannelSystem");

const CREATE_CHANNEL_ID = "1496280414237491220";

module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    const oldChannel = oldState.channel;
    const newChannel = newState.channel;

    // join create channel only once
    const joinedCreate =
      newChannel &&
      newChannel.id === CREATE_CHANNEL_ID &&
      oldChannel?.id !== CREATE_CHANNEL_ID;

    if (!joinedCreate) return;

    try {
      await handlePrivateChannelCreation(member);
    } catch (err) {
      console.error("[VOICE SYSTEM ERROR]", err);
    }
  }
};
