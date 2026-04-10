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
  "1476000458987278397": 1,   // Level 5
  "1476000995501670534": 3,   // Level 15
  "1476000459595448442": 5,   // Level 30
  "1476000991206707221": 7,   // Level 45
  "1476000991823532032": 10,  // Level 60
  "1476000992351879229": 15   // Level 75
};

const REQUIRED_ROLE_TO_CREATE = "1476000458987278397"; // Level 5+

// ====================== DATABASE ======================
const giveaways = new Map(); // messageId => data

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
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
  if (!data || data.ended) return false;

  try {
    const channel = await client.channels.fetch(data.channelId).catch(() => null);
    if (!channel) return false;

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) return false;

    startTimer(message);
    return true;
  } catch (err) {
    console.error(`❌ Błąd przy wznawianiu giveaway ${messageId}:`, err.message);
    return false;
  }
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
    default: return null;
  }
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function getEntries(member) {
  let entries = 1;
  for (const [roleId, bonus] of Object.entries(BONUS_ROLES)) {
    if (member.roles.cache.has(roleId)) {
      entries += bonus;
    }
  }
  return entries;
}

// ====================== EMBED ======================
function buildEmbed(data) {
  const now = Date.now();
  const timeLeft = Math.max(0, data.end - now);

  return new EmbedBuilder()
    .setColor("#d4af37")
    .setTitle(`🎉 ${data.prize}`)
    .setDescription(data.description || "Kliknij przycisk poniżej, aby dołączyć!")
    .addFields(
      { name: "🏆 Zwycięzców", value: `\`${data.winners}\``, inline: true },
      { name: "👥 Uczestników", value: `\`${data.users.length}\``, inline: true },
      { name: "⏳ Czas do końca", value: `\`${formatTime(timeLeft)}\``, inline: true },
      {
        name: "🎟 System Boostów",
        value: Object.entries(BONUS_ROLES)
          .map(([roleId, bonus]) => `<@&${roleId}> → **+${bonus}** losów`)
          .join("\n"),
        inline: false
      }
    )
    .setFooter({ text: "VYRN • Giveaway System" })
    .setTimestamp();
}

// ====================== CREATE GIVEAWAY ======================
async function createGiveaway(interaction, options) {
  if (REQUIRED_ROLE_TO_CREATE && !interaction.member.roles.cache.has(REQUIRED_ROLE_TO_CREATE)) {
    throw new Error("Nie masz wystarczających uprawnień do tworzenia giveawayów.");
  }

  const duration = parseTime(options.time);
  if (!duration) throw new Error("Nieprawidłowy format czasu (np. 30m, 2h, 1d)");

  const giveawayData = {
    guildId: interaction.guild.id,
    channelId: interaction.channel.id,
    messageId: null,
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
  const msg = await interaction.channel.send({ embeds: [embed], components: [row] });

  giveawayData.messageId = msg.id;
  giveaways.set(msg.id, giveawayData);
  saveDB();

  startTimer(msg);

  await interaction.reply({
    content: `✅ Giveaway utworzony!\n**ID:** \`${msg.id}\``,
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

    try {
      await message.edit({ embeds: [buildEmbed(data)] }).catch(() => {});
    } catch (err) {
      if (err.code === 10008) {
        giveaways.delete(message.id);
        saveDB();
        clearInterval(interval);
      }
    }

    // Automatyczne zakończenie
    if (Date.now() >= data.end && !data.ended) {
      console.log(`[TIMER] Automatycznie kończę giveaway: ${message.id}`);
      data.ended = true;
      clearInterval(interval);
      await endGiveaway(message, data).catch(console.error);
    }
  }, 8000); // co 8 sekund (szybciej niż wcześniej)
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
  const guild = message.guild;

  for (const userId of data.users) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) continue;
    const entries = getEntries(member);
    for (let i = 0; i < entries; i++) {
      weightedUsers.push(userId);
    }
  }

  if (weightedUsers.length === 0) {
    await message.channel.send("❌ Nie udało się wylosować zwycięzców.").catch(() => {});
    return;
  }

  const winners = [];
  const winnerCount = Math.min(data.winners, weightedUsers.length);

  for (let i = 0; i < winnerCount; i++) {
    const randomIndex = Math.floor(Math.random() * weightedUsers.length);
    const winnerId = weightedUsers.splice(randomIndex, 1)[0];
    if (!winners.includes(winnerId)) winners.push(winnerId);
  }

  const winnerMentions = winners.map(id => `<@${id}>`).join(", ");

  const endEmbed = new EmbedBuilder()
    .setColor("#22c55e")
    .setTitle("🎉 Giveaway Zakończony!")
    .setDescription(`**Nagroda:** ${data.prize}\n**Zwycięzcy:** ${winnerMentions}`)
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

  if (!data) {
    return "❌ Giveaway o podanym ID nie został znaleziony.";
  }

  // Automatyczne oznaczenie jako ended, jeśli czas już minął
  if (!data.ended && Date.now() >= data.end) {
    data.ended = true;
    saveDB();
    console.log(`[REROLL] Automatycznie oznaczono jako ended: ${messageId}`);
  }

  if (!data.ended) {
    return "❌ Ten giveaway jeszcze się nie zakończył!";
  }

  if (!data.users || data.users.length === 0) {
    return "❌ Brak uczestników do rerolla.";
  }

  let weightedUsers = [];
  try {
    const guild = await client.guilds.fetch(data.guildId).catch(() => null);
    if (!guild) return "❌ Nie mogę znaleźć serwera.";

    for (const userId of data.users) {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) continue;

      const entries = getEntries(member);
      for (let i = 0; i < entries; i++) {
        weightedUsers.push(userId);
      }
    }
  } catch (e) {
    console.error("Błąd przy rerollu:", e);
  }

  if (weightedUsers.length === 0) {
    return "❌ Żaden z uczestników nie jest już na serwerze.";
  }

  const winnerId = weightedUsers[Math.floor(Math.random() * weightedUsers.length)];

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
    if (data.users.includes(userId)) {
      return interaction.reply({ content: "✅ Już bierzesz udział!", ephemeral: true });
    }
    if (data.requiredRole && !interaction.member.roles.cache.has(data.requiredRole)) {
      return interaction.reply({ content: "❌ Nie posiadasz wymaganej roli.", ephemeral: true });
    }

    data.users.push(userId);
    saveDB();
    await interaction.reply({ content: "🎟 Dołączyłeś do giveaway!", ephemeral: true });
  }

  if (interaction.customId === "gw_leave") {
    if (!data.users.includes(userId)) {
      return interaction.reply({ content: "❌ Nie brałeś udziału.", ephemeral: true });
    }
    data.users = data.users.filter(id => id !== userId);
    saveDB();
    await interaction.reply({ content: "❌ Wypisałeś się z giveaway.", ephemeral: true });
  }

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
