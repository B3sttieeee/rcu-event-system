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
      .setFooter({ text: "VYRN • Black Economy System" })
      .setTimestamp();

    // ================= SAFE OPTIONS =================
    const options = (SHOP_BOOSTS || [])
      .filter(b => b?.id && b?.name && b?.price)
      .map(boost => ({
        label: String(boost.name).slice(0, 100),
        description: `Price: ${boost.price} coins`,
        value: String(boost.id).slice(0, 100),
        emoji: "⚡"
      }));

    if (!options.length) {
      return interaction.reply({
        content: "❌ Shop is currently unavailable.",
        ephemeral: true
      });
    }

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
