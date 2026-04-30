// src/systems/recruitment/index.js
const { EmbedBuilder } = require("discord.js");

// ====================== CONFIG ======================
const CONFIG = {
  CHANNEL_ID: "1499016088770445442",
  // Twój link z media.discordapp.net:
  IMAGE_URL: "https://media.discordapp.net/attachments/1490033478501273830/1498423816072986785/ezgif.com-crop.gif?ex=69f3be6d&is=69f26ced&hm=027a456c2c5964c2681ec0718fd03dd5cdcdd6825ad012019fbdb1fa19d0bdca&=&width=360&height=88",
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

    // Budowanie Embedu (BEZ TITLE, żeby Discord go nie blokował przy forwardowaniu)
    const embed = new EmbedBuilder()
      .setColor(CONFIG.THEME.GOLD)
      // Wszystko leci do Description, dokładnie tak jak na Twoim screenie!
      .setDescription(
        `🔍 **LOOKING FOR PLAYERS**\n` +
        `> **Join one of the most prestigious clans!** We are currently looking for active and dedicated players.\n\n` +
        
        `📊 **CLAN VYRN STATS**\n` +
        `> 🔄 **Total Rebirth:** 2.14de\n` +
        `> 👥 **Players:** 13/25\n` +
        `> 🏆 **Prestige:** 9/14\n\n` +
        
        `🎯 **REQUIREMENTS**\n` +
        `> 📈 **Power:** 75N+\n` +
        `> 🤝 **Team:** Good Team\n` +
        `> 🎟️ **GamePasses:** Pet Equip / For Eggs\n\n` +
        
        `🎁 **WHAT WE OFFER**\n` +
        `> 🛡️ **Perfect Discord** with Custom System Information\n` +
        `> 🐝 **Live Events** (Like Honey Merchant tracking)\n` +
        `> 👨‍👩‍👧‍👦 **Family Friendly** & Toxic-Free Environment\n\n` +
        
        `📩 **HOW TO JOIN?**\n` +
        `> **DM one of the HQ Managers for an invite:**\n` +
        `> <@1097138975786946620> ┃ <@1241774952160432159> ┃ <@1183585370219233341>`
      )
      .setImage(CONFIG.IMAGE_URL); // Zdjęcie ląduje idealnie wewnątrz Embedu

    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    const botMessage = messages?.find(m => m.author.id === client.user.id);

    if (botMessage) {
      await botMessage.edit({ embeds: [embed] });
      console.log("✅ [RECRUITMENT] Ogłoszenie zaktualizowane (Wersja 1:1 ze screenem).");
    } else {
      await channel.send({ embeds: [embed] });
      console.log("✅ [RECRUITMENT] Ogłoszenie pomyślnie wysłane.");
    }

  } catch (error) {
    console.error("🔥 [RECRUITMENT ERROR]:", error);
  }
}

module.exports = { init };
