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

// DB
const DB_PATH = "./data.json";

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// XP SYSTEM
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

// MESSAGES
function trackMessage(userId) {
  const db = loadDB();

  if (!db.messages[userId]) db.messages[userId] = { total: 0 };

  db.messages[userId].total++;
  saveDB(db);
}

// EVENT
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

// COMMANDS
const commands = [
  new SlashCommandBuilder().setName("rank").setDescription("Poziom"),
  new SlashCommandBuilder().setName("top").setDescription("Topka"),
  new SlashCommandBuilder()
    .setName("messages")
    .setDescription("Wiadomości")
    .addUserOption(o => o.setName("user").setDescription("User"))
];

// REGISTER
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
}

// INTERACTION
client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;

  const db = loadDB();

  // RANK
  if (i.commandName === "rank") {

    const data = db.xp[i.user.id] || { xp: 0, level: 0 };
    const needed = neededXP(data.level);
    const percent = data.xp / needed;

    const canvas = createCanvas(900, 300);
    const ctx = canvas.getContext("2d");

    // BG
    const grad = ctx.createLinearGradient(0, 0, 900, 300);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(1, "#1e293b");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 900, 300);

    // PANEL
    ctx.fillStyle = "#020617";
    ctx.fillRect(20, 20, 860, 260);

    // AVATAR
    const avatar = await loadImage(i.user.displayAvatarURL({ extension: "png" }));
    ctx.drawImage(avatar, 50, 90, 120, 120);

    // TEXT
    ctx.fillStyle = "#fff";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText(i.user.username, 200, 110);

    // BAR
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(200, 180, 450, 25);

    ctx.fillStyle = "#22c55e";
    ctx.fillRect(200, 180, 450 * percent, 25);

    ctx.fillStyle = "#9ca3af";
    ctx.fillText(`${data.xp}/${needed}`, 200, 160);

    ctx.fillStyle = "#fff";
    ctx.fillText(`${Math.floor(percent * 100)}%`, 670, 200);

    // LEVEL
    ctx.fillStyle = "#111827";
    ctx.fillRect(700, 80, 150, 80);

    ctx.fillStyle = "#fff";
    ctx.fillText(`LVL ${data.level}`, 720, 130);

    return i.reply({
      files: [{ attachment: canvas.toBuffer(), name: "rank.png" }]
    });
  }

  // TOP
  if (i.commandName === "top") {
    const sorted = Object.entries(db.xp)
      .sort((a, b) => b[1].level - a[1].level)
      .slice(0, 10);

    const embed = new EmbedBuilder()
      .setTitle("🏆 TOP")
      .setColor("#22c55e");

    for (let x = 0; x < sorted.length; x++) {
      const user = await client.users.fetch(sorted[x][0]);

      embed.addFields({
        name: `#${x + 1} ${user.username}`,
        value: `LVL ${sorted[x][1].level}`
      });
    }

    return i.reply({ embeds: [embed] });
  }

  // MESSAGES
  if (i.commandName === "messages") {
    const user = i.options.getUser("user") || i.user;
    const data = db.messages[user.id] || { total: 0 };

    return i.reply({
      content: `💬 ${user.username} napisał: ${data.total} wiadomości`
    });
  }
});

// READY
client.once("clientReady", async () => {
  console.log("BOT DZIAŁA");
  await registerCommands();
});

client.login(TOKEN);
