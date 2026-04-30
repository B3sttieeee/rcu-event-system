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

// --- KONFIGURACJA KOMENDY ---
const CONFIG = {
  COLOR: "#FFD700", // VYRN Gold
  CURRENCY_EMOJI: "<:CASHH:1491180511308157041>",
  THUMBNAIL_URL: "https://imgur.com/BCuOFX2.png",
  MAX_MENU_OPTIONS: 25 // Limit narzucony przez API Discorda
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("🛒 Access the official VYRN XP Boost Store"),

  /**
   * Wykonuje komendę /shop
   * @param {import('discord.js').CommandInteraction} interaction 
   */
  async execute(interaction) {
    try {
      // 1. Pobieranie balansu użytkownika
      const coins = economy.getCoins(interaction.user.id) || 0;
      const formattedCoins = economy.formatCoins(coins);

      // 2. Walidacja i generowanie opcji do menu sklepu
      const rawOptions = Array.isArray(SHOP_BOOSTS) ? SHOP_BOOSTS : [];
      
      const options = rawOptions
        .filter(b => b?.id && b?.name && b?.price && b?.durationText)
        .map(boost => {
          const boostValue = boost.multiplier || "2x";
          
          return {
            label: `${boost.name} (${boostValue} XP) • ${boost.durationText}`,
            description: `Price: ${economy.formatCoins(boost.price)} Coins`,
            value: String(boost.id),
            emoji: "⏳"
          };
        })
        .slice(0, CONFIG.MAX_MENU_OPTIONS); // Ścisłe zabezpieczenie limitu Discorda

      // Zabezpieczenie przed pustym sklepem
      if (options.length === 0) {
        return interaction.reply({
          content: "❌ **Store Update:** The store is currently out of stock or refreshing. Check back later!",
          flags: [MessageFlags.Ephemeral]
        });
      }

      // 3. Budowanie interfejsu Embed
      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR)
        .setAuthor({ 
          name: "VYRN HQ • PREMIUM STORE", 
          iconURL: interaction.guild?.iconURL({ dynamic: true }) || undefined 
        })
        .setTitle("⚡ TEMPORARY XP BOOSTS")
        .setDescription("Welcome to the marketplace. Purchase **limited-time** multipliers to accelerate your rank progression.")
        .addFields(
          {
            name: "🏦 Your Vault Balance",
            value: `> **${formattedCoins}** ${CONFIG.CURRENCY_EMOJI}`,
            inline: false
          },
          {
            name: "🛒 Available Time-Limited Boosters",
            value: "Select a booster below to activate it.\n*⚠️ Note: Multipliers start ticking immediately upon purchase.*",
            inline: false
          }
        )
        .setThumbnail(CONFIG.THUMBNAIL_URL)
        .setFooter({ text: "VYRN Clan • Time-Limited Economy" })
        .setTimestamp();

      // 4. Budowanie interaktywnego komponentu (Select Menu)
      const menu = new StringSelectMenuBuilder()
        .setCustomId("shop_select_boost")
        .setPlaceholder("🛒 Select a Time-Limited Boost...")
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(menu);

      // 5. Wysłanie odpowiedzi
      await interaction.reply({
        embeds: [embed],
        components: [row]
      });

    } catch (err) {
      console.error("🔥 [SHOP COMMAND ERROR]:", err);
      
      // Bezpieczna obsługa błędów (fallback)
      const errorMessage = {
        content: "❌ **Error:** Could not open the store. Please contact an administrator.",
        flags: [MessageFlags.Ephemeral]
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }
};
