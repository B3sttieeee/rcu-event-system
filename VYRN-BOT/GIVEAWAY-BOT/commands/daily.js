const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const {
  loadProfile,
  getDailyTier,
  isDailyReady
} = require("../utils/profileSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("🎯 Daily quests"),

  async execute(interaction) {

    const db = loadProfile();

    const user = db.users[interaction.user.id] || {
      voice: 0,
      daily: {
        msgs: 0,
        vc: 0,
        streak: 0
      }
    };

    const streak = user.daily.streak || 0;

    const tier = getDailyTier(streak);

    const vcMin = Math.floor((user.daily.vc || 0) / 60);
    const msgs = user.daily.msgs || 0;

    const vcRequired = tier.vcRequired;
    const msgRequired = tier.msgRequired;

    const vcPercent = vcRequired > 0
      ? Math.min(100, Math.floor((vcMin / vcRequired) * 100))
      : 0;

    const msgPercent = msgRequired > 0
      ? Math.min(100, Math.floor((msgs / msgRequired) * 100))
      : 0;

    const bar = (p) =>
      "🟩".repeat(Math.floor(p / 10)) +
      "⬛".repeat(10 - Math.floor(p / 10));

    const ready = isDailyReady(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor("#0f172a")
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setDescription(
`🎯 **Daily Quests**

🎤 Voice  
${bar(vcPercent)} ${vcPercent}% (${vcMin}/${vcRequired} min)

${
  msgRequired > 0
    ? `💬 Messages  
${bar(msgPercent)} ${msgPercent}% (${msgs}/${msgRequired})`
    : `💬 Messages  
🔒 Unlock at streak 5`
}

━━━━━━━━━━━━━━

🔥 Streak: **${streak}**

${
  ready
    ? "✅ Ready to claim!"
    : "❌ Complete quests to unlock reward"
}`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("daily_claim")
        .setLabel("CLAIM")
        .setStyle(ButtonStyle.Success)
        .setDisabled(!ready)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: 64
    });
  }
};
