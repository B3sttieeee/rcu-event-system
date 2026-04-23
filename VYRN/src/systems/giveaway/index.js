// src/systems/giveaway/index.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || "/data";
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

const giveaways = new Map();
let writeQueue = Promise.resolve();
let client;

// ====================== DATABASE ======================
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
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return raw.trim() ? JSON.parse(raw) : {};
  } catch (err) {
    console.error("❌ [GIVEAWAY] Load error:", err.message);
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
        console.error("❌ [GIVEAWAY] Save error:", err.message);
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

// ====================== BUILD EMBED ======================
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
    .setFooter({
      text: `Host: ${data.hostId ? `<@${data.hostId}>` : "Nieznany"} • VYRN`,
    })
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

  await interaction.editReply({
    content: `✅ **Giveaway utworzony pomyślnie!**\nID wiadomości: \`${msg.id}\``,
    flags: 64
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
      const channel = await client.channels.fetch(data.channelId).catch(() => null);
      if (channel) {
        const message = await channel.messages.fetch(messageId).catch(() => null);
        if (message) {
          await message.edit({ embeds: [buildEmbed(data)] });
        }
      }
    } catch (err) {
      if (err.code === 10008) clearInterval(interval);
    }
  }, 10000);
}

// ====================== END GIVEAWAY (z % szans) ======================
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
      await message.edit({ embeds: [buildEmbed(data)], components: [] }).catch(() => {});
      await channel.send("❌ Giveaway zakończony – brak uczestników.");
      return;
    }

    let weightedUsers = [];
    const userChances = new Map();

    for (const userId of data.users) {
      const member = await channel.guild.members.fetch(userId).catch(() => null);
      if (member) {
        const entries = getEntries(member);
        userChances.set(userId, entries);
        for (let i = 0; i < entries; i++) weightedUsers.push(userId);
      }
    }

    const totalEntries = weightedUsers.length;
    if (totalEntries === 0) {
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

    const winnerLines = winners.map(winnerId => {
      const chance = userChances.get(winnerId) || 1;
      const percent = totalEntries > 0 ? ((chance / totalEntries) * 100).toFixed(1) : "0";
      return `• <@${winnerId}> — **${percent}%** szans`;
    }).join("\n");

    const endEmbed = new EmbedBuilder()
      .setColor("#22c55e")
      .setTitle("🎉 GIVEAWAY ZAKOŃCZONY!")
      .setDescription(
        `**Nagroda:** ${data.prize}\n\n` +
        `**Zwycięzcy:**\n${winnerLines}\n\n` +
        `Łączna pula losowań: **${totalEntries}**`
      )
      .setImage(data.image || null)
      .setTimestamp();

    await message.edit({ embeds: [endEmbed], components: [] }).catch(() => {});

    console.log(`[GIVEAWAY] Giveaway ${messageId} zakończony.`);

  } catch (err) {
    console.error(`[GIVEAWAY] End error ${messageId}:`, err);
  }
}

// ====================== HANDLE BUTTONS ======================
async function handleGiveaway(interaction) {
  const customId = interaction.customId;
  const messageId = interaction.message.id;
  const data = giveaways.get(messageId);

  if (!data || data.ended) {
    return interaction.reply({ content: "❌ Ten giveaway już się zakończył.", flags: 64 });
  }

  const userId = interaction.user.id;

  if (customId === "gw_join") {
    if (data.users.includes(userId)) {
      return interaction.reply({ content: "✅ Już jesteś zapisany.", flags: 64 });
    }
    data.users.push(userId);
    saveDB();

    await interaction.reply({ content: "🎟 Dołączyłeś!", flags: 64 });
    await interaction.message.edit({ embeds: [buildEmbed(data)] }).catch(() => {});

  } else if (customId === "gw_leave") {
    if (!data.users.includes(userId)) {
      return interaction.reply({ content: "❌ Nie jesteś zapisany.", flags: 64 });
    }
    data.users = data.users.filter(id => id !== userId);
    saveDB();

    await interaction.reply({ content: "❌ Zostałeś wypisany.", flags: 64 });
    await interaction.message.edit({ embeds: [buildEmbed(data)] }).catch(() => {});
  }
}

// ====================== REROLL ======================
async function reroll(interaction, messageId) {
  const data = giveaways.get(messageId) || loadDB()[messageId];
  if (!data) return interaction.reply({ content: "❌ Giveaway nie znaleziony.", flags: 64 });
  if (!data.ended) return interaction.reply({ content: "❌ Giveaway jeszcze się nie zakończył!", flags: 64 });

  let weightedUsers = [];
  const userChances = new Map();

  for (const userId of data.users) {
    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    if (member) {
      const entries = getEntries(member);
      userChances.set(userId, entries);
      for (let i = 0; i < entries; i++) weightedUsers.push(userId);
    }
  }

  if (weightedUsers.length === 0) {
    return interaction.reply({ content: "❌ Brak ważnych uczestników do rerollu.", flags: 64 });
  }

  const totalEntries = weightedUsers.length;
  const winners = [];
  let pool = [...weightedUsers];
  const count = Math.min(data.winners, pool.length);

  for (let i = 0; i < count; i++) {
    const index = Math.floor(Math.random() * pool.length);
    const winnerId = pool[index];
    winners.push(winnerId);
    pool = pool.filter(id => id !== winnerId);
  }

  const winnerLines = winners.map(winnerId => {
    const chance = userChances.get(winnerId) || 1;
    const percent = totalEntries > 0 ? ((chance / totalEntries) * 100).toFixed(1) : "0";
    return `• <@${winnerId}> — **${percent}%** szans`;
  }).join("\n");

  const rerollEmbed = new EmbedBuilder()
    .setColor("#eab308")
    .setTitle("🔄 REROLL GIVEAWAY")
    .setDescription(
      `**Nagroda:** ${data.prize}\n\n` +
      `**Nowi zwycięzcy:**\n${winnerLines}\n\n` +
      `Łączna pula losowań: **${totalEntries}**`
    )
    .setImage(data.image || null)
    .setTimestamp();

  await interaction.reply({ embeds: [rerollEmbed] });
}

// ====================== INIT ======================
function init(botClient) {
  client = botClient;
  const data = loadDB();
  giveaways.clear();

  let loaded = 0;

  for (const [id, g] of Object.entries(data)) {
    if (g.ended) continue;
    giveaways.set(id, g);
    loaded++;

    const remaining = g.end - Date.now();
    if (remaining > 0) {
      setTimeout(() => endGiveaway(id), remaining);
    } else {
      endGiveaway(id);
    }
  }

  console.log(`🎁 Giveaway System załadowany (${loaded} aktywnych)`);
}

module.exports = {
  init,
  createGiveaway,
  handleGiveaway,
  endGiveaway,
  reroll
};
