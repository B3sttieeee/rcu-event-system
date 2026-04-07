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
        .setDescription(`**Twoje monety:** ${coins.toLocaleString("pl-PL")} 🪙\n\nWybierz boost używając \`/buy <id>\``)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "VYRN • Economy & Boost System" })
        .setTimestamp();

      SHOP_BOOSTS.forEach(boost => {
        const minutes = Math.floor(boost.duration / 60000);

        embed.addFields({
          name: `${boost.id}. ${boost.name}`,
          value: `**${boost.multiplier}x XP** • ${minutes} minut\n` +
                 `**Cena:** ${boost.price} 🪙`,
          inline: true
        });
      });

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error("❌ Błąd w /shop:", err);
      await interaction.reply({
        content: "❌ Wystąpił błąd podczas ładowania sklepu.",
        ephemeral: true
      });
    }
  },
};
