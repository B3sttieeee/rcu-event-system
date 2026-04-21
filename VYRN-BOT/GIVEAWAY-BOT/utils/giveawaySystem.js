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

function formatTimeLeft(ms) {
  if (ms <= 0) return "Zakończony";
  const seconds = Math.floor(ms / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
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

  const bonusText = Object.entries(BONUS_ROLES)
    .filter(([, bonus]) => bonus > 0)
    .map(([roleId, bonus]) => `<@&${roleId}> → **+${bonus}** losowań`)
    .join("\n") || "Brak bonusów";

  return new EmbedBuilder()
    .setColor("#d4af37")
    .setTitle(`🎉 ${data.prize}`)
    .setDescription(data.description || "Kliknij przycisk poniżej, aby wziąć udział w konkursie!")
    .addFields(
      { 
        name: "🏆 Liczba zwycięzców", 
        value: `\`${data.winners}\``, 
        inline: true 
      },
      { 
        name: "👥 Uczestników", 
        value: `\`${data.users.length}\``, 
        inline: true 
      },
      { 
        name: "⏳ Czas do końca", 
        value: `\`${formatTimeLeft(timeLeft)}\``, 
        inline: true 
      },
      { 
        name: "🎟 System Boostów", 
        value: bonusText, 
        inline: false 
      }
    )
    .setFooter({ 
      text: `Host: ${data.hostId ? `<@${data.hostId}>` : "Nieznany"} • VYRN Giveaway` 
    })
    .setTimestamp();
}

// ====================== CREATE ======================
async function createGiveaway(interaction, options) {
  const duration = parseTime(options.time);
  if (!duration) throw new Error("Nieprawidłowy format czasu! Użyj: 1h, 30m, 2d itp.");

  const giveawayData = {
    guildId: interaction.guild.id,
    channelId: interaction.channel.id,
    messageId: null,
    prize: options.prize,
    winners: Math.max(1, parseInt(options.winners) || 1),
    end: Date.now() + duration,
    users: [],
    ended: false,
    hostId: interaction.user.id,
    description: options.description || null,
    requiredRole: options.requiredRole || null,
    createdAt: Date.now()
  };

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("gw_join")
      .setLabel("🎟 Dołącz")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("gw_leave")
      .setLabel("❌ Wypisz się")
      .setStyle(ButtonStyle.Secondary)
  );

  const embed = buildEmbed(giveawayData);

  const msg = await interaction.channel.send({
    embeds: [embed],
    components: [row]
  });

  giveawayData.messageId = msg.id;
  giveaways.set(msg.id, giveawayData);
  saveDB();

  startTimer(msg);

  await interaction.reply({ 
    content: `✅ **Giveaway został utworzony!**\nID: \`${msg.id}\``, 
    ephemeral: true 
  });
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
      clearInterval(interval);
      data.ended = true;
      saveDB();
      await endGiveaway(message, data);
      return;
    }

    // Aktualizacja embedu co ~7 sekund
    try {
      await message.edit({ embeds: [buildEmbed(data)] });
    } catch (err) {
      if (err.code === 10008) { // Unknown Message
        clearInterval(interval);
      }
    }
  }, 7000);
}

// ====================== END GIVEAWAY ======================
async function endGiveaway(message, data) {
  data.ended = true;
  saveDB();

  if (data.users.length === 0) {
    await message.channel.send("❌ Giveaway zakończony – brak uczestników.").catch(() => {});
    await message.edit({ components: [] }).catch(() => {});
    return;
  }

  // Losowanie zwycięzców (z wagą + bez powtórzeń)
  let weightedUsers = [];
  for (const userId of data.users) {
    const member = await message.guild.members.fetch(userId).catch(() => null);
    if (member) {
      const entries = getEntries(member);
      for (let i = 0; i < entries; i++) {
        weightedUsers.push(userId);
      }
    }
  }

  if (weightedUsers.length === 0) {
    await message.channel.send("❌ Brak ważnych uczestników do losowania.").catch(() => {});
    return;
  }

  // Losowanie unikalnych zwycięzców
  const uniqueWinners = [];
  const winnersCount = Math.min(data.winners, weightedUsers.length);

  for (let i = 0; i < winnersCount; i++) {
    if (weightedUsers.length === 0) break;
    const randomIndex = Math.floor(Math.random() * weightedUsers.length);
    const winnerId = weightedUsers[randomIndex];
    
    uniqueWinners.push(winnerId);
    // Usuwamy wszystkie wystąpienia tego użytkownika (żeby nie wygrał dwa razy)
    weightedUsers = weightedUsers.filter(id => id !== winnerId);
  }

  const winnersMention = uniqueWinners.map(id => `<@${id}>`).join(", ");

  const endEmbed = new EmbedBuilder()
    .setColor("#22c55e")
    .setTitle("🎉 Giveaway Zakończony!")
    .setDescription(`**Nagroda:** ${data.prize}\n\n**Zwycięzc${winnersCount > 1 ? "y" : "a"}:** ${winnersMention}`)
    .setFooter({ text: "VYRN • Giveaway System" })
    .setTimestamp();

  await message.channel.send({ embeds: [endEmbed] }).catch(() => {});
  await message.edit({ components: [] }).catch(() => {});
}

// ====================== REROLL ======================
async function reroll(client, messageId) {
  let data = giveaways.get(messageId);
  if (!data) {
    const allData = loadDB();
    data = allData[messageId];
  }

  if (!data) return "❌ Giveaway o podanym ID nie został znaleziony.";
  if (!data.ended) return "❌ Ten giveaway jeszcze się nie zakończył!";

  // To samo losowanie co przy końcu
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

  if (weightedUsers.length === 0) return "❌ Brak ważnych uczestników do rerolla.";

  const winnersCount = data.winners || 1;
  const uniqueWinners = [];
  for (let i = 0; i < Math.min(winnersCount, weightedUsers.length); i++) {
    const randomIndex = Math.floor(Math.random() * weightedUsers.length);
    const winnerId = weightedUsers[randomIndex];
    uniqueWinners.push(winnerId);
    weightedUsers = weightedUsers.filter(id => id !== winnerId);
  }

  const winnersMention = uniqueWinners.map(id => `<@${id}>`).join(", ");

  return `🎉 **Reroll!**\n**Zwycięzc${winnersCount > 1 ? "y" : "a"}:** ${winnersMention}`;
}

// ====================== BUTTON HANDLER ======================
async function handleGiveaway(interaction) {
  const data = giveaways.get(interaction.message.id);
  if (!data || data.ended) {
    return interaction.reply({ content: "❌ Ten giveaway jest już zakończony.", ephemeral: true });
  }

  const userId = interaction.user.id;

  if (interaction.customId === "gw_join") {
    if (data.users.includes(userId)) {
      return interaction.reply({ content: "✅ Już bierzesz udział w giveaway!", ephemeral: true });
    }
    if (data.requiredRole && !interaction.member.roles.cache.has(data.requiredRole)) {
      return interaction.reply({ content: "❌ Nie posiadasz wymaganej roli do udziału.", ephemeral: true });
    }

    data.users.push(userId);
    saveDB();
    await interaction.reply({ content: "🎟 **Dołączyłeś do giveaway!** Powodzenia!", ephemeral: true });
  } 
  else if (interaction.customId === "gw_leave") {
    if (!data.users.includes(userId)) {
      return interaction.reply({ content: "❌ Nie brałeś udziału w tym giveaway.", ephemeral: true });
    }
    data.users = data.users.filter(id => id !== userId);
    saveDB();
    await interaction.reply({ content: "❌ Zostałeś wypisany z giveaway.", ephemeral: true });
  }

  // Aktualizacja embedu po zmianie
  try {
    await interaction.message.edit({ embeds: [buildEmbed(data)] });
  } catch (err) {}
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
