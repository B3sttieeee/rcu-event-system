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
    const coins = getCoins(interaction.user.id);

    // ======================
    const embed = new EmbedBuilder()
      .setColor("#0a0a0a") // black aesthetic
      .setTitle("🛒 VYRN SHOP")
      .setDescription(
        `> **XP Boost Store**\n\n` +
        `💰 Your balance: **${coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>\n\n` +
        `Select a boost below to purchase it.`
      )
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setFooter({ text: "VYRN ECONOMY • premium shop system" })
      .setTimestamp();

    // ======================
    const options = SHOP_BOOSTS.map(boost => ({
      label: boost.name,
      description: `Price: ${boost.price} coins`,
      value: boost.id,
      emoji: "⚡"
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("shop_select_boost")
      .setPlaceholder("Choose your XP boost...")
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }
};
