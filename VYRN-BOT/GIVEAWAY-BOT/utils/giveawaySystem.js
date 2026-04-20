const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const fs = require("fs");
const path = require("path");

// ====================== CONFIG ======================
const DATA_DIR = "./data";
const DB_PATH = path.join(DATA_DIR, "giveaways.json");
const BONUS_ROLES = {
  "1476000458987278397": 1,
  "1476000995501670534": 3,
  "1476000459595448442": 5,
  "1476000991206707221": 7,
  "1476000991823532032": 10,
  "1476000992351879229": 15
};
const REQUIRED_ROLE_TO_CREATE = "1476000458987278397";

// ====================== DATABASE ======================
const giveaways = new Map();

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadDB() {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch (err) {
    console.error("❌ Błąd odczytu giveaways.json:", err.message);
    return {};
  }
}

function saveDB() {
  try {
    const data = Object.fromEntries(giveaways);
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Błąd zapisu giveaways.json:", err.message);
  }
}

// ====================== LOAD & RESUME ======================
function loadGiveaways(client) {
  const data = loadDB();
  giveaways.clear();
  for (const [messageId, giveawayData] of Object.entries(data)) {
    giveaways.set(messageId, giveawayData);
    if (!giveawayData.ended) {
      resumeGiveaway(client, messageId);
    }
  }
  console.log(`🎁 Załadowano ${giveaways.size} giveawayów`);
}

async function resumeGiveaway(client, messageId) {
  const data = giveaways.get(messageId);
  if (!data || data.ended) return;
  try {
    const channel = await client.channels.fetch(data.channelId).catch(() => null);
    if (!channel) return;
    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (message) startTimer(message);
  } catch (e) {}
}

// ====================== HELPERS ======================
function parseTime(timeStr) {
  const match = timeStr.match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case "s": return num * 1000;
    case "m": return num * 60000;
    case "h": return num * 3600000;
    case "d": return num * 86400000;
  }
  return null;
}

function getEntries(member) {
  let entries = 1;
  for (const [roleId, bonus] of Object.entries(BONUS_ROLES)) {
    if (member.roles.cache.has(roleId)) entries += bonus;
  }
  return entries;
}

function buildEmbed(data) {
  const timeLeft = Math.max(0, data.end - Date.now());
  const totalEntries = data.users.length;
  
  // Oblicz całkowitą liczbę wpisów z uwagi na boosty
  let totalWeightedEntries = 0;
  if (data.users && data.users.length > 0) {
    for (const userId of data.users) {
      const member = data.guildId ? { roles: { cache: new Map() } } : null; // tymczasowo
      // W praktyce to trzeba by pobrać member z serwera
      totalWeightedEntries += 1; // Up prosty sposób, ale można to lepiej
    }
  }

  return new EmbedBuilder()
    .setColor("#d4af37")
    .setTitle(`🎉 ${data.prize}`)
    .setDescription(data.description || "Kliknij przycisk poniżej, aby dołączyć!")
    .addFields(
      { name: "🏆 Zwycięzców", value: `\`${data.winners}\``, inline: true },
      { name: "👥 Uczestników", value: `\`${totalEntries}\``, inline: true },
      { name: "⏳ Czas do końca", value: `\`${formatTimeLeft(timeLeft)}\``, inline: true },
      { name: "🎟 System Boostów", value: Object.entries(BONUS_ROLES).map(([r, b]) => `<@&${r}> → **+${b}**`).join("\n"), inline: false }
    )
    .setFooter({ text: "VYRN • Giveaway System" })
    .setTimestamp();
}

// Pomocnicza funkcja do formatowania czasu
function formatTimeLeft(ms) {
  if (ms < 0) return "0s";
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// ====================== CREATE ======================
async function createGiveaway(interaction, options) {
  const duration = parseTime(options.time);
  if (!duration) throw new Error("Nieprawidłowy format czasu!");
  
  const giveawayData = {
    guildId: interaction.guild.id,
    channelId: interaction.channel.id,
    prize: options.prize,
    winners: parseInt(options.winners) || 1,
    end: Date.now() + duration,
    users: [],
    ended: false,
    hostId: interaction.user.id,
    description: options.description || null,
    requiredRole: options.requiredRole || null,
    createdAt: Date.now()
  };
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("gw_join").setLabel("🎟 Dołącz").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("gw_leave").setLabel("❌ Wypisz się").setStyle(ButtonStyle.Secondary)
  );
  
  const msg = await interaction.channel.send({
    embeds: [buildEmbed(giveawayData)],
    components: [row]
  });
  
  giveawayData.messageId = msg.id;
  giveaways.set(msg.id, giveawayData);
  saveDB();
  startTimer(msg);
  await interaction.reply({ content: `✅ Giveaway utworzony! ID: \`${msg.id}\``, ephemeral: true });
}

// ====================== TIMER ======================
function startTimer(message) {
  const interval = setInterval(async () => {
    const data = giveaways.get(message.id);
    if (!data || data.ended) {
      clearInterval(interval);
      return;
    }
    if (Date.now() >= data.end) {
      console.log(`[TIMER] Czas minął → kończę giveaway ${message.id}`);
      data.ended = true;
      clearInterval(interval);
      await endGiveaway(message, data);
      return;
    }
    try {
      await message.edit({ embeds: [buildEmbed(data)] }).catch(() => {});
    } catch (err) {
      console.error("❌ Błąd edycji embedu:", err.message);
    }
  }, 7000);
}

// ====================== END GIVEAWAY ======================
async function endGiveaway(message, data) {
  data.ended = true;
  saveDB();
  
  if (data.users.length === 0) {
    await message.channel.send("❌ Giveaway zakończony – brak uczestników.").catch(() => {});
    return;
  }
  
  let weightedUsers = [];
  const guild = await message.guild.fetch().catch(() => null);
  if (!guild) {
    await message.channel.send("❌ Nie mogę pobrać informacji o serwerze.").catch(() => {});
    return;
  }
  
  for (const userId of data.users) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) {
      const entries = getEntries(member);
      for (let i = 0; i < entries; i++) weightedUsers.push(userId);
    }
  }
  
  if (weightedUsers.length === 0) {
    await message.channel.send("❌ Brak ważnych uczestników.").catch(() => {});
    return;
  }
  
  // Losowanie zwycięzców
  const winners = [];
  const uniqueWinners = new Set();
  
  while (winners.length < data.winners && weightedUsers.length > 0) {
    const randomIndex = Math.floor(Math.random() * weightedUsers.length);
    const winnerId = weightedUsers[randomIndex];
    
    if (!uniqueWinners.has(winnerId)) {
      uniqueWinners.add(winnerId);
      winners.push(winnerId);
      
      // Usuń wylosowanego uczestnika z listy (jeśli nie ma boostów, to usuwa jedno wystąpienie)
      weightedUsers.splice(randomIndex, 1);
    } else {
      // Jeśli już wylosowano tego samego użytkownika, usuń losowo inną pozycję
      weightedUsers.splice(randomIndex, 1);
    }
  }
  
  if (winners.length === 0) {
    await message.channel.send("❌ Nie udało się wylosować zwycięzców.").catch(() => {});
    return;
  }
  
  // Tworzenie wiadomości z wynikami
  const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
  
  const endEmbed = new EmbedBuilder()
    .setColor("#22c55e")
    .setTitle("🎉 Giveaway Zakończony!")
    .setDescription(`**Nagroda:** ${data.prize}\n\n**Zwycięzcy:** ${winnerMentions}`)
    .addFields(
      { name: "🏆 Liczba zwycięzców", value: `\`${winners.length}\``, inline: true },
      { name: "👥 Całkowita liczba uczestników", value: `\`${data.users.length}\``, inline: true }
    )
    .setTimestamp();
  
  await message.channel.send({ embeds: [endEmbed] }).catch(() => {});
  await message.edit({ components: [] }).catch(() => {});
}

// ====================== REROLL (z pełnymi logami) ======================
async function reroll(client, messageId) {
  console.log(`[REROLL] === ROZPOCZYNAM REROLL DLA ID: ${messageId} ===`);
  let data = giveaways.get(messageId);
  console.log(`[REROLL] W pamięci (Map): ${data ? "✅ ZNALEZIONO" : "❌ NIE MA"}`);
  
  if (!data) {
    console.log(`[REROLL] Szukam w giveaways.json...`);
    const allData = loadDB();
    data = allData[messageId];
    console.log(`[REROLL] W pliku JSON: ${data ? "✅ ZNALEZIONO" : "❌ NIE MA"}`);
  }
  
  if (!data) {
    console.log(`[REROLL] ❌ GIVEAWAY CAŁKOWICIE NIE ZNALEZIONY!`);
    return "❌ Giveaway o podanym ID nie został znaleziony.";
  }
  
  console.log(`[REROLL] Dane giveawayu → ended: ${data.ended} | users: ${data.users?.length || 0} | guildId: ${data.guildId}`);
  
  if (!data.ended && Date.now() >= data.end) {
    data.ended = true;
    saveDB();
    console.log(`[REROLL] ✅ Automatycznie oznaczono jako ended`);
  }
  
  if (!data.ended) return "❌ Ten giveaway jeszcze się nie zakończył!";
  
  if (!data.users || data.users.length === 0) {
    return "❌ Brak uczestników do rerolla.";
  }
  
  let weightedUsers = [];
  const guild = await client.guilds.fetch(data.guildId).catch(() => null);
  if (!guild) return "❌ Nie mogę znaleźć serwera.";
  
  for (const userId of data.users) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) {
      const entries = getEntries(member);
      for (let i = 0; i < entries; i++) weightedUsers.push(userId);
    }
  }
  
  if (weightedUsers.length === 0) return "❌ Żaden uczestnik nie jest już na serwerze.";
  
  // Losowanie jednego zwycięzcy
  const randomIndex = Math.floor(Math.random() * weightedUsers.length);
  const winnerId = weightedUsers[randomIndex];
  
  console.log(`[REROLL] ✅ Sukces - wylosowano: ${winnerId}`);
  
  return `🎉 **Reroll!** Nowy zwycięzca:\n<@${winnerId}>`;
}

// ====================== BUTTON HANDLER ======================
async function handleGiveaway(interaction) {
  const data = giveaways.get(interaction.message.id);
  if (!data || data.ended) {
    return interaction.reply({ content: "❌ Ten giveaway jest już zakończony.", ephemeral: true });
  }
  
  const userId = interaction.user.id;
  
  if (interaction.customId === "gw_join") {
    if (data.users.includes(userId)) return interaction.reply({ content: "✅ Już bierzesz udział!", ephemeral: true });
    
    if (data.requiredRole && !interaction.member.roles.cache.has(data.requiredRole)) {
      return interaction.reply({ content: "❌ Nie posiadasz wymaganej roli.", ephemeral: true });
    }
    
    data.users.push(userId);
    saveDB();
    await interaction.reply({ content: "🎟 Dołączyłeś do giveaway!", ephemeral: true });
  }
  
  if (interaction.customId === "gw_leave") {
    if (!data.users.includes(userId)) return interaction.reply({ content: "❌ Nie brałeś udziału.", ephemeral: true });
    data.users = data.users.filter(id => id !== userId);
    saveDB();
    await interaction.reply({ content: "❌ Wypisałeś się z giveaway.", ephemeral: true });
  }
  
  try {
    await interaction.message.edit({ embeds: [buildEmbed(data)] });
  } catch (err) {
    console.error("❌ Błąd edycji embedu:", err.message);
  }
}

// ====================== EXPORTS ======================
module.exports = {
  createGiveaway,
  handleGiveaway,
  reroll,
  loadGiveaways,
  resumeGiveaway,
  endGiveaway
};
