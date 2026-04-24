// =====================================================
// VOICE STATE UPDATE - ONLY PRIVATE VC + REWARDS TRIGGER
// =====================================================
const { Events } = require("discord.js");
const privateVC = require("../systems/privatevc");
const voiceRewards = require("../systems/voiceRewards");

module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    try {
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      const oldChannel = oldState.channelId;
      const newChannel = newState.channelId;

      // === PRIVATE VC CREATION ===
      if (!oldChannel && newChannel && newChannel === "1496280414237491220") {
        console.log(`[PRIVATE VC] Trigger create for ${member.user.tag}`);
        await privateVC.handlePrivateChannelCreation(member);
        return;
      }

      // === NORMAL VOICE REWARDS (XP + Coins + Voice Time) ===
      if (!oldChannel && newChannel) {
        voiceRewards.startSession(member);
      } 
      else if (oldChannel && !newChannel) {
        voiceRewards.stopSession(member.id);
        console.log(`[VOICE LEAVE] ${member.user.tag}`);
      } 
      else if (oldChannel && newChannel && oldChannel !== newChannel) {
        voiceRewards.stopSession(member.id);
        voiceRewards.startSession(member);
        console.log(`[VOICE SWITCH] ${member.user.tag}`);
      }
    } catch (err) {
      console.error("[VOICE STATE ERROR]", err);
    }
  }
};
