const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const fs = require("fs");
const path = require("path");

// ====================== CONFIG ======================
const DATA_DIR = process.env.DATA_DIR || "/data";   // <-- ważne dla Railway
const DB_PATH = path.join(DATA_DIR, "giveaways.json");
const DB_TMP_PATH = `${DB_PATH}.tmp`;

const BONUS_ROLES = {
  "1476000458987278397": 1,
  "1476000995501670534": 3,
  "1476000459595448442": 5,
  "1476000991206707221": 7,
  "1476000991823532032": 10,
  "1476000992351879229": 15
};

// ====================== DATABASE ======================
const giveaways = new Map();   // messageId => data
let writeQueue = Promise.resolve();

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`[GIVEAWAY] Data directory created: ${DATA_DIR}`);
  }
}

function loadDB() {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
    return {};
  }
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return raw.trim() ? JSON.parse(raw) : {};
  } catch (err) {
    console.error("❌ Błąd odczytu giveaways.json:", err.message);
    return {};
  }
}

function saveDB() {
  const snapshot = JSON.stringify(Object.fromEntries(giveaways), null, 2);
  writeQueue = writeQueue
    .catch(() => null)
    .then(async () => {
      try {
        await fs.promises.writeFile(DB_TMP_PATH, snapshot, "utf8");
        await fs.promises.rename(DB_TMP_PATH, DB_PATH);
      } catch (err) {
        console.error("❌ Błąd zapisu giveaways.json:", err.message);
      }
    });
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
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
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
    .map(([roleId, bonus]) => `<@&${roleId}> → **+${bonus}**`)
    .join("\n") || "Brak bonusów";

  return new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle(`🎉 ${data.prize}`)
    .setDescription(data.description || "Kliknij przycisk poniżej, aby wziąć udział!")
    .addFields(
      { name: "🏆 Zwycięzców", value: `\`${data.winners}\``, inline: true },
      { name: "👥 Uczestników", value: `\`${data.users.length}\``, inline: true },
      { name: "⏳ Czas do końca", value: `\`${formatTimeLeft(timeLeft)}\``, inline: true },
      { name: "🎟 Boosty ról", value: bonusText, inline: false }
    )
    .setImage(data.image || null)
    .setFooter({ text: `Host: ${data.hostId ? `<@${data.hostId}>` : "Nieznany"} • VYRN` })
    .setTimestamp();
}

// ====================== CREATE GIVEAWAY ======================
async function createGiveaway(interaction, options) {
  const duration = parseTime(options.time);
  if (!duration) throw new Error("Nieprawidłowy format czasu!");

  const giveawayData = {
    guildId: interaction.guild.id,
    channelId: interaction.channel.id,
    messageId: null,
    prize: options.prize,
    winners: Math.max(1, parseInt(options.winners)),
    end: Date.now() + duration,
    users: [],
    ended: false,
    hostId: interaction.user.id,
    description: options.description || null,
    requiredRole: options.requiredRole || null,
    image: options.image || null,
    createdAt: Date.now()
  };

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("gw_join").setLabel("🎟 Dołącz").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("gw_leave").setLabel("❌ Wypisz się").setStyle(ButtonStyle.Secondary)
  );

  const embed = buildEmbed(giveawayData);
  const msg = await interaction.channel.send({ embeds: [embed], components: [row] });

  giveawayData.messageId = msg.id;
  giveaways.set(msg.id, giveawayData);
  saveDB();

  startTimer(msg.id);

  await interaction.reply({
    content: `✅ **Giveaway utworzony!**\nID wiadomości: \`${msg.id}\``,
    ephemeral: true
  });
}

// ====================== TIMER ======================
function startTimer(messageId) {
  const interval = setInterval(async () => {
    const data = giveaways.get(messageId);
    if (!data || data.ended) {
      clearInterval(interval);
      return;
    }

    if (Date.now() >= data.end) {
      clearInterval(interval);
      await endGiveaway(messageId);
      return;
    }

    try {
      const channel = await client.channels.fetch(data.channelId).catch(() => null); // client trzeba przekazać lub globalnie
      if (channel) {
        const message = await channel.messages.fetch(messageId).catch(() => null);
        if (message) await message.edit({ embeds: [buildEmbed(data)] });
      }
    } catch (err) {
      if (err.code === 10008) clearInterval(interval); // wiadomość usunięta
    }
  }, 10000); // co 10 sekund
}

// ====================== END GIVEAWAY ======================
async function endGiveaway(messageId) {
  const data = giveaways.get(messageId);
  if (!data || data.ended) return;

  data.ended = true;
  saveDB();

  try {
    const channel = await client.channels.fetch(data.channelId).catch(() => null);
    if (!channel) return;

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) return;

    if (data.users.length === 0) {
      await message.edit({ components: [] }).catch(() => {});
      await channel.send("❌ Giveaway zakończony – brak uczestników.");
      return;
    }

    // Weighted random
    let weightedUsers = [];
    for (const userId of data.users) {
      const member = await channel.guild.members.fetch(userId).catch(() => null);
      if (member) {
        const entries = getEntries(member);
        for (let i = 0; i < entries; i++) weightedUsers.push(userId);
      }
    }

    if (weightedUsers.length === 0) {
      await channel.send("❌ Brak ważnych uczestników.");
      return;
    }

    const winners = [];
    let pool = [...weightedUsers];
    const count = Math.min(data.winners, pool.length);

    for (let i = 0; i < count; i++) {
      const index = Math.floor(Math.random() * pool.length);
      const winnerId = pool[index];
      winners.push(winnerId);
      pool = pool.filter(id => id !== winnerId);
    }

    const winnersMention = winners.map(id => `<@${id}>`).join(", ");

    const endEmbed = new EmbedBuilder()
      .setColor("#22c55e")
      .setTitle("🎉 Giveaway Zakończony!")
      .setDescription(`**Nagroda:** ${data.prize}\n\n**Zwycięzc${count > 1 ? "y" : "a"}:** ${winnersMention}`)
      .setTimestamp();

    await channel.send({ embeds: [endEmbed] });
    await message.edit({ components: [] }).catch(() => {});

  } catch (err) {
    console.error(`[GIVEAWAY] Błąd kończenia ${messageId}:`, err);
  }
}

// ====================== REROLL ======================
async function reroll(client, messageId, rerollWinners = null) {
  let data = giveaways.get(messageId);
  if (!data) data = loadDB()[messageId];

  if (!data) return "❌ Giveaway nie istnieje.";
  if (!data.ended) return "❌ Giveaway jeszcze się nie zakończył!";

  const winnersCount = rerollWinners ? Math.max(1, parseInt(rerollWinners)) : data.winners;

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

  if (weightedUsers.length === 0) return "❌ Brak ważnych uczestników.";

  const winners = [];
  let pool = [...weightedUsers];
  const count = Math.min(winnersCount, pool.length);

  for (let i = 0; i < count; i++) {
    const index = Math.floor(Math.random() * pool.length);
    const winnerId = pool[index];
    winners.push(winnerId);
    pool = pool.filter(id => id !== winnerId);
  }

  const winnersMention = winners.map(id => `<@${id}>`).join(", ");

  return `🎉 **Reroll zakończony!**\n**Zwycięzców:** ${count}\n**Zwycięzcy:** ${winnersMention}`;
}

// ====================== RESUME ======================
async function resumeGiveaway(client, messageId) {
  let data = giveaways.get(messageId);
  if (!data) {
    const db = loadDB();
    data = db[messageId];
    if (!data || data.ended) return "❌ Giveaway nie istnieje lub został zakończony.";
    giveaways.set(messageId, data);
  }

  const remaining = data.end - Date.now();
  if (remaining <= 0) {
    await endGiveaway(messageId);
    return "✅ Giveaway był po czasie — zakończono go teraz.";
  }

  startTimer(messageId);

  console.log(`[GIVEAWAY] Wznowiono giveaway ${messageId} — pozostało ${Math.floor(remaining/1000)}s`);
  return `✅ Giveaway wznowiony! Zakończy się za ${Math.floor(remaining/60000)} minut.`;
}

// ====================== LOAD ON START ======================
function loadGiveaways(client) {
  const data = loadDB();
  giveaways.clear();

  for (const [id, g] of Object.entries(data)) {
    if (g.ended) continue;
    giveaways.set(id, g);
    const remaining = g.end - Date.now();
    if (remaining > 0) {
      setTimeout(() => endGiveaway(id), remaining);
    } else {
      endGiveaway(id);
    }
  }

  console.log(`🎁 Załadowano ${giveaways.size} giveawayów`);
}

// ====================== EXPORTS ======================
module.exports = {
  createGiveaway,
  handleGiveaway: async (interaction) => {
    // Tu możesz dodać pełną obsługę przycisków gw_join / gw_leave jeśli chcesz
    console.log(`[GIVEAWAY] Button: ${interaction.customId}`);
  },
  reroll,
  loadGiveaways,
  resumeGiveaway,
  endGiveaway
};
