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
  COLOR: "#FFD700", // Świecące Złoto
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
const UPDATE_COOLDOWN = 15000; // 15 sekund cooldownu

// ====================== FORMAT USER ======================
function formatUser(member, roleName, emoji) {
  const isVerified = member.roles.cache.has(ROLES.VERIFIED);
  const statusEmoji = isVerified ? "" : THEME.EMOJIS.UNVERIFIED;
  const statusText = isVerified ? "" : " `[Brak Weryfikacji]`";

  return `> ${emoji} **${roleName}** ┃ ${member} ${statusEmoji}${statusText}`;
}

// ====================== GET MEMBERS ======================
async function getClanMembers(guild) {
  // Pobieranie wszystkich członków serwera, aby lista była zawsze aktualna
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

  // Długie linie oddzielające dla lepszego efektu wizualnego
  const separator = THEME.EMOJIS.LINE.repeat(25); 

  return new EmbedBuilder()
    .setColor(THEME.COLOR)
    .setAuthor({
      name: `🏆 ${guild.name.toUpperCase()} • OFICJALNY SKŁAD KLANU`,
      iconURL: guild.iconURL({ dynamic: true, size: 64 })
    })
    .setThumbnail(guild.iconURL({ dynamic: true, size: 256 })) // Powiększona miniatura dla prestiżu
    .setDescription(
      `Witamy w oficjalnym zestawieniu klanu **VYRN**. Poniżej znajduje się aktualna lista naszych członków.\n\n` +

      `**${THEME.EMOJIS.LEADER} ZARZĄD KLANU (LEADERS)**\n` +
      `${leaders.length ? leaders.join("\n") : "> _Brak liderów_"}\n\n` +

      `**${THEME.EMOJIS.OFFICER} OFICEROWIE (OFFICERS)**\n` +
      `${officers.length ? officers.join("\n") : "> _Brak oficerów_"}\n\n` +

      `**${THEME.EMOJIS.MEMBER} CZŁONKOWIE (MEMBERS)**\n` +
      `${members.length ? members.join("\n") : "> _Brak członków_"}\n` +
      `\n${separator}\n` +
      `**📌 INFORMACJE**\n` +
      `> Osoby z oznaczeniem ${THEME.EMOJIS.UNVERIFIED} \`[Brak Weryfikacji]\` muszą zweryfikować swoje konto Roblox, aby w pełni uczestniczyć w eventach klanowych.`
    )
    .setFooter({
      text: `👑 VYRN Clan System • Łącznie w klanie: ${totalMembers}`,
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
    
    // Szukanie wiadomości bota, aby ją zaktualizować (zamiast wysyłać nową)
    const existing = messages.find(m => m.author.id === client.user.id);
    const embed = await buildEmbed(guild);

    if (existing) {
      await existing.edit({ embeds: [embed] }).catch(err => console.error("Nie udało się zaktualizować embeda:", err));
    } else {
      await channel.send({ embeds: [embed] }).catch(err => console.error("Nie udało się wysłać embeda:", err));
    }

    console.log(`✨ [VYRN System] Zaktualizowano listę klanu: ${guild.name}`);
  } catch (err) {
    console.error("❌ Błąd systemu klanowego:", err);
  }
}

// ====================== SYSTEM ======================
function startClanSystem(client) {
  console.log("🟡 Clan System (VYRN Gold Edition) loaded");

  // Aktualizacja chwilę po starcie bota
  client.once(Events.ClientReady, () => {
    setTimeout(() => updateClanEmbed(client), 5000);
  });

  // Nasłuchiwanie zmian ról (gdy ktoś dostanie awans/weryfikację)
  client.on(Events.GuildMemberUpdate, (oldM, newM) => {
    const rolesToCheck = [ROLES.LEADER, ROLES.OFFICER, ROLES.MEMBER, ROLES.VERIFIED];
    const roleChanged = rolesToCheck.some(role =>
      oldM.roles.cache.has(role) !== newM.roles.cache.has(role)
    );

    if (roleChanged) updateClanEmbed(client);
  });

  // Nasłuchiwanie wejść/wyjść z serwera
  client.on(Events.GuildMemberAdd, () => updateClanEmbed(client));
  client.on(Events.GuildMemberRemove, () => updateClanEmbed(client));

  // Automatyczne odświeżanie co 2 minuty jako zabezpieczenie
  setInterval(() => updateClanEmbed(client), 120000);
}

// ====================== INIT ======================
function init(client) {
  startClanSystem(client);
  console.log("🏆 System Klanowy VYRN zainicjowany pomyślnie.");
}

module.exports = {
  init,
  startClanSystem,
  updateClanEmbed
};
