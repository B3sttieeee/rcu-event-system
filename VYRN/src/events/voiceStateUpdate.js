// src/events/voiceStateUpdate.js
const { handlePrivateChannelCreation } = require("../systems/privatevc");
const { addVoiceTime } = require("../systems/profile");   // <--- DODANE

const CREATE_CHANNEL_ID = "1496280414237491220";

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState) {
    try {
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      // ==================== PRIVATE VC CREATION ====================
      if (newState.channelId === CREATE_CHANNEL_ID && oldState.channelId !== CREATE_CHANNEL_ID) {
        console.log(`[PRIVATE VC] Trigger create for ${member.user.tag}`);
        await handlePrivateChannelCreation(member);
      }

      // ==================== VOICE TIME TRACKING ====================
      // Jeśli użytkownik wszedł na dowolny kanał głosowy (i nie jest to kanał do tworzenia prywatnego)
      if (newState.channelId && newState.channelId !== CREATE_CHANNEL_ID) {
        // Sprawdza czy przedtem nie był na voice (czyli właśnie wszedł lub zmienił kanał)
        if (!oldState.channelId || oldState.channelId !== newState.channelId) {
          console.log(`[VOICE] ${member.user.tag} wszedł na voice channel`);
          // Tutaj możesz dodać addVoiceTime jeśli chcesz naliczać natychmiast, ale lepiej zostawić w loopie w level
        }
      }

      // Jeśli wyszedł z voice channel
      if (oldState.channelId && !newState.channelId) {
        console.log(`[VOICE] ${member.user.tag} wyszedł z voice channel`);
      }

    } catch (err) {
      console.error("[VOICE STATE ERROR]", err);
    }
  }
};
