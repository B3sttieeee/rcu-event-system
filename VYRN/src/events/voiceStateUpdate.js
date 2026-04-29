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
        
        // Stop session if moving from another channel to creator
        if (oldState.channelId) {
          voiceRewards.stopSession(member.id);
        }
        
        await privateVC.handlePrivateChannelCreation(member);
        return; // Stop here - don't reward for being in the "Creator" channel
      }

      // === 2. VOICE REWARDS LOGIC (Anti-AFK Integrated) ===
      
      // JOINED A CHANNEL
      if (!oldState.channelId && newState.channelId) {
        // Only start rewards if not muted/deafened (Optional - promotes active talking)
        const isAfk = newState.selfDeaf || newState.selfMute;
        
        voiceRewards.startSession(member);
        
        await sendVoiceLog(member, CONFIG.THEME.SUCCESS, "📥 Joined Voice Channel", {
          name: "Channel", value: `${newChannel}`, inline: true
        });
      }

      // LEFT A CHANNEL
      else if (oldState.channelId && !newState.channelId) {
        voiceRewards.stopSession(member.id);
        
        await sendVoiceLog(member, CONFIG.THEME.DANGER, "🚪 Left Voice Channel", {
          name: "Previous Channel", value: `${oldChannel}`, inline: true
        });
      }

      // SWITCHED CHANNELS
      else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        voiceRewards.stopSession(member.id);
        voiceRewards.startSession(member);
        
        await sendVoiceLog(member, CONFIG.THEME.GOLD, "🔄 Switched Voice Channel", [
          { name: "From", value: `${oldChannel}`, inline: true },
          { name: "To", value: `${newChannel}`, inline: true }
        ]);
      }

      // === 3. MUTE/DEAF STATE LOGGING (Optional) ===
      if (oldState.selfMute !== newState.selfMute || oldState.selfDeaf !== newState.selfDeaf) {
        // You can add logic here to pause XP if they mute themselves
        if (newState.selfMute || newState.selfDeaf) {
            // voiceRewards.pauseSession(member.id); // If your system supports pausing
        }
      }

    } catch (err) {
      console.error("🔥 [VOICE STATE ERROR]", err);
    }
  }
};

// ====================== HELPER: VOICE LOGGING ======================
async function sendVoiceLog(member, color, actionTitle, fields) {
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

  await sendLog(member.guild, LOGS.VOICE, embed);
}
