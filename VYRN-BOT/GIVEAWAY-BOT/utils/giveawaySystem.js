const { 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const fs = require("fs");

const giveaways = new Map();
const DB_PATH = "/data/giveaways.json";

// ===== DB =====
function loadDB() {
  if (!fs.existsSync("/data")) {
    fs.mkdirSync("/data");
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
  }

  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB() {
  const obj = Object.fromEntries(giveaways);
  fs.writeFileSync(DB_PATH, JSON.stringify(obj, null, 2));
}

// ===== BONUS ROLE =====
const BONUS_ROLES = {
  "1476000458987278397": 1,
  "1476000995501670534": 2,
  "1476000459595448442": 4,
  "1476000991206707221": 6,
  "1476000991823532032": 10,
  "1476000992351879229": 15
};

// ===== LEVEL BONUS =====
function getLevelBonus(member) {
  // 🔥 dostosuj do siebie
  if (member.roles.cache.has("LEVEL_100_ID")) return 20;
  if (member.roles.cache.has("LEVEL_50_ID")) return 10;
  if (member.roles.cache.has("LEVEL_25_ID")) return 5;
  return 0;
}

// ===== TIME =====
function parseTime(time) {
  const num = parseInt(time);
  if (time.endsWith("s")) return num * 1000;
  if (time.endsWith("m")) return num * 60000;
  if (time.endsWith("h")) return num * 3600000;
  if (time.endsWith("d")) return num * 86400000;
  return null;
}

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ===== EMBED =====
function buildEmbed(data) {
  const now = Date.now();
  const left = data.end - now;

  const embed = new EmbedBuilder()
    .setColor("#f59e0b")
    .setTitle("🎉 GIVEAWAY")
    .setDescription(
`🎁 **${data.prize}**

━━━━━━━━━━━━━━━━━━

👥 Uczestnicy: \`${data.users.length}\`
🏆 Zwycięzcy: \`${data.winners}\`

⏳ Koniec za: \`${left > 0 ? formatTime(left) : "Zakończono"}\`

━━━━━━━━━━━━━━━━━━

👉 Kliknij **Join**, aby wziąć udział!`
    )
    .setFooter({ text: "VYRN Giveaway System" })
    .setTimestamp();

  if (data.image) embed.setImage(data.image);

  return embed;
}

// ===== CREATE =====
async function createGiveaway(interaction, data) {

  const duration = parseTime(data.time);
  if (!duration) throw new Error("Bad time");

  const giveawayData = {
    prize: data.prize,
    winners: data.winners,
    end: Date.now() + duration,
    users: [],
    channelId: interaction.channel.id,
    messageId: null,
    image: data.image || null
  };

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("gw_join")
      .setLabel("🎉 Join")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("gw_leave")
      .setLabel("❌ Leave")
      .setStyle(ButtonStyle.Secondary)
  );

  const msg = await interaction.channel.send({
    embeds: [buildEmbed(giveawayData)],
    components: [row]
  });

  giveawayData.messageId = msg.id;

  giveaways.set(msg.id, giveawayData);
  saveDB();

  startTimer(msg, giveawayData);
}

// ===== TIMER =====
function startTimer(message, data) {

  const interval = setInterval(async () => {
    const d = giveaways.get(message.id);
    if (!d) return clearInterval(interval);

    try {
      await message.edit({ embeds: [buildEmbed(d)] });
    } catch {}

    if (Date.now() >= d.end) {
      clearInterval(interval);
      endGiveaway(message, d);
    }

  }, 5000);
}

// ===== END =====
async function endGiveaway(message, data) {

  const winners = [];
  const pool = [];

  for (const id of data.users) {
    const member = await message.guild.members.fetch(id).catch(()=>null);
    if (!member) continue;

    let entries = 1;

    // role bonus
    for (const roleId in BONUS_ROLES) {
      if (member.roles.cache.has(roleId)) {
        entries += BONUS_ROLES[roleId];
      }
    }

    // level bonus
    entries += getLevelBonus(member);

    for (let i = 0; i < entries; i++) {
      pool.push(id);
    }
  }

  for (let i = 0; i < data.winners; i++) {
    if (pool.length === 0) break;

    const winner = pool[Math.floor(Math.random() * pool.length)];
    winners.push(winner);

    for (let j = pool.length - 1; j >= 0; j--) {
      if (pool[j] === winner) pool.splice(j, 1);
    }
  }

  const embed = new EmbedBuilder()
    .setColor("#22c55e")
    .setTitle("🎉 GIVEAWAY ZAKOŃCZONY")
    .setDescription(
`🎁 **${data.prize}**

🏆 Wygrani:
${winners.length ? winners.map(w => `<@${w}>`).join("\n") : "Brak"}

👥 Uczestnicy: ${data.users.length}`
    );

  await message.edit({ embeds: [embed], components: [] });

  giveaways.delete(message.id);
  saveDB();
}

// ===== LOAD =====
async function loadGiveaways(client) {
  const db = loadDB();

  for (const id in db) {
    const data = db[id];

    try {
      const channel = await client.channels.fetch(data.channelId);
      const message = await channel.messages.fetch(id);

      giveaways.set(id, data);

      if (Date.now() >= data.end) {
        endGiveaway(message, data);
      } else {
        startTimer(message, data);
      }

    } catch {
      giveaways.delete(id);
    }
  }
}

// ===== RESUME =====
async function resumeGiveaway(client, messageId) {
  const db = loadDB();
  const data = db[messageId];

  if (!data) return false;

  try {
    const channel = await client.channels.fetch(data.channelId);
    const message = await channel.messages.fetch(messageId);

    giveaways.set(messageId, data);

    if (Date.now() >= data.end) {
      await endGiveaway(message, data);
    } else {
      startTimer(message, data);
    }

    return true;

  } catch {
    return false;
  }
}

// ===== BUTTONS =====
async function handleGiveaway(interaction) {

  const data = giveaways.get(interaction.message.id);
  if (!data) return;

  const userId = interaction.user.id;

  if (interaction.customId === "gw_join") {
    if (!data.users.includes(userId)) {
      data.users.push(userId);
      saveDB();
    }

    await interaction.reply({ content: "✅ Dołączyłeś!", ephemeral: true });

    interaction.message.edit({
      embeds: [buildEmbed(data)]
    }).catch(()=>{});
  }

  if (interaction.customId === "gw_leave") {
    data.users = data.users.filter(id => id !== userId);
    saveDB();

    await interaction.reply({ content: "❌ Opuściłeś giveaway", ephemeral: true });

    interaction.message.edit({
      embeds: [buildEmbed(data)]
    }).catch(()=>{});
  }
}

module.exports = {
  createGiveaway,
  handleGiveaway,
  loadGiveaways,
  resumeGiveaway
};
