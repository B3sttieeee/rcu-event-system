// src/systems/recruitment/index.js
const { EmbedBuilder } = require("discord.js");

// ====================== CONFIG ======================
const CONFIG = {
  CHANNEL_ID: "1499016088770445442",
  IMAGE_URL: "https://cdn.discordapp.com/attachments/1499016088770445442/1499204343478620222/ezgif.com-animated-gif-maker_6.gif?ex=69f3f259&is=69f2a0d9&hm=d403114c2f3a7dfe882db063eb4e31a84402a88bd259485b7686ddde8fe9cf31&",
  THEME: {
    GOLD: "#FFD700"
  }
};

/**
 * VYRN HQ • RECRUITMENT SYSTEM
 */
async function init(client) {
  console.log("📢 [VYRN HQ] Initializing Recruitment System...");

  try {
    const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
    if (!channel) return;

    // Budowanie Embedu (Bez strzałek blockquote)
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

    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    const botMessage = messages?.find(m => m.author.id === client.user.id);

    if (botMessage) {
      await botMessage.edit({ embeds: [embed] });
      console.log("✅ [RECRUITMENT] Ogłoszenie zaktualizowane (Test bez blockquote).");
    } else {
      await channel.send({ embeds: [embed] });
      console.log("✅ [RECRUITMENT] Ogłoszenie pomyślnie wysłane.");
    }

  } catch (error) {
    console.error("🔥 [RECRUITMENT SYSTEM ERROR]:", error);
  }
}

module.exports = { init };
