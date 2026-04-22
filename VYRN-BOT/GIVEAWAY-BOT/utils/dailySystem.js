const { loadProfile, isDailyReady, saveProfile } = require("./profileSystem");

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
  const db = loadProfile();
  const user = db.users?.[userId] || {};
  const daily = ensureDailyState(user);
  const ready = isDailyReady(userId);

  return {
    embed: new EmbedBuilder()
      .setColor(ready ? "#22c55e" : "#1e293b")
      .setTitle(ready ? "Daily Quest gotowy!" : "Postęp Daily Quest")
      .setDescription(
        ready
          ? "Wymagania zostały spełnione.\nKliknij przycisk poniżej, aby odebrać nagrodę."
          : "Wbij wymagane progi i wróć po nagrodę."
      )
      .addFields(
        { name: "Wiadomości", value: `\`${Math.min(daily.msgs, 50)}/50\``, inline: true },
        { name: "Voice Chat", value: `\`${Math.min(Math.floor(daily.vc / 60), 30)}/30 min\``, inline: true },
        { name: "Streak", value: `\`${daily.streak} dni\``, inline: true }
      )
      .setFooter({ text: ready ? "Nagroda czeka na odbiór • VYRN" : "Daily System • VYRN" })
      .setTimestamp(),

    components: ready ? [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("daily_claim")
          .setLabel("Odbierz daily")
          .setStyle(ButtonStyle.Success)
          .setEmoji("🎁")
      )
    ] : []
  };
}

// ====================== CHECK DAILY DM (WYŁĄCZONY) ======================
async function checkDailyDM(member) {
  // DM całkowicie usunięte – funkcja nic nie robi
  return false;
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
  checkDailyDM,
  onDailyClaimed,
  buildDailyEmbed,
  ensureDailyState
};
