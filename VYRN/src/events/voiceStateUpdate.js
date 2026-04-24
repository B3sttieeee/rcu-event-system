// =====================================================
// VOICE STATE UPDATE - INTEGRATED WITH PRIVATE VC
// =====================================================
const { Events } = require("discord.js");
const privateVC = require("../systems/privatevc");

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    try {
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      const oldChannel = oldState.channelId;
      const newChannel = newState.channelId;

      // === PRIVATE VC CREATE ===
      if (!oldChannel && newChannel && newChannel === "1496280414237491220") {
        await privateVC.handlePrivateChannelCreation(member);
        return;
      }

      // Opcjonalnie: logi
      if (!oldChannel && newChannel) {
        console.log(`[VOICE JOIN] ${member.user.tag}`);
      } else if (oldChannel && !newChannel) {
        console.log(`[VOICE LEAVE] ${member.user.tag}`);
      } else if (oldChannel && newChannel && oldChannel !== newChannel) {
        console.log(`[VOICE SWITCH] ${member.user.tag}`);
      }
    } catch (err) {
      console.error("[VOICE STATE ERROR]", err);
    }
  }
};
