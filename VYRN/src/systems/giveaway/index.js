// src/systems/giveaway/index.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const fs = require("fs");
const path = require("path");

// =====================================================
// VYRN HQ • PRESTIGE GIVEAWAY ENGINE 🎁
// =====================================================
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "giveaways.json");
const DB_TMP_PATH = `${DB_PATH}.tmp`;

// Multipliers for specific ranks/roles
const BONUS_ROLES = {
  "1476000458987278397": 1,   // Bronze
  "1476000995501670534": 3,   // Gold
  "1476000459595448442": 5,   // Platinum
  "1476000991206707221": 7,   // Diamond
  "1476000991823532032": 10,  // Ruby
  "1476000992351879229": 15   // Legend
};

const giveaways = new Map();
let writeQueue = Promise.resolve();
let client;

// ====================== DATABASE ======================
function loadDB() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) return {};
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
  writeQueue = writeQueue.catch(() => null).then(async () => {
    try {
      await fs.promises.writeFile(DB_TMP_PATH, snapshot, "utf8");
      await fs.promises.rename(DB_TMP_PATH, DB_PATH);
    } catch (err) { console.error("❌ [GIVEAWAY] Save error:", err.message); }
  });
}

// ====================== HELPERS ======================
function parseTime(timeStr) {
  const match = timeStr.match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * multipliers[unit];
}

function getEntries(member) {
  let entries = 1;
  for (const [roleId, bonus] of Object.entries(BONUS_ROLES)) {
    if (member.roles.cache.has(roleId)) entries += bonus;
  }
  return entries;
}

// ====================== VISUALS (VYRN GOLD) ======================
function buildEmbed(data, isEnded = false) {
  const remaining = data.end - Date.now();
  const timestamp = Math.floor(data.end / 1000);

  const bonusText = Object.entries(BONUS_ROLES)
    .map(([roleId, bonus]) => `<@&${roleId}> → **+${bonus} Tickets**`)
    .join("\n") || "No active role bonuses.";

  const embed = new EmbedBuilder()
    .setColor(isEnded ? "#FFFFFF" : "#FFD700")
    .setAuthor({ name: "VYRN HQ • OFFICIAL GIVEAWAY", iconURL: client.guilds.cache.get(data.guildId)?.iconURL() })
    .setTitle(`🎉 ${data.prize}`)
    .setImage(data.image || null)
    .setTimestamp();

  if (!isEnded) {
    embed.setDescription(
      `${data.description ? `> ${data.description}\n\n` : ""}` +
      `**Ends In:** <t:${timestamp}:R>\n` +
      `**Winners:** \`${data.winners}\`\n` +
      `**Entries:** \`${data.users.length}\` members\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `**🏆 ROLE BONUSES (STACKING)**\n${bonusText}`
    )
    .setFooter({ text: `Hosted by ${client.users.cache.get(data.hostId)?.tag || "VYRN Staff"}` });
  }

  return embed;
}

// ====================== CORE ACTIONS ======================
async function createGiveaway(interaction, options) {
  const duration = parseTime(options.time);
  if (!duration) throw new Error("Invalid time format! Use 1h, 30m, 2d etc.");

  const giveawayData = {
    guildId: interaction.guild.id,
    channelId: options.channelId || interaction.channel.id,
    messageId: null,
    prize: options.prize,
    winners: Math.max(1, parseInt(options.winners)),
    end: Date.now() + duration,
    users: [],
    ended: false,
    hostId: interaction.user.id,
    description: options.description || null,
    image: options.image || null,
    requirementId: options.requirementId || null
  };

  const channel = interaction.guild.channels.cache.get(giveawayData.channelId);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("gw_join").setLabel("🎟 Join").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("gw_leave").setLabel("Leave").setStyle(ButtonStyle.Secondary)
  );

  const msg = await channel.send({ embeds: [buildEmbed(giveawayData)], components: [row] });
  giveawayData.messageId = msg.id;
  giveaways.set(msg.id, giveawayData);
  saveDB();

  startTimer(msg.id);
}

function startTimer(messageId) {
  const interval = setInterval(async () => {
    const data = giveaways.get(messageId);
    if (!data || data.ended) return clearInterval(interval);

    if (Date.now() >= data.end) {
      clearInterval(interval);
      return await endGiveaway(messageId);
    }

    const channel = client.channels.cache.get(data.channelId);
    if (!channel) return clearInterval(interval);
    
    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) return clearInterval(interval);

    await message.edit({ embeds: [buildEmbed(data)] }).catch(() => {});
  }, 15000); // Updated every 15s to prevent rate limits
}

async function endGiveaway(messageId) {
  const data = giveaways.get(messageId);
  if (!data || data.ended) return;

  data.ended = true;
  saveDB();

  const channel = await client.channels.fetch(data.channelId).catch(() => null);
  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!channel || !message) return;

  if (data.users.length === 0) {
    const failEmbed = buildEmbed(data, true);
    failEmbed.setTitle(`❌ CANCELED: ${data.prize}`).setDescription("No participants joined the giveaway.");
    return await message.edit({ embeds: [failEmbed], components: [] });
  }

  // Weighted Selection Logic
  let weightedPool = [];
  const guild = channel.guild;

  for (const userId of data.users) {
    const member = await guild.members.fetch(userId).catch(() => null);
    const tickets = member ? getEntries(member) : 1;
    for (let i = 0; i < tickets; i++) weightedPool.push(userId);
  }

  const winners = [];
  let pool = [...weightedPool];
  const winCount = Math.min(data.winners, [...new Set(pool)].length);

  for (let i = 0; i < winCount; i++) {
    const winnerId = pool[Math.floor(Math.random() * pool.length)];
    winners.push(winnerId);
    pool = pool.filter(id => id !== winnerId);
  }

  const endEmbed = new EmbedBuilder()
    .setColor("#FFFFFF")
    .setTitle(`🎉 GIVEAWAY CONCLUDED`)
    .setDescription(
      `**Prize:** \`${data.prize}\`\n` +
      `**Winners:** ${winners.map(w => `<@${w}>`).join(", ")}\n` +
      `**Host:** <@${data.hostId}>`
    )
    .setFooter({ text: `Total Entries: ${data.users.length} members` })
    .setTimestamp();

  await message.edit({ embeds: [endEmbed], components: [] });
  await channel.send(`🎊 **Congratulations** ${winners.map(w => `<@${w}>`).join(", ")}! You won **${data.prize}**!`);
}

async function handleGiveaway(interaction) {
  const data = giveaways.get(interaction.message.id);
  if (!data || data.ended) return interaction.reply({ content: "❌ This giveaway has ended.", ephemeral: true });

  // Handle Requirements
  if (data.requirementId && !interaction.member.roles.cache.has(data.requirementId)) {
    return interaction.reply({ content: `❌ You need the <@&${data.requirementId}> role to enter this giveaway!`, ephemeral: true });
  }

  if (interaction.customId === "gw_join") {
    if (data.users.includes(interaction.user.id)) return interaction.reply({ content: "✅ You are already in the list.", ephemeral: true });
    data.users.push(interaction.user.id);
    saveDB();
    return interaction.reply({ content: "🎟 **Successfully entered!** Good luck.", ephemeral: true });
  } 
  
  if (interaction.customId === "gw_leave") {
    if (!data.users.includes(interaction.user.id)) return interaction.reply({ content: "❌ You were not participating.", ephemeral: true });
    data.users = data.users.filter(id => id !== interaction.user.id);
    saveDB();
    return interaction.reply({ content: "🚪 You have left the giveaway.", ephemeral: true });
  }
}

// ====================== INIT ======================
function init(botClient) {
  client = botClient;
  const data = loadDB();
  giveaways.clear();

  for (const [id, g] of Object.entries(data)) {
    if (g.ended) continue;
    giveaways.set(id, g);
    startTimer(id);
  }
  console.log(`[GIVEAWAY] System active with ${giveaways.size} pending events.`);
}

module.exports = { init, createGiveaway, handleGiveaway, endGiveaway };
