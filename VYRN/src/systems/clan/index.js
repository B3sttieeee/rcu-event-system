// =====================================================
// CLAN SYSTEM - HYBRID MODULAR
// =====================================================
const { EmbedBuilder, Events } = require("discord.js");

// ====================== CONFIG ======================
const CHANNEL_ID = "1475992158581559528";
const ROLES = {
  LEADER: "1475570484585168957",
  OFFICER: "1475572271446884535",
  MEMBER: "1475572190337433781",
  VERIFIED: "1475998527191519302"
};

// ====================== CACHE ======================
let lastUpdate = 0;
const UPDATE_COOLDOWN = 15000; // 15 sekund

// ====================== FORMAT USER ======================
function formatUser(member) {
  const isVerified = member.roles.cache.has(ROLES.VERIFIED);
  const status = isVerified ? "" : " `（Not Verified）`";

  if (member.roles.cache.has(ROLES.LEADER)) {
    return `• ${member} — **LEADER**${status}`;
  }
  if (member.roles.cache.has(ROLES.OFFICER)) {
    return `• ${member} — **OFFICER**${status}`;
  }
  if (member.roles.cache.has(ROLES.MEMBER)) {
    return `• ${member} — **MEMBER**${status}`;
  }
  return null;
}

// ====================== GET CLAN MEMBERS ======================
async function getClanMembers(guild) {
  await guild.members.fetch({ cache: true }).catch(() => {});

  const leaders = [];
  const officers = [];
  const membersList = [];

  for (const member of guild.members.cache.values()) {
    if (member.user.bot) continue;

    const formatted = formatUser(member);
    if (!formatted) continue;

    if (member.roles.cache.has(ROLES.LEADER)) {
      leaders.push(formatted);
    } else if (member.roles.cache.has(ROLES.OFFICER)) {
      officers.push(formatted);
    } else if (member.roles.cache.has(ROLES.MEMBER)) {
      membersList.push(formatted);
    }
  }

  return { leaders, officers, members: membersList };
}

// ====================== BUILD EMBED ======================
async function buildEmbed(guild) {
  const { leaders, officers, members } = await getClanMembers(guild);
  const totalMembers = leaders.length + officers.length + members.length;

  return new EmbedBuilder()
    .setColor("#0a0a0a")
    .setAuthor({
      name: `${guild.name} • VYRN Clan`,
      iconURL: guild.iconURL({ size: 256 }) || null,
    })
    .setDescription(
`🏆 **LEADERS**
${leaders.length ? leaders.join("\n") : "_Brak liderów_"}
━━━━━━━━━━━━━━━━━━
🛡 **OFFICERS**
${officers.length ? officers.join("\n") : "_Brak oficerów_"}
━━━━━━━━━━━━━━━━━━
👥 **MEMBERS**
${members.length ? members.join("\n") : "_Brak członków_"}
━━━━━━━━━━━━━━━━━━
🔒 *Niezweryfikowani użytkownicy są oznaczeni \`（Not Verified）\`*`
    )
    .setFooter({
      text: `Łącznie w klanie: ${totalMembers} członków • VYRN`,
      iconURL: guild.iconURL({ size: 64 }) || null,
    })
    .setTimestamp();
}

// ====================== UPDATE EMBED ======================
async function updateClanEmbed(client) {
  const now = Date.now();
  if (now - lastUpdate < UPDATE_COOLDOWN) return;
  lastUpdate = now;

  try {
    const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    if (!channel?.isTextBased()) return;

    const guild = channel.guild;
    const messages = await channel.messages.fetch({ limit: 10 });
    const existingMsg = messages.find(m => m.author.id === client.user.id);

    const embed = await buildEmbed(guild);

    if (existingMsg) {
      await existingMsg.edit({ embeds: [embed] }).catch(() => {});
    } else {
      await channel.send({ embeds: [embed] }).catch(() => {});
    }

    console.log(`✅ Clan embed zaktualizowany (${guild.name})`);
  } catch (error) {
    console.error("❌ Błąd aktualizacji clan embed:", error.message);
  }
}

// ====================== START CLAN SYSTEM ======================
function startClanSystem(client) {
  console.log("🛡️ Clan Embed System uruchomiony.");

  // Pierwsze uruchomienie po starcie bota
  client.once(Events.ClientReady, () => {
    setTimeout(() => updateClanEmbed(client), 10000);
  });

  // Aktualizacja przy zmianie ról
  client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
    const oldRoles = oldMember.roles.cache.map(r => r.id);
    const newRoles = newMember.roles.cache.map(r => r.id);

    const clanRoles = [ROLES.LEADER, ROLES.OFFICER, ROLES.MEMBER, ROLES.VERIFIED];
    const hasChange = clanRoles.some(roleId =>
      oldRoles.includes(roleId) !== newRoles.includes(roleId)
    );

    if (hasChange) {
      updateClanEmbed(client);
    }
  });

  // Aktualizacja przy dołączeniu/wyjściu
  client.on(Events.GuildMemberAdd, () => updateClanEmbed(client));
  client.on(Events.GuildMemberRemove, () => updateClanEmbed(client));

  // Fallback co 2 minuty
  setInterval(() => {
    updateClanEmbed(client);
  }, 120000);
}

// ====================== INIT ======================
function init(client) {
  startClanSystem(client);
  console.log("🏴 Clan System → załadowany");
}

module.exports = {
  init,
  startClanSystem,
  updateClanEmbed
};
