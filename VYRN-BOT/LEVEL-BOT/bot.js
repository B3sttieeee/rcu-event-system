const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");

// ================= CONFIG =================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ================= DB =================
const DB_PATH = "./data.json";

if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({
    xp: {},
    messages: {}
  }, null, 2));
}

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ================= TIME =================

function getDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getWeekKey() {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}

// ================= XP =================

const cooldown = new Map();

function neededXP(level) {
  return Math.floor(120 * Math.pow(1.22, level));
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

// ================= MESSAGES =================

function trackMessage(userId) {
  const db = loadDB();

  if (!db.messages[userId]) {
    db.messages[userId] = {
      total: 0,
      daily: {},
      weekly: {},
      monthly: {}
    };
  }

  const day = getDayKey();
  const week = getWeekKey();
  const month = getMonthKey();

  db.messages[userId].total++;
  db.messages[userId].daily[day] = (db.messages[userId].daily[day] || 0) + 1;
  db.messages[userId].weekly[week] = (db.messages[userId].weekly[week] || 0) + 1;
  db.messages[userId].monthly[month] = (db.messages[userId].monthly[month] || 0) + 1;

  saveDB(db);
}

// ================= MESSAGE EVENT =================

client.on("messageCreate", (msg) => {
  if (msg.author.bot) return;
  if (msg.content.length < 3) return;

  trackMessage(msg.author.id);

  const now = Date.now();

  if (cooldown.has(msg.author.id)) {
    if (now - cooldown.get(msg.author.id) < 30000) return;
  }

  cooldown.set(msg.author.id, now);

  addXP(msg.author.id);
});

// ================= COMMANDS =================

const commands = [

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Twój poziom"),

  new SlashCommandBuilder()
    .setName("top")
    .setDescription("Topka poziomów"),

  new SlashCommandBuilder()
    .setName("messages")
    .setDescription("Statystyki wiadomości")
    .addUserOption(o => o.setName("user").setDescription("Użytkownik"))
    .addStringOption(o =>
      o.setName("type")
        .setDescription("Zakres")
        .addChoices(
          { name: "daily", value: "daily" },
          { name: "weekly", value: "weekly" },
          { name: "monthly", value: "monthly" }
        )
    )
];

// ================= REGISTER =================

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
}

// ================= INTERACTIONS =================

client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;

  const db = loadDB();

  // ===== RANK =====
  if (i.commandName === "rank") {

    const data = db.xp[i.user.id] || { xp: 0, level: 0 };
    const needed = neededXP(data.level);
    const percent = data.xp / needed;

    const canvas = createCanvas(800, 250);
    const ctx = canvas.getContext("2d");

    // TŁO
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // FALE
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.moveTo(0, 180);
    ctx.quadraticCurveTo(200, 100, 400, 180);
    ctx.quadraticCurveTo(600, 260, 800, 180);
    ctx.fill();

    // PANEL
    ctx.fillStyle = "#111827";
    ctx.fillRect(30, 30, 740, 190);

    // AVATAR
    const avatar = await loadImage(i.user.displayAvatarURL({ extension: "png" }));
    ctx.drawImage(avatar, 50, 60, 120, 120);

    // NICK
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText(i.user.username, 200, 90);

    // PROGRESS BG
    ctx.fillStyle = "#374151";
    ctx.fillRect(200, 140, 350, 20);

    // PROGRESS
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(200, 140, 350 * percent, 20);

    // %
    ctx.fillStyle = "#fff";
    ctx.font = "16px sans-serif";
    ctx.fillText(`${Math.floor(percent * 100)}%`, 560, 155);

    // BOX
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(600, 50, 140, 50);
    ctx.fillRect(600, 120, 140, 50);

    ctx.fillStyle = "#fff";
    ctx.fillText(`LVL ${data.level}`, 630, 80);
    ctx.fillText(`${data.xp}/${needed}`, 610, 150);

    return i.reply({
      files: [{ attachment: canvas.toBuffer(), name: "rank.png" }]
    });
  }

  // ===== TOP =====
  if (i.commandName === "top") {

    const sorted = Object.entries(db.xp)
      .sort((a, b) => b[1].level - a[1].level)
      .slice(0, 10);

    const embed = new EmbedBuilder()
      .setColor("#22c55e")
      .setTitle("🏆 TOP POZIOMÓW")
      .setDescription("━━━━━━━━━━━━━━━");

    for (let i2 = 0; i2 < sorted.length; i2++) {
      const user = await client.users.fetch(sorted[i2][0]);
      embed.addFields({
        name: `#${i2 + 1} ${user.username}`,
        value: `✨ Poziom: ${sorted[i2][1].level}`,
        inline: false
      });
    }

    return i.reply({ embeds: [embed] });
  }

  // ===== MESSAGES =====
  if (i.commandName === "messages") {

    const user = i.options.getUser("user") || i.user;
    const type = i.options.getString("type") || "daily";

    const data = db.messages[user.id] || {};

    const day = getDayKey();
    const week = getWeekKey();
    const month = getMonthKey();

    const embed = new EmbedBuilder()
      .setColor("#3b82f6")
      .setTitle(`💬 ${user.username} — Messages`)
      .setThumbnail(user.displayAvatarURL())
      .setDescription("━━━━━━━━━━━━━━━")
      .addFields(
        { name: "📅 Today", value: `${data.daily?.[day] || 0}`, inline: true },
        { name: "📆 Weekly", value: `${data.weekly?.[week] || 0}`, inline: true },
        { name: "🗓️ Monthly", value: `${data.monthly?.[month] || 0}`, inline: true },
        { name: "📊 Total", value: `${data.total || 0}`, inline: false }
      )
      .setFooter({ text: "by B3sttiee" });

    return i.reply({ embeds: [embed] });
  }

});

// ================= READY =================

client.once("clientReady", async () => {
  console.log("🔥 BOT PRO DZIAŁA");
  await registerCommands();
});

client.login(TOKEN);
