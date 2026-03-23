const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
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
  fs.writeFileSync(DB_PATH, JSON.stringify({ xp: {}, messages: {} }, null, 2));
}

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ================= SYSTEM =================

const cooldown = new Map();

function neededXP(level) {
  return Math.floor(120 * Math.pow(1.22, level));
}

// ================= TRACK =================

function trackMessage(userId) {
  const db = loadDB();

  if (!db.messages[userId]) {
    db.messages[userId] = { total: 0 };
  }

  db.messages[userId].total++;

  saveDB(db);
}

// ================= XP =================

function addXP(userId) {
  const db = loadDB();

  if (!db.xp[userId]) {
    db.xp[userId] = { xp: 0, level: 0 };
  }

  let gain = Math.floor(Math.random() * 10) + 15;

  db.xp[userId].xp += gain;

  let leveled = false;

  while (db.xp[userId].xp >= neededXP(db.xp[userId].level)) {
    db.xp[userId].xp -= neededXP(db.xp[userId].level);
    db.xp[userId].level++;
    leveled = true;
  }

  saveDB(db);

  return { leveled, level: db.xp[userId].level };
}

// ================= MESSAGE EVENT =================

client.on("messageCreate", (msg) => {
  if (msg.author.bot) return;
  if (msg.content.length < 5) return;

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
    .setDescription("Twój poziom (ładny panel)"),

  new SlashCommandBuilder()
    .setName("top")
    .setDescription("Ranking graczy"),

  new SlashCommandBuilder()
    .setName("messages")
    .setDescription("Ilość wiadomości")
    .addUserOption(o =>
      o.setName("user").setDescription("Użytkownik")
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

  // ===== RANK (CANVAS) =====
  if (i.commandName === "rank") {

    const data = db.xp[i.user.id] || { xp: 0, level: 0 };
    const needed = neededXP(data.level);
    const percent = data.xp / needed;

    const canvas = createCanvas(800, 250);
    const ctx = canvas.getContext("2d");

    // TŁO
    ctx.fillStyle = "#0f1115";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // PANEL
    ctx.fillStyle = "#1c1f26";
    ctx.fillRect(20, 20, 760, 210);

    // AVATAR
    const avatar = await loadImage(i.user.displayAvatarURL({ extension: "png" }));
    ctx.drawImage(avatar, 40, 60, 120, 120);

    // NICK
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(i.user.username, 180, 90);

    // LEVEL BOX
    ctx.fillStyle = "#2a2d35";
    ctx.fillRect(600, 40, 150, 60);

    ctx.fillStyle = "#ffffff";
    ctx.font = "20px sans-serif";
    ctx.fillText("LEVEL", 640, 65);

    ctx.font = "bold 26px sans-serif";
    ctx.fillText(`${data.level}`, 660, 95);

    // XP BOX
    ctx.fillStyle = "#2a2d35";
    ctx.fillRect(600, 120, 150, 60);

    ctx.fillStyle = "#ffffff";
    ctx.font = "18px sans-serif";
    ctx.fillText("XP", 650, 145);

    ctx.font = "bold 20px sans-serif";
    ctx.fillText(`${data.xp}/${needed}`, 620, 175);

    // PROGRESS BG
    ctx.fillStyle = "#2f3136";
    ctx.fillRect(180, 140, 380, 25);

    // PROGRESS
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(180, 140, 380 * percent, 25);

    // %
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px sans-serif";
    ctx.fillText(`${Math.floor(percent * 100)}%`, 570, 160);

    const buffer = canvas.toBuffer();

    return i.reply({
      files: [{
        attachment: buffer,
        name: "rank.png"
      }]
    });
  }

  // ===== TOP =====
  if (i.commandName === "top") {
    const sorted = Object.entries(db.xp)
      .sort((a, b) => b[1].level - a[1].level)
      .slice(0, 10);

    let text = "🏆 Ranking:\n\n";

    for (let x = 0; x < sorted.length; x++) {
      const user = await client.users.fetch(sorted[x][0]);
      text += `${x + 1}. ${user.username} — lvl ${sorted[x][1].level}\n`;
    }

    return i.reply({ content: text });
  }

  // ===== MESSAGES =====
  if (i.commandName === "messages") {
    const user = i.options.getUser("user") || i.user;
    const data = db.messages[user.id];

    return i.reply(
      `💬 ${user.username} napisał: ${data?.total || 0} wiadomości`
    );
  }
});

// ================= READY =================

client.once("clientReady", async () => {
  console.log("🔥 BOT DZIAŁA");
  await registerCommands();
});

client.login(TOKEN);
