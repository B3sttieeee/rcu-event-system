// src/commands/shop.js
const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder 
} = require("discord.js");

const economy = require("../systems/economy");
const { SHOP_BOOSTS } = require("../systems/boost");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("🛒 Access the official VYRN XP Boost Store"),

  async execute(interaction) {
    // Pobieramy monety przy użyciu naszej nowej funkcji formatowania
    const coins = economy.getCoins(interaction.user.id) || 0;
    const formattedCoins = economy.formatCoins(coins);

    const embed = new EmbedBuilder()
      .setColor("#FFD700") // VYRN Gold
      .setAuthor({ 
        name: "VYRN HQ • PREMIUM STORE", 
        iconURL: interaction.guild.iconURL({ dynamic: true }) 
      })
      .setTitle("⚡ XP BOOST MARKETPLACE")
      .setDescription(
        `Welcome to the official shop. Enhance your progression speed by purchasing powerful XP multipliers.\n\n` +
        `💰 **Your Vault Balance:**\n` +
        `> **${formattedCoins}** <:CASHH:1491180511308157041>\n\n` +
        `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
        `**Available Boosters:**\n` +
        `Select an item from the menu below to view details and purchase. Boosts activate automatically upon purchase.`
      )
      .setThumbnail("https://imgur.com/BCuOFX2.png") // Twój banner lub ikona klanu
      .setFooter({ text: "VYRN Clan • Prestige Economy System" })
      .setTimestamp();

    // ================= DYNAMIC OPTIONS =================
    // Mapujemy boosty z systemu, dodając im prestiżowy wygląd w menu
    const options = (SHOP_BOOSTS || [])
      .filter(b => b?.id && b?.name && b?.price)
      .map(boost => {
        const boostValue = boost.multiplier || "2x"; // Fallback jeśli nie ma mnożnika w obiekcie
        const duration = boost.durationHours ? `${boost.durationHours}h` : "Permanent";
        
        return {
          label: `${boost.name} (${boostValue} Boost)`,
          description: `Price: ${economy.formatCoins(boost.price)} | Duration: ${duration}`,
          value: String(boost.id),
          emoji: "🚀"
        };
      });

    if (!options.length) {
      return interaction.reply({
        content: "❌ **The store is currently empty.** Please check back later!",
        ephemeral: true
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId("shop_select_boost")
      .setPlaceholder("🛒 Choose your boost...")
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);

    // Wysyłamy interakcję (może być ephemeral: true jeśli chcesz, żeby sklep był prywatny)
    return interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }
};
