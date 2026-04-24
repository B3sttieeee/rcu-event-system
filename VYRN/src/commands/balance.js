const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const { getCoins } = require("../systems/economy");
const { getUserLevel, getRank, neededXP } = require("../systems/level");
const { getCurrentBoost } = require("../systems/boost");

function createBar(percent) {
  const size = 12;
  const filled = Math.round((percent / 100) * size);
  return "▰".repeat(filled) + "▱".repeat(size - filled);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("💰 Check your wallet & profile stats"),

  async execute(interaction) {
    const userId = interaction.user.id;

    // ======================
    const coins = getCoins(userId);
    const levelData = getUserLevel(userId) || { xp: 0, level: 0 };
    const boost = getCurrentBoost(userId) || 1;

    const rank = getRank(levelData.level);
    const nextXP = neededXP(levelData.level);

    const progress = nextXP
      ? Math.min(100, Math.floor((levelData.xp / nextXP) * 100))
      : 0;

    // ======================
    const embed = new EmbedBuilder()
      .setColor("#0a0a0a")
      .setAuthor({
        name: `${interaction.user.username} • Economy Profile`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setThumbnail(interaction.user.displayAvatarURL())
      .setDescription(
        `## 💰 Wallet Overview\n` +
        `> **Balance:** \`${coins.toLocaleString("pl-PL")}\` <:CASHH:1491180511308157041>\n\n` +

        `## 📊 Level Progress\n` +
        `> **Rank:** ${rank.emoji} **${rank.name}**\n` +
        `> **Level:** \`${levelData.level}\`\n` +
        `> **XP:** \`${levelData.xp} / ${nextXP}\`\n` +
        `> ${createBar(progress)} **${progress}%**\n\n` +

        `## 🚀 Boost Status\n` +
        `> ${boost > 1 ? `**Active: ${boost}x XP Boost**` : "**No active boost**"}\n\n` +

        `## 🧠 Summary\n` +
        `> You are currently progressing as a **${rank.name} member**.\n` +
        `> Keep being active to earn more XP & coins.`
      )
      .setFooter({
        text: "VYRN ECONOMY • grind smart, not hard",
        iconURL: interaction.guild?.iconURL?.() || null
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
