// src/commands/shop.js
const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder,
  MessageFlags 
} = require("discord.js");

const economy = require("../systems/economy");
const { SHOP_BOOSTS } = require("../systems/boost");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("🛒 Access the official VYRN XP Boost Store"),

  async execute(interaction) {
    // Pobieramy monety i formatujemy saldo
    const coins = economy.getCoins(interaction.user.id) || 0;
    const formattedCoins = economy.formatCoins(coins);

    const embed = new EmbedBuilder()
      .setColor("#FFD700") // VYRN Gold
      .setAuthor({ 
        name: "VYRN HQ • PREMIUM STORE", 
        iconURL: interaction.guild.iconURL({ dynamic: true }) 
      })
      .setTitle("⚡ TEMPORARY XP BOOSTS")
      .setDescription(
        `Welcome to the marketplace. Purchase **limited-time** multipliers to accelerate your rank progression.\n\n` +
        `💰 **Your Vault Balance:**\n` +
        `> **${formattedCoins}** <:CASHH:1491180511308157041>\n\n` +
        `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
        `**Available Time-Limited Boosters:**\n` +
        `Select a booster to activate it. Note: Multipliers start ticking immediately upon purchase.`
      )
      .setThumbnail("https://imgur.com/BCuOFX2.png")
      .setFooter({ text: "VYRN Clan • Time-Limited Economy" })
      .setTimestamp();

    // ================= DYNAMIC OPTIONS (Strictly Time-Based) =================
    const options = (SHOP_BOOSTS || [])
      .filter(b => b?.id && b?.name && b?.price && b?.durationText) // Wymuszamy nowe pole
      .map(boost => {
        const boostValue = boost.multiplier || "2x";
        
        return {
          // Format w liście np.: "Basic Surge (1.5x XP) • 15m"
          label: `${boost.name} (${boostValue} XP) • ${boost.durationText}`,
          description: `Price: ${economy.formatCoins(boost.price)} Coins`,
          value: String(boost.id),
          emoji: "⏳" // Podkreśla czasowość
        };
      });

    // Zabezpieczenie na wypadek braku boostów
    if (!options.length) {
      return interaction.reply({
        content: "❌ **The store is currently out of stock.** Check back later!",
        flags: [MessageFlags.Ephemeral]
      });
    }

    // Limit Discorda to 25 opcji, my mamy równo 24 (4 mnożniki * 6 czasów), więc wchodzi idealnie
    const menu = new StringSelectMenuBuilder()
      .setCustomId("shop_select_boost")
      .setPlaceholder("🛒 Select a Time-Limited Boost...")
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }
};
