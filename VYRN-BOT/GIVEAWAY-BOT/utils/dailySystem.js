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

// Progres bar
function createProgressBar(current, max, length = 12) {
  const percent = Math.min(Math.max(current / max, 0), 1);
  const filled = Math.round(percent * length);
  return "▰".repeat(filled) + "▱".repeat(length - filled);
}

function buildDailyEmbed(userId) {
  const db = loadProfile();
  const user = db.users?.[userId] || {};
  const daily = ensureDailyState(user);
  const ready = isDailyReady(userId);

  const tier = { vcRequired: 30, msgRequired: 50 }; // stałe wymagania
  const vcProgress = Math.min(Math.floor(daily.vc / 60), tier.vcRequired);
  const msgProgress = Math.min(daily.msgs, tier.msgRequired);

  const embed = new EmbedBuilder()
    .setColor(ready ? READY_COLOR : BLACK_COLOR)
    .setTitle(ready ? "🎉 Daily Quest jest gotowy!" : "📊 Postęp Daily Quest")
    .setDescription(
      ready
        ? "**Wszystkie wymagania spełnione!** Kliknij przycisk poniżej, aby odebrać nagrodę."
        : "Wbij wymagane progi i wróć po nagrodę."
    )
    .addFields(
      {
        name: "💬 Wiadomości",
        value: `${createProgressBar(msgProgress, tier.msgRequired)}\n\`${msgProgress}/${tier.msgRequired}\``,
        inline: true
      },
      {
        name: "🎤 Voice Chat",
        value: `${createProgressBar(vcProgress, tier.vcRequired)}\n\`${vcProgress}/${tier.vcRequired} min\``,
        inline: true
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

// ====================== CHECK DAILY DM (WYŁĄCZONE) ======================
async function checkDailyDM(member) {
  return false; // DM całkowicie wyłączone
}

// ====================== PO ODEBRANIU ======================
function onDailyClaimed(userId) {
  try {
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
