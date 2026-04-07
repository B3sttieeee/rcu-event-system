const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { SHOP_BOOSTS } = require("../../utils/boostSystem");
const { getCoins } = require("../../utils/economySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Sklep z boostami XP"),

  async execute(interaction) {
    const coins = getCoins(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(0x00ff88)
      .setTitle("🛒 Sklep z Boostami XP")
      .setDescription(`Twoje monety: **${coins}** 🪙\n\nUżyj \`/buy <id>\` aby kupić boost.`);

    SHOP_BOOSTS.forEach(boost => {
      embed.addFields({
        name: `${boost.id}. ${boost.name}`,
        value: `**${boost.multiplier}x XP** — ${boost.price} 🪙\nCzas: **${Math.floor(boost.duration / 60000)} minut**`,
        inline: true
      });
    });

    await interaction.reply({ embeds: [embed] });
  },
};
