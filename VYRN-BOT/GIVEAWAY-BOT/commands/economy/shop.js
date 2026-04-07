const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { SHOP_BOOSTS } = require("../../utils/boostSystem");
const { getCoins } = require("../../utils/economySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("🛒 Sklep z boostami doświadczenia"),

  async execute(interaction) {
    try {
      const coins = getCoins(interaction.user.id);

      const embed = new EmbedBuilder()
        .setColor(0x00ff88)
        .setTitle("🛒 Sklep z Boostami XP")
        .setDescription(
          `**Twoje saldo:** ${coins.toLocaleString("pl-PL")} <:CASHH:1491180511308157041>\n\n` +
          `Wybierz boost wpisując \`/buy <id>\``
        )
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ 
          text: "VYRN • Economy & Boost System",
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

      SHOP_BOOSTS.forEach(boost => {
        const minutes = Math.floor(boost.duration / 60000);

        let emoji = "⚡";
        if (boost.multiplier >= 3.0) emoji = "🔥";
        else if (boost.multiplier >= 2.5) emoji = "💎";
        else if (boost.multiplier >= 2.0) emoji = "✨";

        embed.addFields({
          name: `${emoji} ${boost.id}. ${boost.name}`,
          value: `**${boost.multiplier}x XP** • ${minutes} minut\n` +
                 `Cena: **${boost.price}** <:CASHH:1491180511308157041>`,
          inline: false
        });
      });

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error("❌ Błąd w /shop:", err);
      await interaction.reply({
        content: "❌ Wystąpił błąd podczas otwierania sklepu.",
        ephemeral: true
      });
    }
  },
};
