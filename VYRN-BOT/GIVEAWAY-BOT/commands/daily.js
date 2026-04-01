const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const { loadProfile, getDailyTier, isDailyReady } = require("../utils/profileSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("🎯 Daily quests"),

  async execute(interaction) {

    const db = loadProfile();
    const user = db.users[interaction.user.id] || {
      streak: 0,
      daily: { msgs: 0, vc: 0 }
    };

    const tier = getDailyTier(user.streak);

    const vcMin = Math.floor(user.daily.vc / 60);
    const msgs = user.daily.msgs;

    const vcPercent = Math.min(100, Math.floor((vcMin / tier.vc) * 100));
    const msgPercent = tier.msgs > 0
      ? Math.min(100, Math.floor((msgs / tier.msgs) * 100))
      : 0;

    const bar = (p) => "🟩".repeat(Math.floor(p / 10)) + "⬛".repeat(10 - Math.floor(p / 10));

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
${bar(vcPercent)} ${vcPercent}% (${vcMin}/${tier.vc} min)

${
  tier.msgs > 0
  ? `💬 Messages  
${bar(msgPercent)} ${msgPercent}% (${msgs}/${tier.msgs})`
  : `💬 Messages  
🔒 Unlock at streak 5`
}

━━━━━━━━━━━━━━

🔥 Streak: **${user.streak}**

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

    interaction.reply({
      embeds: [embed],
      components: [row],
      flags: 64
    });
  }
};
