// src/systems/recruitment/index.js
const { EmbedBuilder } = require("discord.js");

// ====================== CONFIG ======================
const CONFIG = {
  CHANNEL_ID: "1499016088770445442",
  IMAGE_URL: "https://imgur.com/TLYdwaQ.png",
  THEME: {
    GOLD: "#FFD700"
  }
};

/**
 * VYRN HQ • RECRUITMENT SYSTEM
 * Automatycznie zarządza głównym ogłoszeniem rekrutacyjnym na kanale.
 */
async function init(client) {
  console.log("📢 [VYRN HQ] Initializing Recruitment System...");

  try {
    // Pobieranie kanału
    const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
    if (!channel) {
      console.warn(`[RECRUITMENT] ⚠️ Cannot find channel ID: ${CONFIG.CHANNEL_ID}. Make sure the ID is correct and the bot has access.`);
      return;
    }

    // Budowanie minimalistycznego Embedu (Idealnego do przesyłania dalej)
    const embed = new EmbedBuilder()
      .setColor(CONFIG.THEME.GOLD)
      .setTitle("🔍 LOOKING FOR PLAYERS")
      .setDescription(
        `> **Join one of the most prestigious clans!** We are currently looking for active and dedicated players.\n\n` +
        
        `📊 **\`CLAN VYRN STATS\`**\n` +
        `> 🔄 **Total Rebirth:** \`2.14de\`\n` +
        `> 👥 **Players:** \`13/25\`\n` +
        `> 🏆 **Prestige:** \`9/14\`\n\n` +
        
        `🎯 **\`REQUIREMENTS\`**\n` +
        `> 📈 **Power:** \`75N+\`\n` +
        `> 🤝 **Team:** \`Good Team\`\n` +
        `> 🎟️ **GamePasses:** \`Pet Equip\` / \`For Eggs\`\n\n` +
        
        `🎁 **\`WHAT WE OFFER\`**\n` +
        `> 🛡️ **Perfect Discord** with Custom System Information\n` +
        `> 🐝 **Live Events** (Like Honey Merchant tracking)\n` +
        `> 👨‍👩‍👧‍👦 **Family Friendly** & Toxic-Free Environment\n\n` +
        
        `📩 **\`HOW TO JOIN?\`**\n` +
        `> **DM one of the HQ Managers for an invite:**\n` +
        `> <@1097138975786946620> ┃ <@1241774952160432159> ┃ <@1183585370219233341>`
      )
      .setImage(CONFIG.IMAGE_URL);
      
      // CELOWO USUNIĘTO: setFooter, setTimestamp oraz setAuthor
      // Dzięki temu Discord potraktuje to jako "lekką" wiadomość, którą łatwiej przesyłać!

    // Sprawdzanie, czy bot już wysłał ogłoszenie (żeby nie spamować przy każdym restarcie)
    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    const botMessage = messages?.find(m => m.author.id === client.user.id);

    if (botMessage) {
      // Jeśli wiadomość już tam jest, tylko ją aktualizuje
      await botMessage.edit({ embeds: [embed] });
      console.log("✅ [RECRUITMENT] Ogłoszenie zaktualizowane (Czysta wersja).");
    } else {
      // Jeśli kanał jest pusty lub bot nie ma tam wiadomości, wysyła nową
      await channel.send({ embeds: [embed] });
      console.log("✅ [RECRUITMENT] Ogłoszenie pomyślnie wysłane (Czysta wersja).");
    }

  } catch (error) {
    console.error("🔥 [RECRUITMENT SYSTEM ERROR]:", error);
  }
}

module.exports = { init };
