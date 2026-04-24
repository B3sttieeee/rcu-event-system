// =====================================================
// CLAN SYSTEM - BLACK EDITION (VYRN PRO)
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
const UPDATE_COOLDOWN = 15000;

// ====================== FORMAT USER ======================
function formatUser(member) {
  const verified = member.roles.cache.has(ROLES.VERIFIED);
  const status = verified ? "" : " `not verified`";

  if (member.roles.cache.has(ROLES.LEADER)) {
    return `> ${member} • **LEADER**${status}`;
  }

  if (member.roles.cache.has(ROLES.OFFICER)) {
    return `> ${member} • **OFFICER**${status}`;
  }

  if (member.roles.cache.has(ROLES.MEMBER)) {
    return `> ${member} • **MEMBER**${status}`;
  }

  return null;
}

// ====================== GET MEMBERS ======================
async function getClanMembers(guild) {
  await guild.members.fetch({ cache: true }).catch(() => {});

  const leaders = [];
  const officers = [];
  const members = [];

  for (const member of guild.members.cache.values()) {
    if (member.user.bot) continue;

    const formatted = formatUser(member);
    if (!formatted) continue;

    if (member.roles.cache.has(ROLES.LEADER)) leaders.push(formatted);
    else if (member.roles.cache.has(ROLES.OFFICER)) officers.push(formatted);
    else if (member.roles.cache.has(ROLES.MEMBER)) members.push(formatted);
  }

  return { leaders, officers, members };
}

// ====================== EMBED ======================
async function buildEmbed(guild) {
  const { leaders, officers, members } = await getClanMembers(guild);
  const total = leaders.length + officers.length + members.length;

  return new EmbedBuilder()
    .setColor("#0b0b0f") // BLACK THEME
    .setAuthor({
      name: `${guild.name} • Clan System`,
      iconURL: guild.iconURL({ size: 64 }) // SMALL SERVER ICON
    })
    .setThumbnail(guild.iconURL({ size: 128 })) // SMALL SERVER IMAGE (RIGHT SIDE STYLE)
    .setDescription(
`> **🏆 LEADERS**
${leaders.length ? leaders.join("\n") : "> _none_"}

> **🛡 OFFICERS**
${officers.length ? officers.join("\n") : "> _none_"}

> **👥 MEMBERS**
${members.length ? members.join("\n") : "> _none_"}

> **🔒 NOTE**
\`not verified\` = user without verification role`
    )
    .setFooter({
      text: `Total clan members: ${total} • VYRN Clan System`
    })
    .setTimestamp();
}

// ====================== UPDATE ======================
async function updateClanEmbed(client) {
  const now = Date.now();
  if (now - lastUpdate < UPDATE_COOLDOWN) return;
  lastUpdate = now;

  try {
    const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    if (!channel?.isTextBased()) return;

    const guild = channel.guild;

    const messages = await channel.messages.fetch({ limit: 10 });
    const existing = messages.find(m => m.author.id === client.user.id);

    const embed = await buildEmbed(guild);

    if (existing) {
      await existing.edit({ embeds: [embed] }).catch(() => {});
    } else {
      await channel.send({ embeds: [embed] }).catch(() => {});
    }

    console.log(`🖤 Clan embed updated: ${guild.name}`);
  } catch (err) {
    console.error("Clan system error:", err);
  }
}

// ====================== SYSTEM ======================
function startClanSystem(client) {
  console.log("🖤 Clan System (Black Edition) loaded");

  client.once(Events.ClientReady, () => {
    setTimeout(() => updateClanEmbed(client), 10000);
  });

  client.on(Events.GuildMemberUpdate, (oldM, newM) => {
    const roles = [ROLES.LEADER, ROLES.OFFICER, ROLES.MEMBER, ROLES.VERIFIED];

    const changed = roles.some(r =>
      oldM.roles.cache.has(r) !== newM.roles.cache.has(r)
    );

    if (changed) updateClanEmbed(client);
  });

  client.on(Events.GuildMemberAdd, () => updateClanEmbed(client));
  client.on(Events.GuildMemberRemove, () => updateClanEmbed(client));

  setInterval(() => updateClanEmbed(client), 120000);
}

// ====================== INIT ======================
function init(client) {
  startClanSystem(client);
  console.log("🏴 Clan System initialized");
}

module.exports = {
  init,
  startClanSystem,
  updateClanEmbed
};
