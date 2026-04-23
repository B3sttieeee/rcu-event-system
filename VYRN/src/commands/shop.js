// src/commands/shop.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getCoins } = require("../systems/economy");
const { buyBoost, SHOP_BOOSTS } = require("../systems/boost");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("🛒 Sklep z boostami XP"),

  async execute(interaction) {
    const coins = getCoins(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor("#0a0a0a")
      .setTitle("🛒 VYRN SHOP — Boosty XP")
      .setDescription(`**Twoje monety:** ${coins.toLocaleString("pl-PL")} <:CASHH:1491180511308157041>\n\nWybierz boost poniżej:`)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      SHOP_BOOSTS.map(boost => 
        new ButtonBuilder()
          .setCustomId(`buy_boost_${boost.id}`)
          .setLabel(`${boost.name} — ${boost.price} 💰`)
          .setStyle(ButtonStyle.Primary)
      )
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
