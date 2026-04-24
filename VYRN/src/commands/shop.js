const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

const { getCoins } = require("../systems/economy");
const { SHOP_BOOSTS } = require("../systems/boost");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("🛒 View XP Boost Shop"),

  async execute(interaction) {
    const coins = getCoins(interaction.user.id) || 0;

    const embed = new EmbedBuilder()
      .setColor("#0b0b0f")
      .setTitle("🛒 VYRN SHOP")
      .setDescription(
        `> **XP Boost Store**\n\n` +
        `💰 Balance: **${coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>\n\n` +
        `Select a boost below to purchase it.`
      )
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setFooter({ text: "VYRN • Economy Shop" })
      .setTimestamp();

    const options = SHOP_BOOSTS.map(boost => ({
      label: boost.name,
      description: `Price: ${boost.price} coins`,
      value: boost.id,
      emoji: "⚡"
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId("shop_select_boost")
      .setPlaceholder("Select a boost...")
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }
};
