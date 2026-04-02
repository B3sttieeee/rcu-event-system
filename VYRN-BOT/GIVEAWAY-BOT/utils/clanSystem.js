const { EmbedBuilder } = require("discord.js");

// ===== CONFIG
const CHANNEL_ID = "1475992158581559528";

const ROLES = {
  LEADER: "1475570484585168957",
  OFFICER: "1475572271446884535",
  MEMBER: "1475572190337433781",
  VERIFIED: "1475998527191519302"
};

// ===== FORMAT USER
function formatUser(member, label) {
  const isVerified = member.roles.cache.has(ROLES.VERIFIED);

  return `• ${member} — **${label}** ${isVerified ? "" : "`(Not Verified)`"}`;
}

// ===== GET USERS (FIXED 🔥)
async function getClanMembers(guild) {

  // 🔥 NAJWAŻNIEJSZE - pobiera WSZYSTKICH
  await guild.members.fetch();

  const leaders = [];
  const officers = [];
  const members = [];

  guild.members.cache.forEach(member => {
    if (member.user.bot) return;

    const hasLeader = member.roles.cache.has(ROLES.LEADER);
    const hasOfficer = member.roles.cache.has(ROLES.OFFICER);
    const hasMember = member.roles.cache.has(ROLES.MEMBER);
    const hasVerified = member.roles.cache.has(ROLES.VERIFIED);

    // 🥇 PRIORITY SYSTEM
    if (hasLeader) {
      leaders.push(formatUser(member, "LEADER VYRN"));
    } 
    else if (hasOfficer) {
      officers.push(formatUser(member, "OFFICER VYRN"));
    } 
    else if (hasMember) {
      members.push(formatUser(member, "MEMBER VYRN"));
    }
    // 🔥 NOWE: jeśli ma VERIFY ale nie ma rangi → też do members
    else if (hasVerified) {
      members.push(formatUser(member, "MEMBER VYRN"));
    }
  });

  return { leaders, officers, members };
}

// ===== BUILD EMBED
async function buildEmbed(guild) {

  const { leaders, officers, members } = await getClanMembers(guild);

  const embed = new EmbedBuilder()
    .setColor("#0f172a")
    .setAuthor({
      name: `${guild.name} • VYRN Clan`,
      iconURL: guild.iconURL()
    })
    .setDescription(
`🏆 **LEADERS**
${leaders.length ? leaders.join("\n") : "_No leaders_"}

━━━━━━━━━━━━━━━━━━

🛡 **OFFICERS**
${officers.length ? officers.join("\n") : "_No officers_"}

━━━━━━━━━━━━━━━━━━

👥 **MEMBERS**
${members.length ? members.join("\n") : "_No members_"}

━━━━━━━━━━━━━━━━━━

🔒 *Users without verification are marked*`
    )
    .setFooter({
      text: `Total Clan: ${leaders.length + officers.length + members.length}`
    })
    .setTimestamp();

  return embed;
}

// ===== UPDATE EMBED
async function updateClanEmbed(client) {
  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const guild = channel.guild;

  const messages = await channel.messages.fetch({ limit: 10 });
  let msg = messages.find(m => m.author.id === client.user.id);

  const embed = await buildEmbed(guild);

  if (msg) {
    await msg.edit({ embeds: [embed] });
  } else {
    await channel.send({ embeds: [embed] });
  }
}

// ===== SYSTEM
function startClanSystem(client) {

  client.once("ready", () => {
    updateClanEmbed(client);

    setInterval(() => {
      updateClanEmbed(client);
    }, 30000);
  });

  client.on("guildMemberUpdate", () => {
    updateClanEmbed(client);
  });

  client.on("guildMemberAdd", () => {
    updateClanEmbed(client);
  });

  client.on("guildMemberRemove", () => {
    updateClanEmbed(client);
  });
}

module.exports = {
  startClanSystem
};
