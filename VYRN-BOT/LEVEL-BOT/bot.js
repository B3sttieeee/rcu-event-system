const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");

const TOKEN = process.env.TOKEN;

// ===== CONFIG =====
const ROLE_REWARDS = [
  { level: 15 },
  { level: 30 },
  { level: 45 },
  { level: 60 },
  { level: 75 }
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===== DB =====
const DB_PATH = "./data.json";

function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH));
  } catch {
    return { xp: {}, messages: {} };
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== XP =====
const cooldown = new Map();

function neededXP(level) {
  return Math.floor(120 * Math.pow(1.25, level));
}

function addXP(userId) {
  const db = loadDB();

  if (!db.xp[userId]) db.xp[userId] = { xp: 0, level: 0 };

  let gain = Math.floor(Math.random() * 10) + 15;
  db.xp[userId].xp += gain;

  while (db.xp[userId].xp >= neededXP(db.xp[userId].level)) {
    db.xp[userId].xp -= neededXP(db.xp[userId].level);
    db.xp[userId].level++;
  }

  saveDB(db);
}

// ===== MESSAGE TRACK =====
function trackMessage(userId) {
  const db = loadDB();

  if (!db.messages[userId]) {
    db.messages[userId] = {
      total: 0,
      daily: 0,
      weekly: 0,
      monthly: 0
    };
  }

  db.messages[userId].total++;
  db.messages[userId].daily++;
  db.messages[userId].weekly++;
  db.messages[userId].monthly++;

  saveDB(db);
}

// ===== EVENT =====
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const db = loadDB();

  trackMessage(msg.author.id);

  const now = Date.now();

  if (!cooldown.has(msg.author.id) || now - cooldown.get(msg.author.id) > 30000) {
    cooldown.set(msg.author.id, now);
    addXP(msg.author.id);
  }

  if (!msg.content.startsWith(".")) return;

  const args = msg.content.slice(1).split(" ");
  const cmd = args[0].toLowerCase();

  // ===== RANK =====
  if (cmd === "rank") {

    const data = db.xp[msg.author.id] || { xp: 0, level: 0 };
    const needed = neededXP(data.level);
    const percent = Math.floor((data.xp / needed) * 100);

    const nextRole = ROLE_REWARDS.find(r => r.level > data.level);
    const nextInfo = nextRole
      ? `Next role in **${nextRole.level - data.level} levels**`
      : "Max level reached";

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${msg.author.username} • Level`,
        iconURL: msg.author.displayAvatarURL()
      })
      .setColor(msg.member.displayHexColor || "#22c55e")
      .setThumbnail(msg.author.displayAvatarURL())
      .addFields(
        { name: "🏆 Level", value: `${data.level}`, inline: true },
        { name: "📊 XP", value: `${data.xp}/${needed} (${percent}%)`, inline: true },
        { name: "🚀 Next", value: nextInfo }
      )
      .setFooter({ text: "by B3sttiee" });

    return msg.reply({ embeds: [embed] });
  }

  // ===== TOP =====
  if (cmd === "top") {

    const members = msg.guild.members.cache.filter(m => !m.user.bot);

    let ranking = [];

    members.forEach(m => {
      const data = db.xp[m.id] || { level: 0 };
      ranking.push({
        id: m.id,
        level: data.level
      });
    });

    ranking.sort((a, b) => b.level - a.level);

    let desc = ranking.slice(0, 10).map((u, i) => {
      const user = msg.guild.members.cache.get(u.id);
      return `**#${i + 1}** ${user.user.username} — LVL ${u.level}`;
    }).join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🏆 TOP LEVELS")
      .setDescription(desc || "No users found")
      .setColor("#22c55e")
      .setFooter({ text: "by B3sttiee" });

    return msg.reply({ embeds: [embed] });
  }

  // ===== MESSAGES =====
  if (cmd === "messages") {

    let target = msg.mentions.users.first() || msg.author;
    let type = args[1] || args[2] || "total";

    const data = db.messages[target.id] || {
      total: 0,
      daily: 0,
      weekly: 0,
      monthly: 0
    };

    let value;

    switch (type) {
      case "daily":
        value = data.daily;
        break;
      case "weekly":
        value = data.weekly;
        break;
      case "monthly":
        value = data.monthly;
        break;
      default:
        value = data.total;
    }

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${target.username} • Messages`,
        iconURL: target.displayAvatarURL()
      })
      .setColor("#3b82f6")
      .setDescription(`**${type.toUpperCase()}**: ${value}`)
      .setFooter({ text: "by B3sttiee" });

    return msg.reply({ embeds: [embed] });
  }

});
  
client.once("ready", () => {
  console.log("🔥 BOT ONLINE (FIXED)");
});

client.login(TOKEN);
