const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require("discord.js");

const { claimDaily, getDailyTier, isDailyReady } = require("../utils/profileSystem");
const { loadConfig } = require("../utils/levelSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("🎯 Sprawdź i odbierz swój daily quest"),

  async execute(interaction) {
    await showDailyPanel(interaction);
  }
};

// ====================== GŁÓWNA FUNKCJA ======================
async function showDailyPanel(interaction, isFollowUp = false) {
  const userId = interaction.user.id;
  const member = interaction.member;

  const ready = isDailyReady(userId);
  const streak = getCurrentStreak(userId);
  const tier = getDailyTier(streak);

  const { vcMin, msgs, vcPercent, msgPercent } = getProgress(userId, tier);

  const bar = (percent) => 
    "🟩".repeat(Math.floor(percent / 10)) + 
    "⬛".repeat(10 - Math.floor(percent / 10));

  const embed = new EmbedBuilder()
    .setColor(ready ? "#22c55e" : "#0f172a")
    .setAuthor({
      name: `${interaction.user.username} • Daily Quests`,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true })
    })
    .setDescription(
`🎯 **Daily Objectives**

🎤 **Voice Time**
${bar(vcPercent)} **${vcPercent}%** (${vcMin}/${tier.vcRequired} min)

💬 **Messages**
${msgPercent !== null 
  ? `${bar(msgPercent)} **${msgPercent}%** (${msgs}/${tier.msgRequired})`
  : "🔒 Odblokuje się przy streak **5+**"}

━━━━━━━━━━━━━━
🔥 **Streak:** ${streak} ${streak >= 5 ? "🔥" : ""}
${ready 
  ? "✅ **Wszystko zrobione! Możesz odebrać nagrodę**" 
  : "❌ Ukończ zadania, aby odblokować daily"}`
    )
    .setFooter({ text: "Nagroda: 150–299 XP | Reset codziennie" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("daily_claim")
      .setLabel("ODEBIERZ DAILY")
      .setStyle(ButtonStyle.Success)
      .setDisabled(!ready)
      .setEmoji("🎁")
  );

  const options = {
    embeds: [embed],
    components: [row]
  };

  if (isFollowUp) {
    await interaction.editReply(options);
  } else {
    await interaction.reply({ ...options, flags: 64 }); // ephemeral
  }

  // ====================== BUTTON HANDLER ======================
  const collector = interaction.channel.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: i => i.customId === "daily_claim" && i.user.id === userId,
    time: 60000 // 60 sekund
  });

  collector.on("collect", async (buttonInteraction) => {
    await handleDailyClaim(buttonInteraction, member);
    collector.stop();
  });

  collector.on("end", () => {
    // Opcjonalnie: wyłącz przycisk po czasie
  });
}

// ====================== PROGRESS ======================
function getProgress(userId, tier) {
  const { loadProfile } = require("../utils/profileSystem");
  const db = loadProfile();
  const user = db.users?.[userId] || { daily: { vc: 0, msgs: 0 } };

  const vcMin = Math.floor(user.daily.vc / 60);
  const msgs = user.daily.msgs || 0;

  const vcPercent = tier.vcRequired > 0 
    ? Math.min(100, Math.floor((vcMin / tier.vcRequired) * 100)) 
    : 0;

  const msgPercent = tier.msgRequired > 0 
    ? Math.min(100, Math.floor((msgs / tier.msgRequired) * 100)) 
    : null;

  return { vcMin, msgs, vcPercent, msgPercent };
}

function getCurrentStreak(userId) {
  const { loadProfile } = require("../utils/profileSystem");
  const db = loadProfile();
  return db.users?.[userId]?.daily?.streak || 0;
}

// ====================== CLAIM HANDLER ======================
async function handleDailyClaim(interaction, member) {
  await interaction.deferUpdate();

  const result = await claimDaily(interaction.user.id, member);

  if (!result.success) {
    let errorMsg = "❌ Coś poszło nie tak.";

    if (result.error === "not_ready") errorMsg = "❌ Daily jeszcze nie jest gotowy!";
    if (result.error === "cooldown") errorMsg = "❌ Daily możesz odebrać tylko raz na 24 godziny.";

    await interaction.editReply({
      content: errorMsg,
      embeds: [],
      components: []
    });
    return;
  }

  // Sukces
  const embed = new EmbedBuilder()
    .setColor("#22c55e")
    .setTitle("🎉 Daily Odebrany!")
    .setDescription(
      `**Zdobyłeś:** \`${result.xp} XP\`\n` +
      `**Nowy streak:** 🔥 **${result.streak}**\n\n` +
      `Gratulacje! Wracaj jutro po kolejny daily!`
    )
    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
    .setTimestamp();

  await interaction.editReply({
    embeds: [embed],
    components: []
  });
}
