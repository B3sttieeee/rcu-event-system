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
  claimDaily
} = require("./profileSystem");

// ====================== CONFIG ======================
const DM_RETRY_COOLDOWN_MS = 25 * 60 * 1000;   // 25 minut
const DM_FAILED_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 godzin przy zamkniętych DM

const dmLock = new Set();
const dmCooldown = new Map();

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

function buildDailyEmbed(userId, daily) {
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
        { name: "Streak",     value: `\`${daily.streak} dni\``, inline: true }
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
    ] : [],

    ready
  };
}

// ====================== GŁÓWNA FUNKCJA ======================
async function checkDailyDM(member) {
  if (!member?.user || member.user.bot) return false;

  const userId = member.id;
  if (dmLock.has(userId)) return false;
  dmLock.add(userId);

  try {
    const db = loadProfile();
    const user = db.users?.[userId];
    if (!user) return false;

    const daily = ensureDailyState(user);
    const ready = isDailyReady(userId);

    // Reset powiadomienia jeśli daily nie jest gotowy
    if (!ready) {
      if (daily.notified || daily.lastNotifyAttemptAt > 0) {
        daily.notified = false;
        daily.lastNotifyAttemptAt = 0;
        dmCooldown.delete(userId);
        saveProfile();
      }
      return false;
    }

    // Już powiadomiony
    if (daily.notified) return false;

    const now = Date.now();
    const lastAttempt = Math.max(daily.lastNotifyAttemptAt || 0, dmCooldown.get(userId) || 0);
    const isFailedAttempt = (now - lastAttempt) < DM_RETRY_COOLDOWN_MS * 2;
    const cooldown = isFailedAttempt ? DM_FAILED_COOLDOWN_MS : DM_RETRY_COOLDOWN_MS;

    if (now - lastAttempt < cooldown) return false;

    // Przygotowanie do wysłania
    daily.lastNotifyAttemptAt = now;
    dmCooldown.set(userId, now);
    saveProfile();

    const { embed, components } = buildDailyEmbed(userId, daily);

    try {
      await member.send({
        content: "Twój **Daily Quest** jest gotowy do odebrania!",
        embeds: [embed],
        components
      });

      daily.notified = true;
      saveProfile();

      console.log(`[DAILY] DM wysłany → ${member.user.tag} | Streak: ${daily.streak}`);
      return true;

    } catch (sendErr) {
      if (sendErr.code === 50007) {
        console.log(`[DAILY] DM zablokowane → ${member.user.tag}`);
        dmCooldown.set(userId, now + DM_FAILED_COOLDOWN_MS - DM_RETRY_COOLDOWN_MS);
      } else {
        console.error(`[DAILY] Błąd wysyłania DM:`, sendErr.message);
      }
      return false;
    }

  } catch (err) {
    console.error(`[DAILY] Błąd checkDailyDM dla ${userId}:`, err);
    return false;
  } finally {
    setTimeout(() => dmLock.delete(userId), 10000);
  }
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
    dmCooldown.delete(userId);

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
