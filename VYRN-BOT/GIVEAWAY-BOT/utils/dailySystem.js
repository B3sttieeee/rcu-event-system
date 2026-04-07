const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { loadProfile, isDailyReady, saveProfile } = require("./profileSystem");

// ====================== BUILD EMBED ======================
function buildDailyEmbed(userId) {
  const db = loadProfile();
  const user = db.users?.[userId] || { daily: { msgs: 0, vc: 0, streak: 0 } };

  const msgs = Math.min(user.daily.msgs || 0, 50);
  const vcMinutes = Math.min(Math.floor((user.daily.vc || 0) / 60), 30);
  const streak = user.daily.streak || 0;
  const ready = isDailyReady(userId);

  const embed = new EmbedBuilder()
    .setColor(ready ? "#22c55e" : "#0f172a")
    .setTitle("🎯 Daily Quest")
    .setDescription(
      `<:Messages:1488763434966192242> **Wiadomości:** \`${msgs}/50\`\n` +
      `<a:TimeS:1488760889560797314> **Czas na VC:** \`${vcMinutes}/30 min\`\n` +
      `🔥 **Streak:** \`${streak} dni\`\n\n` +
      `${ready 
        ? "✅ **Wszystko ukończone! Możesz odebrać nagrodę**" 
        : "❌ Ukończ zadania, aby odblokować daily"}`
    )
    .setFooter({ text: "VYRN • Daily System • Reset codziennie" })
    .setTimestamp();

  let components = [];
  if (ready) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("daily_claim")
        .setLabel("ODEBIERZ DAILY")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🎁")
    );
    components = [row];
  }

  return { embed, components, ready };
}

// ====================== DM NOTIFICATION ======================
async function checkDailyDM(member) {
  if (!member || member.user.bot) return;

  const db = loadProfile();
  let user = db.users?.[member.id];

  if (!user?.daily) return;

  // Inicjalizacja notified jeśli nie istnieje
  if (user.daily.notified === undefined) {
    user.daily.notified = false;
  }

  // Sprawdzamy czy daily jest gotowy i jeszcze nie powiadomiliśmy
  if (isDailyReady(member.id) && !user.daily.notified) {
    user.daily.notified = true;

    const { embed, components } = buildDailyEmbed(member.id);

    try {
      await member.send({
        content: "🎯 **Twój Daily Quest jest gotowy!**",
        embeds: [embed],
        components: components
      });

      console.log(`[DAILY DM] Wysyłano powiadomienie do ${member.user.tag}`);
    } catch (err) {
      // Ignorujemy błędy (zablokowane DM, etc.)
      console.log(`[DAILY DM] Nie udało się wysłać DM do ${member.user.tag}`);
    }

    saveProfile(); // Zapisujemy flagę notified
  }
}

module.exports = {
  buildDailyEmbed,
  checkDailyDM
};
