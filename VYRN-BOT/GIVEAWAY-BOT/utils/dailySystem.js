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

// ================== KONFIGURACJA ==================
const DM_RETRY_COOLDOWN_MS = 30 * 60 * 1000;      // 30 minut - normalny cooldown
const DM_FAILED_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 godzin - gdy DM zamknięte
const DM_LOCK_TIMEOUT_MS = 10 * 1000;             // max czas blokady na użytkownika

const dmLock = new Set();
const dmCooldown = new Map(); // timestamp ostatniej próby

// ================== POMOCNICZE FUNKCJE ==================

function ensureDailyState(user) {
  if (!user.daily) user.daily = {};
  
  const daily = user.daily;
  daily.msgs = Number(daily.msgs) || 0;
  daily.vc = Number(daily.vc) || 0;
  daily.streak = Number(daily.streak) || 0;
  daily.notified = Boolean(daily.notified);
  daily.lastNotifyAttemptAt = Number(daily.lastNotifyAttemptAt) || 0;

  return daily;
}

function buildDailyEmbed(userId, dailyState) {
  const db = loadProfile();
  const user = db.users?.[userId] || { daily: {} };
  const daily = dailyState || ensureDailyState(user);

  const msgs = Math.min(daily.msgs, 50);
  const vcMinutes = Math.min(Math.floor(daily.vc / 60), 30);
  const streak = daily.streak;
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
        { name: "Wiadomości", value: `\`${msgs}/50\``, inline: true },
        { name: "Voice Chat", value: `\`${vcMinutes}/30 min\``, inline: true },
        { name: "Streak", value: `\`${streak} dni\``, inline: true }
      )
      .setFooter({ text: ready ? "Nagroda czeka na odbiór" : "Daily System" })
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

function resetNotificationState(daily) {
  const wasNotified = daily.notified || daily.lastNotifyAttemptAt > 0;
  daily.notified = false;
  daily.lastNotifyAttemptAt = 0;
  return wasNotified;
}

function getCooldownRemaining(userId, daily) {
  const now = Date.now();
  const lastAttempt = Math.max(
    Number(daily.lastNotifyAttemptAt) || 0,
    dmCooldown.get(userId) || 0
  );

  // Jeśli ostatnio była nieudana próba (długi cooldown)
  const isFailedAttempt = (now - lastAttempt) < DM_RETRY_COOLDOWN_MS * 2;
  const cooldownTime = isFailedAttempt ? DM_FAILED_COOLDOWN_MS : DM_RETRY_COOLDOWN_MS;

  return Math.max(0, lastAttempt + cooldownTime - now);
}

// ================== GŁÓWNA FUNKCJA ==================

async function checkDailyDM(member) {
  if (!member?.user || member.user.bot) return false;

  const userId = member.id;

  // Zabezpieczenie przed równoległymi wywołaniami
  if (dmLock.has(userId)) return false;
  dmLock.add(userId);

  try {
    const db = loadProfile();
    const user = db.users?.[userId];
    if (!user) return false;

    const daily = ensureDailyState(user);
    const ready = isDailyReady(userId);

    // Nie jest gotowy → resetujemy status powiadomienia
    if (!ready) {
      if (resetNotificationState(daily)) {
        saveProfile();
      }
      return false;
    }

    // Już powiadomiony
    if (daily.notified) return false;

    // Sprawdzamy cooldown
    const remainingCooldown = getCooldownRemaining(userId, daily);
    if (remainingCooldown > 0) return false;

    // Przygotowujemy próbę wysłania
    const now = Date.now();
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

      console.log(`[DAILY] DM wysłany pomyślnie → ${member.user.tag}`);
      return true;

    } catch (sendError) {
      if (sendError.code === 50007) {
        // Użytkownik ma zamknięte DM
        console.log(`[DAILY] Nie można wysłać DM (zamknięte) → ${member.user.tag}`);
        // Dajemy długi cooldown
        dmCooldown.set(userId, now + DM_FAILED_COOLDOWN_MS - DM_RETRY_COOLDOWN_MS);
      } 
      else if (sendError.code === 50013) {
        console.log(`[DAILY] Brak uprawnień do wysyłania DM → ${member.user.tag}`);
      }
      else {
        console.error(`[DAILY] Błąd wysyłania DM do ${member.user.tag}:`, sendError.message);
      }
      return false;
    }

  } catch (err) {
    console.error(`[DAILY] Nieoczekiwany błąd w checkDailyDM dla ${userId}:`, err);
    return false;
  } 
  finally {
    // Zabezpieczenie przed zawieszeniem locka
    setTimeout(() => dmLock.delete(userId), DM_LOCK_TIMEOUT_MS);
  }
}

// ================== FUNKCJA DO WYWOŁANIA PO ODEBRANIU NAGRODY ==================

/**
 * Wywołaj tę funkcję po pomyślnym odebraniu daily (w handlerze przycisku "daily_claim")
 */
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
    console.log(`[DAILY] Status powiadomienia zresetowany po odebraniu → ${userId}`);
  } catch (err) {
    console.error(`[DAILY] Błąd podczas resetowania stanu po claimie:`, err);
  }
}

module.exports = {
  buildDailyEmbed,
  checkDailyDM,
  onDailyClaimed,        // ← bardzo ważne!
  // pomocnicze (opcjonalnie)
  ensureDailyState,
  resetNotificationState
};
