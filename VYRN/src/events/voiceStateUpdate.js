// src/events/voiceStateUpdate.js
const { handlePrivateChannelCreation } = require("../systems/privatevc");

const CREATE_CHANNEL_ID = "1496280414237491220";

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState) {
    try {
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      if (newState.channelId === CREATE_CHANNEL_ID && oldState.channelId !== CREATE_CHANNEL_ID) {
        await handlePrivateChannelCreation(member);
      }
    } catch (err) {
      console.error("[VOICE STATE ERROR]", err);
    }
  }
};
