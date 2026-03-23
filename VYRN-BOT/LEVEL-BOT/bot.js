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

// ================= DATABASE =================
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

// ================= MESSAGE TRACK =================
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

// ================= EVENT =================
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
    .setDescription("Twój poziom (PRO UI)"),

  new SlashCommandBuilder()
    .setName("top")
    .setDescription("Ranking graczy"),

  new SlashCommandBuilder()
    .setName("messages")
    .setDescription("Statystyki wiadomości")
    .addUserOption(o => o.setName("user").setDescription("Użytkownik"))

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

  // ================= RANK =================
  if (i.commandName === "rank") {

    const data = db.xp[i.user.id] || { xp: 0, level: 0 };
    const needed = neededXP(data.level);
    const percent = data.xp / needed;

    const canvas = createCanvas(900, 280);
    const ctx = canvas.getContext("2d");

    // GRADIENT
    const grad = ctx.createLinearGradient(0, 0, 900, 300);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(1, "#1e293b");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // PANEL
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(20, 20, 860, 240);

    // AVATAR
    const avatar = await loadImage(i.user.displayAvatarURL({ extension: "png" }));
    ctx.drawImage(avatar, 50, 80, 120, 120);

    // NICK
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 34px sans-serif";
    ctx.fillText(i.user.username, 200, 100);

    // XP BAR BG
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(200, 160, 400, 22);

    // XP BAR
    ctx.shadowColor = "#22c55e";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(200, 160, 400 * percent, 22);
    ctx.shadowBlur = 0;

    // TEXT
    ctx.fillStyle = "#9ca3af";
    ctx.font = "18px sans-serif";
    ctx.fillText(`${data.xp} / ${needed} XP`, 200, 140);

    ctx.fillStyle = "#fff";
    ctx.fillText(`${Math.floor(percent * 100)}%`, 620, 178);

    // LEVEL BOX
    ctx.fillStyle = "#111827";
    ctx.fillRect(700, 60, 150, 70);

    ctx.fillStyle = "#9ca3af";
    ctx.fillText("LEVEL", 735, 85);

    ctx.font = "bold 30px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(`${data.level}`, 760, 115);

    return i.reply({
      files: [{ attachment: canvas.toBuffer(), name: "rank.png" }]
    });
  }

  // ================= TOP =================
  if (i.commandName === "top") {

    const sorted = Object.entries(db.xp)
      .sort((a, b) => b[1].level - a[1].level)
      .slice(0, 10);

    const embed = new EmbedBuilder()
      .setColor("#22c55e")
      .setTitle("🏆 Ranking Serwera")
      .setDescription("━━━━━━━━━━━━━━━━━━");

    for (let x = 0; x < sorted.length; x++) {
      const user = await client.users.fetch(sorted[x][0]);

      const medal =
        x === 0 ? "🥇" :
        x === 1 ? "🥈" :
        x === 2 ? "🥉" : "🔹";

      embed.addFields({
        name: `${medal} ${user.username}`,
        value: `✨ Poziom: **${sorted[x][1].level}**`,
        inline: false
      });
    }

    embed.setFooter({ text: "by B3sttiee" });

    return i.reply({ embeds: [embed] });
  }

  // ================= MESSAGES =================
  if (i.commandName === "messages") {

    const user = i.options.getUser("user") || i.user;

    const data = db.messages[user.id] || {};

    const day = getDayKey();
    const week = getWeekKey();
    const month = getMonthKey();

    const embed = new EmbedBuilder()
      .setColor("#3b82f6")
      .setTitle(`💬 ${user.username}`)
      .setThumbnail(user.displayAvatarURL())
      .setDescription("📊 **Statystyki wiadomości**\n━━━━━━━━━━━━━━━━━━")
      .addFields(
        {
          name: "📅 Dziś",
          value: `\`${data.daily?.[day] || 0}\``,
          inline: true
        },
        {
          name: "📆 Tydzień",
          value: `\`${data.weekly?.[week] || 0}\``,
          inline: true
        },
        {
          name: "🗓️ Miesiąc",
          value: `\`${data.monthly?.[month] || 0}\``,
          inline: true
        },
        {
          name: "📦 Łącznie",
          value: `\`${data.total || 0}\``,
          inline: false
        }
      )
      .setFooter({ text: "System statystyk • by B3sttiee" });

    return i.reply({ embeds: [embed] });
  }

});

// ================= READY =================
client.once("clientReady", async () => {
  console.log("🔥 BOT PREMIUM DZIAŁA");
  await registerCommands();
});

client.login(TOKEN);
