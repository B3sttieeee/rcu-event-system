// src/commands/balance.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const economy = require("../systems/economy");
const activity = require("../systems/activity");

// --- KONFIGURACJA KOMENDY ---
const CONFIG = {
  COLOR: "#FFD700", // VYRN Gold
  CURRENCY_EMOJI: "<:CASHH:1491180511308157041>",
  THUMBNAIL_SIZE: 256
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("💰 Check yours or another member's vault balance")
    .addUserOption(option => 
      option.setName("target")
        .setDescription("The member whose balance you want to check")
        .setRequired(false)
    ),

  /**
   * Wykonuje komendę /balance
   * @param {import('discord.js').CommandInteraction} interaction 
   */
  async execute(interaction) {
    try {
      // 1. Zabezpieczenie przed użyciem na DM (Musi być na samym początku!)
      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ This command can only be used within the VYRN HQ server.",
          flags: [MessageFlags.Ephemeral]
        });
      }

      // 2. Identyfikacja celu
      const targetUser = interaction.options.getUser("target") || interaction.user;

      // 3. Pobieranie danych (z wartościami domyślnymi w razie braku danych)
      const coins = economy.getCoins(targetUser.id) || 0;
      const formattedCoins = economy.formatCoins(coins);
      
      const levelData = activity.getLevelData(targetUser.id) || { level: 0 };
      const rank = activity.getRank(levelData.level) || { emoji: "🔰", name: "Unranked" };

      // 4. Budowanie interfejsu (Embed)
      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR)
        .setAuthor({ 
          name: "VYRN HQ • FINANCIAL REPORT", 
          iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined 
        })
        .setTitle(`${targetUser.username}'s Personal Vault`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: CONFIG.THUMBNAIL_SIZE }))
        .setDescription("**Vault Status:** Secure ✅\nBelow is the official financial statement for this member.")
        .addFields(
          {
            name: "🎖️ Clan Standing",
            value: `> ${rank.emoji} \`${rank.name}\` (Level ${levelData.level})`,
            inline: false
          },
          {
            name: "💰 Liquid Balance",
            value: `> **${formattedCoins}** ${CONFIG.CURRENCY_EMOJI}`,
            inline: true // Ustawione obok Net Worth
          },
          {
            name: "🏦 Net Worth",
            value: `> **${formattedCoins}** ${CONFIG.CURRENCY_EMOJI}\n*Currently tracking liquid assets only.*`,
            inline: true // Ustawione obok Liquid Balance
          }
        )
        .setFooter({ 
          text: `Inquiry by ${interaction.user.tag}`, 
          iconURL: interaction.user.displayAvatarURL() 
        })
        .setTimestamp();

      // 5. Dodatkowy komunikat, jeśli sprawdzamy kogoś innego
      const contentMessage = targetUser.id === interaction.user.id 
        ? null 
        : `🕵️‍♂️ Viewing official financial data for <@${targetUser.id}>...`;

      // 6. Wysłanie odpowiedzi
      await interaction.reply({
        content: contentMessage,
        embeds: [embed]
      });

    } catch (err) {
      console.error("🔥 [BALANCE COMMAND ERROR]:", err);

      // Bezpieczna obsługa błędów z wykorzystaniem nowych flag Discord.js
      const errorMessage = {
        content: "❌ **Error:** Could not retrieve vault data. Please try again.",
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
