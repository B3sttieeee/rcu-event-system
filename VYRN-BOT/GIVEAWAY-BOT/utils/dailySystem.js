const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const {
  loadProfile,
  isDailyReady,
  saveProfile,
  getDailyReward
} = require("./profileSystem");

// ====================== CONFIG ======================
const BLACK_COLOR = "#0a0a0a";
const READY_COLOR = "#22c55e";

// ====================== ENSURE STATE ======================
function ensureDailyState(user) {
  if (!user.daily) user.daily = {};
  const d = user.daily;
  d.msgs = Number(d.msgs) || 0;
  d.vc = Number(d.vc) || 0;
  d.streak = Number(d.streak) || 0;
  d.lastClaim = Number(d.lastClaim) || 0;
  d.notified = Boolean(d.notified);
  d.lastNotifyAttemptAt = Number(d.lastNotifyAttemptAt) || 0;
  return d;
}

// ====================== BUILD EMBED (NAJWAŻNIEJSZE) ======================
function buildDailyEmbed(userId) {
  // ZAWSZE pobieramy najświeższe dane z pliku
  const db = loadProfile();
  const user = db.users?.[userId] || {};
  const daily = ensureDailyState(user);

  const ready = isDailyReady(userId);
  const reward = getDailyReward(daily.streak);

  const embed = new EmbedBuilder()
    .setColor(ready ? READY_COLOR : BLACK_COLOR)
    .setTitle("🌙 Daily Quest — VYRN")
    .setDescription(
      ready
        ? "**Wszystkie wymagania spełnione!** Kliknij przycisk poniżej, aby odebrać nagrodę."
        : "Wbij wymagane progi i wróć po nagrodę."
    )
    .addFields(
      {
        name: "📌 Wymagania",
        value: `• Wiadomości: \`${Math.min(daily.msgs, 50)}/50\`\n• Voice Chat: \`${Math.min(Math.floor(daily.vc / 60), 30)}/30 min\``,
        inline: false
      },
      {
        name: "🏆 Nagroda",
        value: reward.text,
        inline: false
      },
      {
        name: "🔥 Streak",
        value: `\`${daily.streak} dni\``,
        inline: true
      }
    )
    .setFooter({ text: "VYRN • Daily System" })
    .setTimestamp();

  const components = ready ? [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("daily_claim")
        .setLabel("Odbierz nagrodę")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🎁")
    )
  ] : [];

  return { embed, components };
}

// ====================== PO ODEBRANIU (reset) ======================
function onDailyClaimed(userId) {
  try {
    const db = loadProfile();
    const user = db.users?.[userId];
    if (!user) return;

    const daily = ensureDailyState(user);

    // Resetujemy tylko flagi powiadomień
    daily.notified = false;
    daily.lastNotifyAttemptAt = 0;

    saveProfile();

    console.log(`[DAILY] onDailyClaimed → ${userId} | Streak po resecie: ${daily.streak}`);
  } catch (err) {
    console.error("[DAILY] Błąd onDailyClaimed:", err);
  }
}

// ====================== STUB (DM wyłączone) ======================
async function checkDailyDM() {
  return false;
}

// ====================== EXPORTS ======================
module.exports = {
  buildDailyEmbed,
  onDailyClaimed,
  checkDailyDM,
  ensureDailyState
};
