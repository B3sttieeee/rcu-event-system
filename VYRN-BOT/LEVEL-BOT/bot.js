const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

const { RankCardBuilder } = require("rank-card");
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

// MESSAGE TRACK
function trackMessage(userId) {
  const db = loadDB();

  if (!db.messages[userId]) {
    db.messages[userId] = { total: 0 };
  }

  db.messages[userId].total++;
  saveDB(db);
}

// MESSAGE EVENT
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
  new SlashCommandBuilder().setName("rank").setDescription("Twój poziom"),
  new SlashCommandBuilder().setName("top").setDescription("Topka"),
  new SlashCommandBuilder()
    .setName("messages")
    .setDescription("Ilość wiadomości")
    .addUserOption(o => o.setName("user").setDescription("Użytkownik"))
];

// REGISTER
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
}

// INTERACTIONS
client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;

  const db = loadDB();

  // RANK
  if (i.commandName === "rank") {

    const userData = db.xp[i.user.id] || { xp: 0, level: 0 };

    const sorted = Object.entries(db.xp)
      .sort((a, b) => b[1].level - a[1].level);

    const rankPosition = sorted.findIndex(u => u[0] === i.user.id) + 1;
    const needed = neededXP(userData.level);

    const card = await new RankCardBuilder({
      currentLvl: userData.level,
      currentRank: rankPosition || 0,
      currentXP: userData.xp,
      requiredXP: needed,
      avatarImgURL: i.user.displayAvatarURL({ extension: "png" }),
      nicknameText: { content: i.user.username },
      backgroundColor: { background: "#0f172a", bubbles: "#22c55e" },
      progressBarColor: "#22c55e",
      colorTextDefault: "#22c55e"
    }).build();

    return i.reply({
      files: [{ attachment: card.toBuffer(), name: "rank.png" }]
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

    const embed = new EmbedBuilder()
      .setTitle(`💬 ${user.username}`)
      .setDescription(`Wiadomości: ${data.total}`)
      .setColor("#3b82f6");

    return i.reply({ embeds: [embed] });
  }
});

// READY
client.once("clientReady", async () => {
  console.log("BOT ONLINE");
  await registerCommands();
});

client.login(TOKEN);
