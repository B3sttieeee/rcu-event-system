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

// ================= SYSTEM =================

const cooldown = new Map();

function neededXP(level) {
  return Math.floor(120 * Math.pow(1.22, level));
}

function progressBar(current, max, size = 14) {
  const percent = current / max;
  const progress = Math.round(size * percent);
  return "🟩".repeat(progress) + "⬛".repeat(size - progress);
}

const separator = "✨━━━━━━━━━━━━━━━━━━━━✨";

// ================= MESSAGE TRACK =================

function getWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
}

function trackMessage(userId) {
  const db = loadDB();

  if (!db.messages[userId]) {
    db.messages[userId] = {
      total: 0,
      daily: 0,
      weekly: 0,
      monthly: 0,
      lastDay: new Date().toISOString().slice(0,10),
      lastWeek: getWeek(),
      lastMonth: new Date().getMonth()
    };
  }

  const user = db.messages[userId];
  const now = new Date();

  if (user.lastDay !== now.toISOString().slice(0,10)) {
    user.daily = 0;
    user.lastDay = now.toISOString().slice(0,10);
  }

  if (user.lastWeek !== getWeek()) {
    user.weekly = 0;
    user.lastWeek = getWeek();
  }

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

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  if (msg.content.length < 5) return;

  trackMessage(msg.author.id);

  const now = Date.now();

  if (cooldown.has(msg.author.id)) {
    if (now - cooldown.get(msg.author.id) < 30000) return;
  }

  cooldown.set(msg.author.id, now);

  const result = addXP(msg.author.id);

  if (result.leveled) {
    const channel = await client.channels.fetch(LEVEL_CHANNEL);

    const embed = new EmbedBuilder()
      .setColor("#FFD700")
      .setAuthor({
        name: `${msg.author.username} awansował! • by B3sttiee`,
        iconURL: msg.author.displayAvatarURL()
      })
      .setDescription(
`🎉 **Nowy poziom!**

${separator}

🏆 Poziom: **${result.level}**

${separator}

🚀 Lecisz dalej!`
      )
      .setThumbnail(msg.author.displayAvatarURL())
      .setTimestamp();

    channel.send({ embeds: [embed] });
  }
});

// ================= COMMANDS =================

const commands = [

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Twój poziom"),

  new SlashCommandBuilder()
    .setName("top")
    .setDescription("Ranking graczy"),

  new SlashCommandBuilder()
    .setName("messages")
    .setDescription("Statystyki wiadomości")
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

  // ===== RANK =====
  if (i.commandName === "rank") {
    const data = db.xp[i.user.id] || { xp: 0, level: 0 };
    const needed = neededXP(data.level);
    const percent = Math.floor((data.xp / needed) * 100);

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setAuthor({
        name: `${i.user.username} • Statystyki • by B3sttiee`,
        iconURL: i.user.displayAvatarURL()
      })
      .setDescription(
`🎖️ **Poziom:** \`${data.level}\`

${separator}

${progressBar(data.xp, needed)} **${percent}%**

${separator}

📈 XP: \`${data.xp}/${needed}\``
      )
      .setTimestamp();

    return i.reply({ embeds: [embed] });
  }

  // ===== TOP =====
  if (i.commandName === "top") {
    const sorted = Object.entries(db.xp)
      .sort((a, b) => b[1].level - a[1].level)
      .slice(0, 10);

    let desc = "";
    const medals = ["🥇", "🥈", "🥉"];

    for (let x = 0; x < sorted.length; x++) {
      const user = await client.users.fetch(sorted[x][0]);
      const medal = medals[x] || `**${x + 1}.**`;

      desc += `${medal} **${user.username}**\n🎖️ Poziom: \`${sorted[x][1].level}\`\n\n`;
    }

    const embed = new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle("🏆 Ranking Serwera • by B3sttiee")
      .setDescription(desc || "Brak danych")
      .setTimestamp();

    return i.reply({ embeds: [embed] });
  }

  // ===== MESSAGES =====
  if (i.commandName === "messages") {
    const user = i.options.getUser("user") || i.user;
    const data = db.messages[user.id];

    if (!data) return i.reply("Brak danych");

    const embed = new EmbedBuilder()
      .setColor("#2ecc71")
      .setAuthor({
        name: `${user.username} • Aktywność • by B3sttiee`,
        iconURL: user.displayAvatarURL()
      })
      .setDescription(
`💬 **Statystyki wiadomości**

${separator}

📊 Łącznie: \`${data.total}\`
📅 Dzisiaj: \`${data.daily}\`
📆 Tydzień: \`${data.weekly}\`
🗓 Miesiąc: \`${data.monthly}\`

${separator}

📈 Średnia: **${Math.floor(data.total / 30) || 0} msg/dzień**`
      )
      .setTimestamp();

    return i.reply({ embeds: [embed] });
  }
});

// ================= READY =================

client.once("clientReady", async () => {
  console.log("🔥 BOT PRO ONLINE");
  await registerCommands();
});

client.login(TOKEN);
