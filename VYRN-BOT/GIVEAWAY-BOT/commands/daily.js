const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const {
  loadProfile,
  isDailyReady,
  claimDaily
} = require("../utils/profileSystem");

// ===== PROGRESS BAR
function getBar(current, max) {
  const size = 10;
  const percent = Math.min(100, Math.floor((current / max) * 100));
  const filled = Math.round((percent / 100) * size);
  const empty = size - filled;

  return "🟩".repeat(filled) + "⬛".repeat(empty) + ` ${percent}%`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("🎯 Daily quests & reward"),

  async execute(interaction) {

    const db = loadProfile();
    const user = db.users[interaction.user.id] || {
      voice: 0,
      daily: { msgs: 0, vc: 0, completed: false, streak: 0 }
    };

    const msgs = user.daily.msgs || 0;
    const vc = Math.floor((user.daily.vc || 0) / 60);

    const msgGoal = 50;
    const vcGoal = 30;

    const ready = isDailyReady(interaction.user.id);

    // ===== EMBED
    const embed = new EmbedBuilder()
      .setColor("#0f172a")
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setDescription(
`<:Zadania:1488763408026435594> **Daily Quests**

<:Messages:1488763434966192242> Messages  
${getBar(msgs, msgGoal)} (${msgs}/${msgGoal})

<a:TimeS:1488760889560797314> Voice  
${getBar(vc, vcGoal)} (${vc}/${vcGoal} min)

━━━━━━━━━━━━━━━━━━

🔥 Streak: **${user.daily.streak || 0}**

${ready 
? "✅ **Reward ready to claim!**" 
: "❌ Complete quests to unlock reward"}`
      );

    // ===== BUTTON
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("daily_claim")
        .setLabel("CLAIM")
        .setStyle(ButtonStyle.Success)
        .setDisabled(!ready)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }
};
