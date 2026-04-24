const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getCoins } = require("../systems/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("💰 Check your wallet balance"),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ This command only works in servers.",
          ephemeral: true
        });
      }

      const coins = Number(getCoins?.(interaction.user.id) || 0);

      const embed = new EmbedBuilder()
        .setColor("#0b0b0f")
        .setTitle("💰 Wallet")
        .setDescription(
          `> **User:** ${interaction.user}\n\n` +
          `> 💵 Balance: **${coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>\n\n` +
          `> Keep grinding to earn more.`
        )
        .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
        .setFooter({
          text: "VYRN Economy System"
        })
        .setTimestamp();

      return interaction.reply({
        embeds: [embed]
      });

    } catch (err) {
      console.error("BALANCE COMMAND ERROR:", err);

      if (!interaction.replied) {
        return interaction.reply({
          content: "❌ Error while fetching balance.",
          ephemeral: true
        });
      }
    }
  }
};
