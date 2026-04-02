const { 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const fs = require("fs");

// ===== PATH =====
const DATA_DIR = "/data";
const DB_PATH = `${DATA_DIR}/giveaways.json`;

const giveaways = new Map();

// ===== BONUS ROLES =====
const BONUS_ROLES = {
  "1476000458987278397": 1,
  "1476000995501670534": 3,
  "1476000459595448442": 5,
  "1476000991206707221": 7,
  "1476000991823532032": 10,
  "1476000992351879229": 15
};

// ===== DB =====
function loadDB() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
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

// ===== LOAD GIVEAWAYS (🔥 FIX DO RESUME)
function loadGiveaways(client) {
  const data = loadDB();

  for (const messageId in data) {
    giveaways.set(messageId, data[messageId]);
  }

  console.log(`🎁 Loaded ${giveaways.size} giveaways`);
}

// ===== RESUME (🔥 TO CI NIE DZIAŁAŁO)
async function resumeGiveaway(client, messageId) {
  const data = giveaways.get(messageId);
  if (!data) return false;

  const channel = await client.channels.fetch(data.channelId).catch(() => null);
  if (!channel) return false;

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) return false;

  startTimer(message);
  return true;
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

// ===== ENTRIES =====
function getEntries(member) {
  let entries = 1;

  for (const roleId in BONUS_ROLES) {
    if (member.roles.cache.has(roleId)) {
      entries += BONUS_ROLES[roleId];
    }
  }

  return entries;
}

// ===== EMBED =====
function buildEmbed(data) {
  const now = Date.now();
  const left = data.end - now;

  return new EmbedBuilder()
    .setColor("#d4af37")
    .setTitle(`🎉 ${data.prize}`)
    .addFields(
      {
        name: "🏆 Winners",
        value: `\`${data.winners}\``,
        inline: true
      },
      {
        name: "👥 Participants",
        value: `\`${data.users.length}\``,
        inline: true
      },
      {
        name: "⏳ Time Left",
        value: `\`${left > 0 ? formatTime(left) : "Ended"}\``,
        inline: true
      },
      {
        name: "🎟 Entry Boost",
        value:
`Default: \`1x\`

<@&1476000458987278397> → **+1**  
<@&1476000995501670534> → **+3**  
<@&1476000459595448442> → **+5**  
<@&1476000991206707221> → **+7**  
<@&1476000991823532032> → **+10**  
<@&1476000992351879229> → **+15**`,
        inline: false
      }
    )
    .setFooter({ text: "VYRN • Giveaway System" })
    .setTimestamp();
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
    ended: false
  };

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("gw_join")
      .setLabel("Join")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("gw_leave")
      .setLabel("Leave")
      .setStyle(ButtonStyle.Secondary)
  );

  const msg = await interaction.channel.send({
    embeds: [buildEmbed(giveawayData)],
    components: [row]
  });

  giveawayData.messageId = msg.id;

  giveaways.set(msg.id, giveawayData);
  saveDB();

  startTimer(msg);
}

// ===== TIMER =====
function startTimer(message) {
  const interval = setInterval(async () => {
    const data = giveaways.get(message.id);
    if (!data) return clearInterval(interval);

    await message.edit({ embeds: [buildEmbed(data)] }).catch(() => {});

    if (Date.now() >= data.end && !data.ended) {
      data.ended = true;
      clearInterval(interval);
      endGiveaway(message, data);
    }

  }, 5000);
}

// ===== END =====
async function endGiveaway(message, data) {

  if (!data.users.length) {
    await message.channel.send("❌ No participants");
    giveaways.delete(message.id);
    saveDB();
    return;
  }

  const winner = data.users[Math.floor(Math.random() * data.users.length)];

  await message.channel.send(`🎉 Winner: <@${winner}>`);

  saveDB();
}

// ===== 🔥 REROLL (FIX)
async function reroll(client, messageId) {

  const data = giveaways.get(messageId);
  if (!data) return "❌ Giveaway not found";

  const winner = data.users[Math.floor(Math.random() * data.users.length)];

  return `<@${winner}>`;
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

    await interaction.reply({
      content: "🎟 Joined",
      ephemeral: true
    });
  }

  if (interaction.customId === "gw_leave") {

    data.users = data.users.filter(id => id !== userId);
    saveDB();

    await interaction.reply({
      content: "❌ Left",
      ephemeral: true
    });
  }

  interaction.message.edit({
    embeds: [buildEmbed(data)]
  }).catch(() => {});
}

// ===== EXPORT =====
module.exports = {
  createGiveaway,
  handleGiveaway,
  reroll,
  loadGiveaways,
  resumeGiveaway
};
