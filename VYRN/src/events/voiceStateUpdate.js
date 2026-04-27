// =====================================================
// VOICE STATE UPDATE - FIXED & STABLE
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
      // Sprawdzamy tylko, czy NOWY kanał to kreator, niezależnie skąd przychodzi
      if (newChannel === "1496280414237491220") {
        console.log(`[PRIVATE VC] Trigger create for ${member.user.tag}`);
        
        // Jeśli przyszedł z innego kanału, zatrzymujemy mu dotychczasowe naliczanie czasu
        if (oldChannel) {
            voiceRewards.stopSession(member.id);
        }
        
        await privateVC.handlePrivateChannelCreation(member);
        return; // Zatrzymujemy dalsze wykonywanie - nie chcemy naliczać XP za kanał "Kreator"
      }

      // === NORMAL VOICE REWARDS (XP + Coins + Voice Time) ===
      if (!oldChannel && newChannel) {
        // Dołączenie z "zewnątrz"
        voiceRewards.startSession(member);
      } 
      else if (oldChannel && !newChannel) {
        // Całkowite wyjście z VC
        voiceRewards.stopSession(member.id);
        console.log(`[VOICE LEAVE] ${member.user.tag}`);
      } 
      else if (oldChannel && newChannel && oldChannel !== newChannel) {
        // Przejście między zwykłymi kanałami (np. z kanału 1 na kanał 2, lub do nowo stworzonego prywatnego)
        voiceRewards.stopSession(member.id);
        voiceRewards.startSession(member);
        console.log(`[VOICE SWITCH] ${member.user.tag}`);
      }
    } catch (err) {
      console.error("[VOICE STATE ERROR]", err);
    }
  }
};
