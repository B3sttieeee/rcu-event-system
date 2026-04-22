const { Events } = require("discord.js");
const { handlePrivateChannelCreation } = require("../utils/privateChannelSystem");

const CREATE_CHANNEL_ID = "1496280414237491220";

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    console.log(`[VoiceDebug] ${member.user.tag} | ${oldState.channel?.id || 'none'} → ${newState.channel?.id || 'none'}`);

    if (!oldState.channel && newState.channel && newState.channel.id === CREATE_CHANNEL_ID) {
      console.log(`[PrivateChannel] ROZPOCZYNAM TWORZENIE dla ${member.user.tag}`);
      await handlePrivateChannelCreation(member);
    }
  }
};
