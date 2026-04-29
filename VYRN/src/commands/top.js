// src/commands/top.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../systems/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("top")
    .setDescription("🏆 View the Top 10 Wealthiest Members"),

  async execute(interaction) {
    try {
      // Pobieramy szerszą listę, żeby móc znaleźć pozycję użytkownika poza top 10
      const allTop = economy.getTopUsers(100); 
      const top10 = allTop.slice(0, 10);

      if (top10.length === 0) {
        return interaction.reply({
          content: "❌ No one has earned any coins yet.",
          ephemeral: true
        });
      }

      const medals = ["🥇", "🥈", "🥉"];
      
      // Budowanie opisu rankingu
      const leaderboard = top10.map((entry, i) => {
        const position = medals[i] || `\`#${i + 1}\``;
        // Wyróżnienie podium pogrubieniem
        const isPodium = i < 3;
        const line = `${position} <@${entry.userId}> ➔ **${economy.formatCoins(entry.coins)}** <:CASHH:1491180511308157041>`;
        return isPodium ? `**${line}**` : line;
      }).join("\n");

      // Szukanie pozycji użytkownika
      const userPos = allTop.findIndex(e => e.userId === interaction.user.id) + 1;
      const userEntry = allTop.find(e => e.userId === interaction.user.id);
      const userRankText = userPos > 0 
        ? `Your Rank: **#${userPos}** with **${economy.formatCoins(userEntry.coins)}** coins` 
        : "You are not ranked yet.";

      const embed = new EmbedBuilder()
        .setColor("#FFD700") // VYRN Gold
        .setAuthor({ 
          name: "VYRN HQ • WEALTH LEADERBOARD", 
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        })
        .setTitle("🏆 TOP 10 RICHEST MEMBERS")
        .setDescription(
          `The most dedicated and wealthiest grinders in **VYRN CLAN**.\n\n` +
          `${leaderboard}\n\n` +
          `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
          `${userRankText}`
        )
        .setThumbnail(interaction.guild?.iconURL({ dynamic: true }))
        .setFooter({ text: "VYRN Clan • Prestige Economy System" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error("🔥 [TOP COMMAND ERROR]", err);
      await interaction.reply({
        content: "❌ **Error:** Failed to load the leaderboard. Try again later.",
        ephemeral: true
      });
    }
  }
};
