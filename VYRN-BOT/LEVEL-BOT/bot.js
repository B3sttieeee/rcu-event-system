const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const fs = require("fs");

// ================= CONFIG =================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const LEVEL_CHANNEL = "1475999590716018719";

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ================= DB =================
const DB_PATH = "./data.json";

if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({
    xp: {},
    vc: {},
    messages: {}
  }, null, 2));
}

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ================= LEVEL =================

function neededXP(level) {
  return Math.floor(100 * Math.pow(1.25, level));
}

function progressBar(current, max, size = 12) {
  const percent = current / max;
  const progress = Math.round(size * percent);
  return "▰".repeat(progress) + "▱".repeat(size - progress);
}

// ================= MESSAGE TRACK =================

function trackMessage(userId) {
  const db = loadDB();

  if (!db.messages[userId]) {
    db.messages[userId] = {
      total: 0,
      daily: 0,
      weekly: 0,
      monthly: 0,
      lastDay: new Date().getDate(),
      lastWeek: new Date().getWeek?.() || 0,
      lastMonth: new Date().getMonth()
    };
  }

  const user = db.messages[userId];
  const now = new Date();

  // reset daily
  if (user.lastDay !== now.getDate()) {
    user.daily = 0;
    user.lastDay = now.getDate();
  }

  // reset monthly
  if (user.lastMonth !== now.getMonth()) {
    user.monthly = 0;
    user.lastMonth = now.getMonth();
  }

  user.total++;
  user.daily++;
  user.weekly++;
  user.monthly++;

  saveDB(db);
}

// ================= XP =================

const cooldown = new Map();

function addXP(userId, member) {
  const db = loadDB();

  if (!db.xp[userId]) {
    db.xp[userId] = { xp: 0, level: 0 };
  }

  let gain = Math.floor(Math.random() * 10) + 10;

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

// ================= EVENTS =================

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  if (msg.content.length < 5) return;

  trackMessage(msg.author.id);

  const now = Date.now();

  if (cooldown.has(msg.author.id)) {
    if (now - cooldown.get(msg.author.id) < 30000) return;
  }

  cooldown.set(msg.author.id, now);

  const result = addXP(msg.author.id, msg.member);

  if (result.leveled) {
    const channel = await client.channels.fetch(LEVEL_CHANNEL);

    channel.send({
      content: `🎉 ${msg.author} awansował na poziom ${result.level}!`
    });
  }
});

// ================= COMMANDS =================

const commands = [

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Twój poziom"),

  new SlashCommandBuilder()
    .setName("top")
    .setDescription("Topka"),

  new SlashCommandBuilder()
    .setName("messages")
    .setDescription("Ilość wiadomości")
    .addUserOption(o =>
      o.setName("user").setDescription("Użytkownik")
    ),

  new SlashCommandBuilder()
    .setName("message-stats")
    .setDescription("Statystyki wiadomości")
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

  // RANK
  if (i.commandName === "rank") {
    const data = db.xp[i.user.id] || { xp: 0, level: 0 };
    const needed = neededXP(data.level);

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle(i.user.username)
      .setDescription(
`Poziom: ${data.level}
${progressBar(data.xp, needed)}`
      );

    i.reply({ embeds: [embed] });
  }

  // TOP
  if (i.commandName === "top") {
    const sorted = Object.entries(db.xp)
      .sort((a, b) => b[1].level - a[1].level)
      .slice(0, 10);

    let desc = "";

    for (let i2 = 0; i2 < sorted.length; i2++) {
      const user = await client.users.fetch(sorted[i2][0]);
      desc += `**${i2 + 1}. ${user.username}** — lvl ${sorted[i2][1].level}\n`;
    }

    i.reply({ content: desc });
  }

  // MESSAGES
  if (i.commandName === "messages") {
    const user = i.options.getUser("user") || i.user;
    const data = db.messages[user.id];

    if (!data) return i.reply("Brak danych");

    i.reply(
`📊 ${user.username}
Total: ${data.total}
Daily: ${data.daily}
Weekly: ${data.weekly}
Monthly: ${data.monthly}`
    );
  }
});

// ================= READY =================

client.once("clientReady", async () => {
  console.log("🔥 BOT ULTRA READY");
  await registerCommands();
});

client.login(TOKEN);
