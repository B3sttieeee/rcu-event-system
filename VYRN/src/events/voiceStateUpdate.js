// src/events/voiceStateUpdate.js
const { Events, EmbedBuilder } = require("discord.js");
const privateVC = require("../systems/privatevc");
const voiceRewards = require("../systems/voiceRewards");
const { LOGS, sendLog } = require("../systems/log");

// ====================== CONFIG ======================
const CONFIG = {
  CREATOR_CHANNEL_ID: "1496280414237491220",
  THEME: {
    GOLD: "#FFD700",
    SUCCESS: "#00FF7F",
    DANGER: "#ff4757",
    BLUE: "#3b82f6"
  }
};

module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    try {
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      const oldChannel = oldState.channel;
      const newChannel = newState.channel;

      // === 1. PRIVATE VC CREATION SYSTEM ===
      if (newState.channelId === CONFIG.CREATOR_CHANNEL_ID) {
        console.log(`[PRIVATE VC] 👑 Triggering creation for ${member.user.tag}`);
        
        // Zatrzymujemy sesję XP, jeśli ktoś przechodzi z normalnego kanału do kreatora
        if (oldState.channelId) {
          voiceRewards.stopSession(member.id);
        }
        
        await privateVC.handlePrivateChannelCreation(member);
        return; // Zatrzymujemy kod - brak nagród za siedzenie w kanale "Create"
      }

      // === 2. VOICE REWARDS LOGIC & LOGGING ===
      
      // DOŁĄCZENIE DO KANAŁU (JOIN)
      if (!oldState.channelId && newState.channelId) {
        voiceRewards.startSession(member);
        
        await sendVoiceLog(member, CONFIG.THEME.SUCCESS, "📥 Joined Voice Channel", {
          name: "Channel", value: `${newChannel}`, inline: true
        });
      }

      // WYJŚCIE Z KANAŁU (LEAVE)
      else if (oldState.channelId && !newState.channelId) {
        voiceRewards.stopSession(member.id);
        
        await sendVoiceLog(member, CONFIG.THEME.DANGER, "🚪 Left Voice Channel", {
          name: "Previous Channel", value: `${oldChannel}`, inline: true
        });
      }

      // ZMIANA KANAŁU (SWITCH)
      else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        // Restartujemy sesję, aby zresetować timer przy zmianie kanału
        voiceRewards.stopSession(member.id);
        voiceRewards.startSession(member);
        
        await sendVoiceLog(member, CONFIG.THEME.GOLD, "🔄 Switched Voice Channel", [
          { name: "From", value: `${oldChannel}`, inline: true },
          { name: "To", value: `${newChannel}`, inline: true }
        ]);
      }

    } catch (err) {
      console.error("🔥 [VOICE STATE ERROR]", err);
    }
  }
};

// ====================== HELPER: VOICE LOGGING ======================
async function sendVoiceLog(member, color, actionTitle, fields) {
  // Bezpiecznik: jeśli system logów nie jest w pełni załadowany, unikamy crasha
  if (typeof sendLog !== "function") return; 

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ 
      name: `🎤 VYRN VOICE • ${actionTitle}`, 
      iconURL: member.user.displayAvatarURL({ dynamic: true }) 
    })
    .addFields(
      { name: "👤 Member", value: `${member} (\`${member.user.tag}\`)`, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: "Official VYRN Log System" });

  if (Array.isArray(fields)) {
    embed.addFields(fields);
  } else {
    embed.addFields([fields]);
  }

  await sendLog(member.guild, LOGS.VOICE, embed).catch(() => {});
}
