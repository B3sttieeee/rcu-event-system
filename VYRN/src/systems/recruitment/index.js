// src/systems/recruitment/index.js
const { EmbedBuilder } = require("discord.js");

// ====================== CONFIG ======================
const CONFIG = {
  CHANNEL_ID: "1499016088770445442",
  IMAGE_URL: "https://i.imgur.com/sJzNIT3.png",
  THEME: {
    GOLD: "#FFD700"
  }
};

/**
 * VYRN HQ • RECRUITMENT SYSTEM (SIMPLE EDITION)
 * System po prostu wysyła nową, osobną wiadomość na kanał.
 */
async function init(client) {
  console.log("📢 [VYRN HQ] Sending recruitment message...");

  try {
    const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
    if (!channel) return;

    // Budowanie zwykłego, klasycznego Embedu
    const embed = new EmbedBuilder()
      .setColor(CONFIG.THEME.GOLD)
      .setTitle("🔍 LOOKING FOR PLAYERS")
      .setDescription(
        `**Join one of the most prestigious clans!** We are currently looking for active and dedicated players.\n\n` +
        
        `📊 **CLAN VYRN STATS**\n` +
        `🔄 **Total Rebirth:** 2.14de\n` +
        `👥 **Players:** 13/25\n` +
        `🏆 **Prestige:** 9/14\n\n` +
        
        `🎯 **REQUIREMENTS**\n` +
        `📈 **Power:** 75N+\n` +
        `🤝 **Team:** Good Team\n` +
        `🎟️ **GamePasses:** Pet Equip / For Eggs\n\n` +
        
        `🎁 **WHAT WE OFFER**\n` +
        `🛡️ **Perfect Discord** with Custom System Information\n` +
        `🐝 **Live Events** (Like Honey Merchant tracking)\n` +
        `👨‍👩‍👧‍👦 **Family Friendly** & Toxic-Free Environment\n\n` +
        
        `📩 **HOW TO JOIN?**\n` +
        `**DM one of the HQ Managers for an invite:**\n` +
        `<@1097138975786946620> ┃ <@1241774952160432159> ┃ <@1183585370219233341>`
      )
      .setImage(CONFIG.IMAGE_URL);

    // WYSYŁANIE JAKO OSOBNA, ZWYKŁA WIADOMOŚĆ (BEZ EDYCJI)
    await channel.send({ embeds: [embed] });
    
    console.log("✅ [RECRUITMENT] Wysłano nową, osobną wiadomość.");

  } catch (error) {
    console.error("🔥 [RECRUITMENT SYSTEM ERROR]:", error);
  }
}

module.exports = { init };
