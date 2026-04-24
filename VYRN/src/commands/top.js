const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getTopUsers } = require("../systems/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("top")
    .setDescription("🏆 Economy leaderboard (richest players)"),

  async execute(interaction) {
    try {
      // ================= SAFE LOAD =================
      const top = getTopUsers ? getTopUsers(10) : [];

      console.log("[TOP DEBUG] raw data:", top);

      const medals = ["🥇", "🥈", "🥉"];

      // ================= BUILD LIST =================
      const description = Array.isArray(top) && top.length > 0
        ? top.map((u, i) => {
            if (!u || !u.userId) return null;

            const medal = medals[i] || `#${i + 1}`;
            const coins = Number(u.coins ?? 0);

            return `${medal} <@${u.userId}> • **${coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>`;
          }).filter(Boolean).join("\n")
        : "❌ Brak danych w economy";

      // ================= EMBED =================
      const embed = new EmbedBuilder()
        .setColor("#0b0b0f")
        .setTitle("🏆 Economy Leaderboard")
        .setDescription(
          `**Top richest players**\n\n${description}`
        )
        .setThumbnail(interaction.guild?.iconURL() || null)
        .setFooter({
          text: "VYRN Economy System"
        })
        .setTimestamp();

      // ================= RESPONSE =================
      return await interaction.reply({
        embeds: [embed]
      });

    } catch (err) {
      console.error("[TOP COMMAND ERROR]", err);

      return interaction.reply({
        content: "❌ TOP command crashed (check console)",
        ephemeral: true
      });
    }
  }
};
