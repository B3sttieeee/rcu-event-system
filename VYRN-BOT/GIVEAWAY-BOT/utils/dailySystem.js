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

const DM_RETRY_COOLDOWN_MS = 30 * 60 * 1000;
const dmLock = new Set();
const dmCooldown = new Map();

function ensureDailyState(user) {
  user.daily ??= {};
  user.daily.msgs = Number(user.daily.msgs) || 0;
  user.daily.vc = Number(user.daily.vc) || 0;
  user.daily.streak = Number(user.daily.streak) || 0;
  user.daily.notified = Boolean(user.daily.notified);
  user.daily.lastNotifyAttemptAt =
    Number(user.daily.lastNotifyAttemptAt) || 0;

  return user.daily;
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
      .setTitle(ready ? "Daily Quest gotowy" : "Postep Daily Quest")
      .setDescription(
        ready
          ? "Wymagania zostaly spelnione. Odbierz nagrode przyciskiem ponizej."
          : "Wbij wymagane progi i wroc po nagrode."
      )
      .addFields(
        {
          name: "Wiadomosci",
          value: `\`${msgs}/50\``,
          inline: true
        },
        {
          name: "Voice Chat",
          value: `\`${vcMinutes}/30 min\``,
          inline: true
        },
        {
          name: "Streak",
          value: `\`${streak} dni\``,
          inline: true
        }
      )
      .setFooter({
        text: ready ? "Nagroda czeka na odbior" : "Daily System"
      })
      .setTimestamp(),

    components: ready
      ? [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("daily_claim")
              .setLabel("Odbierz daily")
              .setStyle(ButtonStyle.Success)
          )
        ]
      : [],

    ready
  };
}

function resetNotificationState(userId, daily) {
  const changed = daily.notified || daily.lastNotifyAttemptAt;

  daily.notified = false;
  daily.lastNotifyAttemptAt = 0;
  dmCooldown.delete(userId);

  return Boolean(changed);
}

function getLastAttempt(userId, daily) {
  return Math.max(
    Number(daily.lastNotifyAttemptAt) || 0,
    dmCooldown.get(userId) || 0
  );
}

async function checkDailyDM(member) {
  if (!member || member.user?.bot) return false;

  const userId = member.id;

  if (dmLock.has(userId)) return false;
  dmLock.add(userId);

  try {
    const db = loadProfile();
    const user = db.users?.[userId];

    if (!user) return false;

    const daily = ensureDailyState(user);
    const ready = isDailyReady(userId);

    if (!ready) {
      if (resetNotificationState(userId, daily)) {
        saveProfile();
      }

      return false;
    }

    const now = Date.now();
    const lastAttempt = getLastAttempt(userId, daily);

    if (daily.notified) return false;
    if (now - lastAttempt < DM_RETRY_COOLDOWN_MS) return false;

    daily.lastNotifyAttemptAt = now;
    dmCooldown.set(userId, now);
    saveProfile();

    const { embed, components } = buildDailyEmbed(userId, daily);

    await member.send({
      content: "Twoj Daily Quest jest gotowy do odebrania.",
      embeds: [embed],
      components
    });

    daily.notified = true;
    saveProfile();

    console.log(`[DAILY] DM sent -> ${member.user.tag}`);
    return true;
  } catch (err) {
    console.log(`[DAILY] DM skipped -> ${member.user?.tag || "unknown"}`);
    return false;
  } finally {
    dmLock.delete(userId);
  }
}

module.exports = {
  buildDailyEmbed,
  checkDailyDM
};
