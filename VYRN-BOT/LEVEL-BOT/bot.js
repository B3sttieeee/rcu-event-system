const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");

// CONFIG
const TOKEN = process.env.TOKEN;

// ROLE PROGI (TWOJE ID)
const ROLE_REWARDS = [
  { level: 15, role: "1476000995501670534" },
  { level: 30, role: "1476000459595448442" },
  { level: 45, role: "1476000991206707221" },
  { level: 60, role: "1476000991823532032" },
  { level: 75, role: "1476000992351879229" }
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
  return JSON.parse(fs.readFileSync(DB_PATH));
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

// ===== MESSAGE EVENT =====
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const db = loadDB();

  trackMessage(msg.author.id);

  const now = Date.now();

  if (cooldown.has(msg.author.id)) {
    if (now - cooldown.get(msg.author.id) < 30000) return;
  }

  cooldown.set(msg.author.id, now);
  addXP(msg.author.id);

  // ===== PREFIX COMMANDS =====
  if (!msg.content.startsWith(".")) return;

  const args = msg.content.slice(1).split(" ");
  const cmd = args[0];

  // ===== RANK =====
  if (cmd === "rank") {

    const data = db.xp[msg.author.id] || { xp: 0, level: 0 };
    const needed = neededXP(data.level);
    const percent = Math.floor((data.xp / needed) * 100);

    const member = msg.member;

    const nextRole = ROLE_REWARDS.find(r => r.level > data.level);
    const nextInfo = nextRole
      ? `Next role in **${nextRole.level - data.level} levels**`
      : "Max level reached";

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${msg.author.username} • Level Stats`,
        iconURL: msg.author.displayAvatarURL()
      })
      .setColor(member.displayHexColor === "#000000" ? "#22c55e" : member.displayHexColor)
      .setThumbnail(msg.author.displayAvatarURL())
      .addFields(
        { name: "🏆 Level", value: `**${data.level}**`, inline: true },
        { name: "📊 XP", value: `**${data.xp}/${needed} (${percent}%)**`, inline: true },
        { name: "🎯 Progress", value: "▰▰▰▰▰▰▱▱▱▱", inline: false },
        { name: "🚀 Next Reward", value: nextInfo, inline: false }
      )
      .setFooter({ text: "by B3sttiee" });

    msg.reply({ embeds: [embed] });
  }

  // ===== TOP =====
  if (cmd === "top") {

    const users = msg.guild.members.cache;

    let ranking = [];

    users.forEach(u => {
      if (u.user.bot) return;

      const data = db.xp[u.id] || { level: 0 };
      ranking.push({ id: u.id, level: data.level });
    });

    ranking.sort((a, b) => b.level - a.level);

    let desc = "";

    ranking.slice(0, 10).forEach((u, i) => {
      const user = msg.guild.members.cache.get(u.id);
      desc += `**#${i + 1}** ${user.user.username} — LVL ${u.level}\n`;
    });

    const embed = new EmbedBuilder()
      .setTitle("🏆 TOP LEVELS")
      .setDescription(desc || "No data")
      .setColor("#22c55e")
      .setFooter({ text: "by B3sttiee" });

    msg.reply({ embeds: [embed] });
  }

  // ===== MESSAGES =====
  if (cmd === "messages") {

    const user = msg.mentions.users.first() || msg.author;
    const data = db.messages[user.id] || {
      total: 0,
      daily: 0,
      weekly: 0,
      monthly: 0
    };

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${user.username} • Messages`,
        iconURL: user.displayAvatarURL()
      })
      .setColor("#3b82f6")
      .addFields(
        { name: "📅 Today", value: `${data.daily}`, inline: true },
        { name: "📆 Weekly", value: `${data.weekly}`, inline: true },
        { name: "🗓️ Monthly", value: `${data.monthly}`, inline: true },
        { name: "📊 Total", value: `${data.total}`, inline: false }
      )
      .setFooter({ text: "by B3sttiee" });

    msg.reply({ embeds: [embed] });
  }
});

// ===== READY =====
client.once("ready", () => {
  console.log("🔥 BOT ONLINE (EMBED VERSION)");
});

client.login(TOKEN);
