const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const fs = require("fs");
const { loadProfile, isDailyReady } = require("./profileSystem");

// ===== EMBED =====
function buildDailyEmbed(userId) {
  const db = loadProfile();
  const user = db.users[userId];

  const msg = Math.min(user.daily.msgs, 50);
  const vc = Math.min(Math.floor(user.daily.vc / 60), 30);

  const ready = isDailyReady(userId);

  const embed = new EmbedBuilder()
    .setColor(ready ? "#22c55e" : "#0f172a")
    .setTitle("🎯 DAILY QUEST")
    .setDescription(
`<:Messages:1488763434966192242> **Messages:** ${msg}/50
<a:TimeS:1488760889560797314> **Voice:** ${vc}/30 min

🔥 Streak: **${user.streak}**

${ready ? "✅ READY TO CLAIM" : "❌ IN PROGRESS"}`
    );

  let row = null;

  if (ready) {
    row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("daily_claim")
        .setLabel("CLAIM")
        .setStyle(ButtonStyle.Success)
    );
  }

  return { embed, row, ready };
}

// ===== DM SYSTEM =====
async function checkDailyDM(member) {
  const db = loadProfile();
  const user = db.users[member.id];

  if (!user) return;

  if (isDailyReady(member.id) && !user.notified) {
    user.notified = true;

    const { embed, row } = buildDailyEmbed(member.id);

    try {
      await member.send({
        content: "🎯 Daily ready!",
        embeds: [embed],
        components: row ? [row] : []
      });
    } catch {}

    fs.writeFileSync("/data/profile.json", JSON.stringify(db, null, 2));
  }
}

module.exports = {
  buildDailyEmbed,
  checkDailyDM
};
