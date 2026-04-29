// src/commands/balance.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../systems/economy");
const activity = require("../systems/activity");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("💰 Check yours or another member's vault balance")
    .addUserOption(option => 
      option.setName("target")
        .setDescription("The member whose balance you want to check")
        .setRequired(false)),

  async execute(interaction) {
    try {
      // Pobieramy użytkownika (jeśli brak opcji, sprawdzamy siebie)
      const targetUser = interaction.options.getUser("target") || interaction.user;
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ This command can only be used within the VYRN HQ server.",
          ephemeral: true
        });
      }

      // Pobieranie danych
      const coins = economy.getCoins(targetUser.id);
      const levelData = activity.getLevelData(targetUser.id);
      const rank = activity.getRank(levelData.level);

      const embed = new EmbedBuilder()
        .setColor("#FFD700") // VYRN Gold
        .setAuthor({ 
          name: `VYRN HQ • FINANCIAL REPORT`, 
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        })
        .setTitle(`${targetUser.username}'s Personal Vault`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .setDescription(
          `**Vault Status:** Secure ✅\n` +
          `**Clan Standing:** ${rank.emoji} \`${rank.name}\` (Level ${levelData.level})\n\n` +
          `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
          `💰 **CURRENT BALANCE**\n` +
          `> **${economy.formatCoins(coins)}** <:CASHH:1491180511308157041>\n\n` +
          `🏦 **ESTIMATED NET WORTH**\n` +
          `> **${economy.formatCoins(coins)}** coins in liquid assets.\n\n` +
          `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`
        )
        .setFooter({ 
          text: `Inquiry by ${interaction.user.tag}`, 
          iconURL: interaction.user.displayAvatarURL() 
        })
        .setTimestamp();

      // Jeśli sprawdzasz kogoś innego, dodaj info
      const content = targetUser.id === interaction.user.id ? "" : `Viewing financial data for ${targetUser}...`;

      return interaction.reply({
        content: content || null,
        embeds: [embed]
      });

    } catch (err) {
      console.error("🔥 [BALANCE COMMAND ERROR]:", err);

      if (!interaction.replied) {
        return interaction.reply({
          content: "❌ **Error:** Could not retrieve vault data. Please try again.",
          ephemeral: true
        });
      }
    }
  }
};
