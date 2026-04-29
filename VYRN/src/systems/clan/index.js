// =====================================================
// CLAN SYSTEM - VYRN GOLD EDITION 👑
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

const THEME = {
  COLOR: "#FFD700", // Bright Gold
  EMOJIS: {
    LEADER: "👑",
    OFFICER: "🛡️",
    MEMBER: "⚔️",
    VERIFIED: "✅",
    UNVERIFIED: "⚠️",
    LINE: "▬"
  }
};

// ====================== CACHE ======================
let lastUpdate = 0;
const UPDATE_COOLDOWN = 15000; // 15 seconds cooldown

// ====================== FORMAT USER ======================
function formatUser(member, roleName, emoji) {
  const isVerified = member.roles.cache.has(ROLES.VERIFIED);
  const statusEmoji = isVerified ? "" : THEME.EMOJIS.UNVERIFIED;
  const statusText = isVerified ? "" : " `[Unverified]`";

  return `> ${emoji} **${roleName}** ┃ ${member} ${statusEmoji}${statusText}`;
}

// ====================== GET MEMBERS ======================
async function getClanMembers(guild) {
  // Fetching all members to ensure the cache is fully up to date
  await guild.members.fetch({ force: true }).catch(() => {});

  const data = {
    leaders: [],
    officers: [],
    members: []
  };

  for (const member of guild.members.cache.values()) {
    if (member.user.bot) continue;

    if (member.roles.cache.has(ROLES.LEADER)) {
      data.leaders.push(formatUser(member, "LEADER", THEME.EMOJIS.LEADER));
    } else if (member.roles.cache.has(ROLES.OFFICER)) {
      data.officers.push(formatUser(member, "OFFICER", THEME.EMOJIS.OFFICER));
    } else if (member.roles.cache.has(ROLES.MEMBER)) {
      data.members.push(formatUser(member, "MEMBER", THEME.EMOJIS.MEMBER));
    }
  }

  return data;
}

// ====================== EMBED ======================
async function buildEmbed(guild) {
  const { leaders, officers, members } = await getClanMembers(guild);
  const totalMembers = leaders.length + officers.length + members.length;

  // Long separator line for better visual layout
  const separator = THEME.EMOJIS.LINE.repeat(25); 

  return new EmbedBuilder()
    .setColor(THEME.COLOR)
    .setAuthor({
      name: `🏆 ${guild.name.toUpperCase()} • OFFICIAL CLAN ROSTER`,
      iconURL: guild.iconURL({ dynamic: true, size: 64 })
    })
    .setThumbnail(guild.iconURL({ dynamic: true, size: 256 })) // Larger thumbnail for prestige
    .setDescription(
      `Welcome to the official **VYRN** clan roster. Below is the current list of our members.\n\n` +

      `**${THEME.EMOJIS.LEADER} CLAN LEADERS**\n` +
      `${leaders.length ? leaders.join("\n") : "> _None_"}\n\n` +

      `**${THEME.EMOJIS.OFFICER} OFFICERS**\n` +
      `${officers.length ? officers.join("\n") : "> _None_"}\n\n` +

      `**${THEME.EMOJIS.MEMBER} MEMBERS**\n` +
      `${members.length ? members.join("\n") : "> _None_"}\n` +
      `\n${separator}\n` +
      `**📌 INFORMATION**\n` +
      `> Users marked with ${THEME.EMOJIS.UNVERIFIED} \`[Unverified]\` must verify their Roblox account to fully participate in clan events.`
    )
    .setFooter({
      text: `👑 VYRN Clan System • Total members: ${totalMembers}`,
      iconURL: guild.iconURL({ dynamic: true })
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
    
    // Find the bot's existing message to edit (instead of spamming new ones)
    const existing = messages.find(m => m.author.id === client.user.id);
    const embed = await buildEmbed(guild);

    if (existing) {
      await existing.edit({ embeds: [embed] }).catch(err => console.error("Failed to update embed:", err));
    } else {
      await channel.send({ embeds: [embed] }).catch(err => console.error("Failed to send embed:", err));
    }

    console.log(`✨ [VYRN System] Clan roster updated: ${guild.name}`);
  } catch (err) {
    console.error("❌ Clan system error:", err);
  }
}

// ====================== SYSTEM ======================
function startClanSystem(client) {
  console.log("🟡 Clan System (VYRN Gold Edition) loaded");

  // Initial update slightly after bot start
  client.once(Events.ClientReady, () => {
    setTimeout(() => updateClanEmbed(client), 5000);
  });

  // Listen for role updates (e.g., promotions, verifications)
  client.on(Events.GuildMemberUpdate, (oldM, newM) => {
    const rolesToCheck = [ROLES.LEADER, ROLES.OFFICER, ROLES.MEMBER, ROLES.VERIFIED];
    const roleChanged = rolesToCheck.some(role =>
      oldM.roles.cache.has(role) !== newM.roles.cache.has(role)
    );

    if (roleChanged) updateClanEmbed(client);
  });

  // Listen for joins and leaves
  client.on(Events.GuildMemberAdd, () => updateClanEmbed(client));
  client.on(Events.GuildMemberRemove, () => updateClanEmbed(client));

  // Auto-refresh every 2 minutes as a fallback
  setInterval(() => updateClanEmbed(client), 120000);
}

// ====================== INIT ======================
function init(client) {
  startClanSystem(client);
  console.log("🏆 VYRN Clan System initialized successfully.");
}

module.exports = {
  init,
  startClanSystem,
  updateClanEmbed
};
