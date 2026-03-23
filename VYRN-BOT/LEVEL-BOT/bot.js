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

// CONFIG
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===== DATABASE =====
const DB_PATH = "./data.json";

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== XP SYSTEM =====
const cooldown = new Map();

function neededXP(level) {
  return Math.floor(120 * Math.pow(1.25, level));
}

function addXP(userId) {
  const db = loadDB();

  if (!db.xp[userId]) db.xp[userId] = { xp: 0, level: 0 };

  let gain = Math.floor(Math.random() * 15) + 10;
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
client.on("messageCreate", (msg) => {
  if (msg.author.bot) return;

  trackMessage(msg.author.id);

  const now = Date.now();

  if (cooldown.has(msg.author.id)) {
    if (now - cooldown.get(msg.author.id) < 30000) return;
  }

  cooldown.set(msg.author.id, now);
  addXP(msg.author.id);
});

// ===== COMMANDS =====
const commands = [
  new SlashCommandBuilder().setName("rank").setDescription("Twój poziom"),
  new SlashCommandBuilder().setName("top").setDescription("Top poziomów"),
  new SlashCommandBuilder()
    .setName("messages")
    .setDescription("Statystyki wiadomości")
    .addUserOption(o => o.setName("user").setDescription("Użytkownik"))
];

// ===== REGISTER =====
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
}

// ===== INTERACTIONS =====
client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;

  const db = loadDB();

  // ===== RANK =====
  if (i.commandName === "rank") {

    const data = db.xp[i.user.id] || { xp: 0, level: 0 };
    const needed = neededXP(data.level);
    const percent = data.xp / needed;

    const canvas = createCanvas(1000, 300);
    const ctx = canvas.getContext("2d");

    // BG
    const gradient = ctx.createLinearGradient(0, 0, 1000, 300);
    gradient.addColorStop(0, "#020617");
    gradient.addColorStop(1, "#0f172a");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1000, 300);

    // PANEL
    ctx.fillStyle = "#0b1220";
    ctx.roundRect(20, 20, 960, 260, 25);
    ctx.fill();

    // AVATAR
    const avatar = await loadImage(i.user.displayAvatarURL({ extension: "png" }));

    ctx.save();
    ctx.beginPath();
    ctx.arc(120, 150, 70, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 50, 80, 140, 140);
    ctx.restore();

    // NAME
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText(i.user.username, 230, 110);

    // XP TEXT
    ctx.fillStyle = "#94a3b8";
    ctx.font = "20px sans-serif";
    ctx.fillText(`${data.xp} / ${needed} XP`, 230, 150);

    // BAR BG
    ctx.fillStyle = "#1e293b";
    ctx.roundRect(230, 180, 500, 30, 20);
    ctx.fill();

    // BAR
    const barGradient = ctx.createLinearGradient(230, 0, 730, 0);
    barGradient.addColorStop(0, "#22c55e");
    barGradient.addColorStop(1, "#4ade80");

    ctx.fillStyle = barGradient;
    ctx.roundRect(230, 180, 500 * percent, 30, 20);
    ctx.fill();

    // %
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(`${Math.floor(percent * 100)}%`, 750, 200);

    // LEVEL BOX
    ctx.fillStyle = "#020617";
    ctx.roundRect(800, 80, 140, 100, 20);
    ctx.fill();

    ctx.fillStyle = "#94a3b8";
    ctx.font = "18px sans-serif";
    ctx.fillText("LEVEL", 835, 110);

    ctx.fillStyle = "#22c55e";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText(data.level, 845, 150);

    return i.reply({
      files: [{ attachment: canvas.toBuffer(), name: "rank.png" }]
    });
  }

  // ===== TOP =====
  if (i.commandName === "top") {

    const sorted = Object.entries(db.xp)
      .sort((a, b) => b[1].level - a[1].level)
      .slice(0, 10);

    let desc = "";

    for (let i2 = 0; i2 < sorted.length; i2++) {
      const user = await client.users.fetch(sorted[i2][0]);
      desc += `**#${i2 + 1}** ${user.username} — LVL ${sorted[i2][1].level}\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle("🏆 TOP POZIOMÓW")
      .setDescription(desc || "Brak danych")
      .setColor("#22c55e")
      .setFooter({ text: "by B3sttiee" });

    return i.reply({ embeds: [embed] });
  }

  // ===== MESSAGES =====
  if (i.commandName === "messages") {

    const user = i.options.getUser("user") || i.user;
    const data = db.messages[user.id] || {
      total: 0,
      daily: 0,
      weekly: 0,
      monthly: 0
    };

    const embed = new EmbedBuilder()
      .setTitle(`💬 ${user.username}`)
      .setColor("#3b82f6")
      .addFields(
        { name: "📅 Dziś", value: `${data.daily}`, inline: true },
        { name: "📆 Tydzień", value: `${data.weekly}`, inline: true },
        { name: "🗓️ Miesiąc", value: `${data.monthly}`, inline: true },
        { name: "📊 Łącznie", value: `${data.total}`, inline: false }
      )
      .setFooter({ text: "by B3sttiee" });

    return i.reply({ embeds: [embed] });
  }
});

// ===== READY =====
client.once("clientReady", async () => {
  console.log("🔥 BOT ONLINE");
  await registerCommands();
});

client.login(TOKEN);
