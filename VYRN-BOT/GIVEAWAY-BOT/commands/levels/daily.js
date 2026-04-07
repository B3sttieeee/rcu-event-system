const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require("discord.js");

const { claimDaily, getDailyTier, isDailyReady } = require("../../utils/profileSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("🎯 Sprawdź postęp i odbierz swój daily quest"),

  async execute(interaction) {
    await showDailyPanel(interaction);
  }
};

// ====================== GŁÓWNA FUNKCJA ======================
async function showDailyPanel(interaction, isFollowUp = false) {
  const userId = interaction.user.id;
  const ready = isDailyReady(userId);
  const streak = getCurrentStreak(userId);
  const tier = getDailyTier(streak);
  const progress = getProgress(userId, tier);

  const embed = new EmbedBuilder()
    .setColor(ready ? "#22c55e" : "#0f172a")
    .setAuthor({
      name: `${interaction.user.username} • Daily Quest`,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true })
    })
    .setDescription(
      `### 🎯 Twoje codzienne cele\n\n` +
      `**🎤 Czas na VC**\n` +
      `${createProgressBar(progress.vcPercent)} **${progress.vcPercent}%** \`${progress.vcMin}/${tier.vcRequired} min\`\n\n` +
      `**💬 Wiadomości**\n` +
      `${progress.msgPercent !== null 
        ? `${createProgressBar(progress.msgPercent)} **${progress.msgPercent}%** \`${progress.msgs}/${tier.msgRequired}\`` 
        : "🔒 Odblokuje się przy **5+** streak"}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔥 **Daily Streak:** ${streak} ${streak >= 5 ? "🔥" : ""}\n\n` +
      `${ready 
        ? "✅ **Wszystko ukończone! Możesz odebrać nagrodę**" 
        : "❌ Ukończ zadania, aby odblokować daily"}`
    )
    .setFooter({ text: "Nagroda: 150–300 XP • Reset codziennie o północy" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("daily_claim")
      .setLabel("ODEBIERZ DAILY")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🎁")
      .setDisabled(!ready)
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

  // ====================== COLLECTOR ======================
  const collector = interaction.channel.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: i => i.customId === "daily_claim" && i.user.id === userId,
    time: 120000 // 2 minuty
  });

  collector.on("collect", async (btnInteraction) => {
    await handleDailyClaim(btnInteraction, interaction.member);
    collector.stop();
  });

  collector.on("end", async () => {
    // Wyłącz przycisk po czasie
    try {
      await interaction.editReply({
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("daily_claim")
              .setLabel("ODEBIERZ DAILY")
              .setStyle(ButtonStyle.Success)
              .setEmoji("🎁")
              .setDisabled(true)
          )
        ]
      });
    } catch {}
  });
}

// ====================== PROGRESS & HELPERS ======================
function getProgress(userId, tier) {
  const { loadProfile } = require("../../utils/profileSystem");
  const db = loadProfile();
  const user = db.users?.[userId]?.daily || { vc: 0, msgs: 0 };

  const vcMin = Math.floor(user.vc / 60);
  const msgs = user.msgs || 0;

  const vcPercent = tier.vcRequired > 0 
    ? Math.min(100, Math.floor((vcMin / tier.vcRequired) * 100)) 
    : 0;

  const msgPercent = tier.msgRequired > 0 
    ? Math.min(100, Math.floor((msgs / tier.msgRequired) * 100)) 
    : null;

  return { vcMin, msgs, vcPercent, msgPercent };
}

function getCurrentStreak(userId) {
  const { loadProfile } = require("../../utils/profileSystem");
  const db = loadProfile();
  return db.users?.[userId]?.daily?.streak || 0;
}

function createProgressBar(percent) {
  const filled = Math.floor(percent / 10);
  return "🟩".repeat(filled) + "⬛".repeat(10 - filled);
}

// ====================== CLAIM HANDLER ======================
async function handleDailyClaim(interaction, member) {
  await interaction.deferUpdate();

  const result = await claimDaily(interaction.user.id, member);

  if (!result.success) {
    const errorMsg = result.error === "cooldown" 
      ? "❌ Daily możesz odebrać tylko raz na 24 godziny!"
      : "❌ Daily jeszcze nie jest gotowy!";

    return interaction.editReply({
      content: errorMsg,
      embeds: [],
      components: []
    });
  }

  // Sukces
  const successEmbed = new EmbedBuilder()
    .setColor("#22c55e")
    .setTitle("🎉 Daily Odebrany Pomyślnie!")
    .setDescription(
      `**Zdobyłeś:** \`${result.xp} XP\`\n` +
      `**Nowy streak:** 🔥 **${result.streak} dni**\n\n` +
      `Wracaj jutro po kolejny daily quest!`
    )
    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: "VYRN • Daily System" })
    .setTimestamp();

  await interaction.editReply({
    embeds: [successEmbed],
    components: []
  });
}
