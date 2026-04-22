const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const {
  loadProfile,
  isDailyReady,
  saveProfile
} = require("./profileSystem");

// ====================== CONFIG ======================
const BLACK_COLOR = "#0a0a0a";
const READY_COLOR = "#22c55e";

// ====================== NAGRODA ======================
function getDailyReward(streak) {
  const baseXP = 150;
  const streakBonus = Math.min(streak * 50, 500);
  const totalXP = baseXP + streakBonus;
  return {
    xp: totalXP,
    text: `**${totalXP} XP** (150 base + ${streakBonus} za streak)`
  };
}

// ====================== POMOCNICZE ======================
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

function buildDailyEmbed(userId) {
  // Wymuszamy pełne odświeżenie cache przed zbudowaniem embedu
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
        ? "**Wszystkie wymagania spełnione!** Czas odebrać nagrodę."
        : "Wykonaj codzienne cele, aby zdobyć nagrodę."
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

// ====================== WYŁĄCZONE DM ======================
async function checkDailyDM(member) {
  return false;
}

// ====================== PO ODEBRANIU ======================
function onDailyClaimed(userId) {
  try {
    // Wymuszamy pełne odświeżenie po odebraniu
    loadProfile(); // czyścimy cache przed odczytem
    const db = loadProfile();
    const user = db.users?.[userId];
    if (!user) return;
    const daily = ensureDailyState(user);
    daily.notified = false;
    daily.lastNotifyAttemptAt = 0;
    saveProfile();
    console.log(`[DAILY] Status zresetowany po odebraniu → ${userId}`);
  } catch (err) {
    console.error("Błąd onDailyClaimed:", err);
  }
}

module.exports = {
  buildDailyEmbed,
  checkDailyDM,
  onDailyClaimed,
  ensureDailyState
};
