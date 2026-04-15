const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { loadProfile, isDailyReady, saveProfile } = require("./profileSystem");

// ====================== LOCAL CACHE ======================
const dmLock = new Set(); // FIX: anty spam / race condition

// ====================== EMBED ======================
function buildDailyEmbed(userId) {
  const db = loadProfile();
  const user = db.users?.[userId] || { daily: {} };

  const msgs = Math.min(user.daily?.msgs || 0, 50);
  const vcMinutes = Math.min(Math.floor((user.daily?.vc || 0) / 60), 30);
  const streak = user.daily?.streak || 0;
  const ready = isDailyReady(userId);

  return {
    embed: new EmbedBuilder()
      .setColor(ready ? "#22c55e" : "#0f172a")
      .setTitle("🎯 Daily Quest")
      .setDescription(
        `<:Messages:1488763434966192242> **Wiadomości:** \`${msgs}/50\`\n` +
        `<a:TimeS:1488760889560797314> **VC:** \`${vcMinutes}/30 min\`\n` +
        `🔥 **Streak:** \`${streak} dni\`\n\n` +
        (ready
          ? "✅ Gotowe do odebrania!"
          : "❌ Ukończ wymagania")
      )
      .setFooter({ text: "Daily System" })
      .setTimestamp(),

    components: ready
      ? [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("daily_claim")
              .setLabel("ODEBIERZ DAILY")
              .setStyle(ButtonStyle.Success)
              .setEmoji("🎁")
          ),
        ]
      : [],

    ready,
  };
}

// ====================== DM CHECK ======================
async function checkDailyDM(member) {
  if (!member || member.user.bot) return;

  const userId = member.id;

  // FIX: anty race condition (nie wysyłaj 2x w tym samym czasie)
  if (dmLock.has(userId)) return;
  dmLock.add(userId);

  try {
    const db = loadProfile();
    const user = db.users?.[userId];

    if (!user?.daily) return;

    user.daily.notified ??= false;

    const ready = isDailyReady(userId);

    if (!ready || user.daily.notified) return;

    user.daily.notified = true;

    const { embed, components } = buildDailyEmbed(userId);

    await member.send({
      content: "🎯 Twój Daily Quest jest gotowy!",
      embeds: [embed],
      components,
    });

    console.log(`[DAILY] DM sent → ${member.user.tag}`);
    saveProfile();
  } catch (err) {
    // DM blocked / rate limit / etc.
    console.log(`[DAILY] failed → ${member.user?.tag || "unknown"}`);
  } finally {
    dmLock.delete(userId);
  }
}

module.exports = {
  buildDailyEmbed,
  checkDailyDM,
};
