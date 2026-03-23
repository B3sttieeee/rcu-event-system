const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const fs = require("fs");

// ===== CONFIG =====
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const LEVEL_CHANNEL = "1475999590716018719";

// BOOST ROLE
const BOOST_ROLE = "1476000398107217980";
const BOOST_MULTIPLIER = 1.75;

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
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

// ===== XP SYSTEM (ROSNĄCY) =====
function neededXP(level) {
  return Math.floor(10 * Math.pow(2.5, level)); // rosnący system
}

// ===== MULTIPLIER =====
function getMultiplier(member) {
  if (member.roles.cache.has(BOOST_ROLE)) return BOOST_MULTIPLIER;
  return 1;
}

// ===== LEVEL UP =====
async function sendLevelUp(guild, user, level) {
  const channel = guild.channels.cache.get(LEVEL_CHANNEL);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#facc15")
    .setTitle("🎉 LEVEL UP!")
    .setDescription(
      `🎉 **Congratulations <@${user.id}>!**\n\n` +
      `🏆 You reached **Level ${level}**`
    )
    .setThumbnail(user.displayAvatarURL())
    .setFooter({ text: "VYRN Level System • by B3sttiee" });

  channel.send({ embeds: [embed] });
}

// ===== XP ADD =====
function addXP(member, amount) {
  const db = loadDB();

  if (!db.xp[member.id]) db.xp[member.id] = { xp: 0, level: 0 };

  let multiplier = getMultiplier(member);
  let gained = Math.floor(amount * multiplier);

  db.xp[member.id].xp += gained;

  while (db.xp[member.id].xp >= neededXP(db.xp[member.id].level)) {
    db.xp[member.id].xp -= neededXP(db.xp[member.id].level);
    db.xp[member.id].level++;

    sendLevelUp(member.guild, member.user, db.xp[member.id].level);
  }

  saveDB(db);
}

// ===== MESSAGE EVENT =====
client.on("messageCreate", (msg) => {
  if (msg.author.bot) return;

  const db = loadDB();

  // ===== INIT =====
  if (!db.messages[msg.author.id]) {
    db.messages[msg.author.id] = { total: 0, daily: 0, weekly: 0, monthly: 0 };
  }

  db.messages[msg.author.id].total++;
  db.messages[msg.author.id].daily++;
  db.messages[msg.author.id].weekly++;
  db.messages[msg.author.id].monthly++;

  // ===== XP FROM MESSAGE =====
  let xp = Math.min(msg.content.length / 5, 10);
  addXP(msg.member, xp);

  saveDB(db);

  if (!msg.content.startsWith(".")) return;

  const args = msg.content.slice(1).split(" ");
  const cmd = args[0].toLowerCase();

  handleCommands(msg, cmd);
});

// ===== VOICE XP =====
setInterval(() => {
  client.guilds.cache.forEach(guild => {
    guild.members.cache.forEach(member => {
      if (member.voice.channel && !member.user.bot) {
        addXP(member, 15);
      }
    });
  });
}, 60000);

// ===== EMBEDS =====
function rankEmbed(member) {
  const db = loadDB();
  const data = db.xp[member.id] || { xp: 0, level: 0 };

  const needed = neededXP(data.level);
  const percent = Math.floor((data.xp / needed) * 100);
  const multiplier = getMultiplier(member);

  return new EmbedBuilder()
    .setColor(member.displayHexColor || "#22c55e")
    .setAuthor({
      name: `${member.user.username} • Level Stats`,
      iconURL: member.user.displayAvatarURL()
    })
    .setThumbnail(member.user.displayAvatarURL())
    .setDescription(
      `🏆 **Level:** ${data.level}\n\n` +
      `📊 **XP:** ${data.xp}/${needed} (${percent}%)\n\n` +
      `⚡ **Multiplier:** x${multiplier}\n\n` +
      (member.roles.cache.has(BOOST_ROLE)
        ? `🎖️ **Boost Role Active**`
        : `❌ **No Boost Role**`)
    )
    .setFooter({ text: "VYRN System • by B3sttiee" });
}

function messagesEmbed(user) {
  const db = loadDB();
  const data = db.messages[user.id] || {
    total: 0, daily: 0, weekly: 0, monthly: 0
  };

  return new EmbedBuilder()
    .setColor("#3b82f6")
    .setAuthor({
      name: `${user.username} • Messages`,
      iconURL: user.displayAvatarURL()
    })
    .setThumbnail(user.displayAvatarURL())
    .setDescription(
      `📅 **Today:** ${data.daily}\n\n` +
      `📆 **Weekly:** ${data.weekly}\n\n` +
      `🗓️ **Monthly:** ${data.monthly}\n\n` +
      `📊 **Total:** ${data.total}`
    )
    .setFooter({ text: "VYRN System • by B3sttiee" });
}

// ===== COMMAND HANDLER =====
function handleCommands(msg, cmd) {

  if (cmd === "rank" || cmd === "r") {
    return msg.reply({ embeds: [rankEmbed(msg.member)] });
  }

  if (cmd === "messages") {
    return msg.reply({ embeds: [messagesEmbed(msg.author)] });
  }

  if (cmd === "top") {
    const db = loadDB();

    const ranking = Object.entries(db.xp)
      .sort((a, b) => b[1].level - a[1].level)
      .slice(0, 10);

    let desc = ranking.map((u, i) => {
      return `**#${i + 1}** <@${u[0]}> • Level ${u[1].level}`;
    }).join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🏆 Top Levels")
      .setColor("#22c55e")
      .setDescription(desc || "No data yet");

    return msg.reply({ embeds: [embed] });
  }
}

// ===== SLASH COMMANDS =====
const commands = [
  new SlashCommandBuilder().setName("rank").setDescription("Check rank"),
  new SlashCommandBuilder().setName("messages").setDescription("Check messages"),
  new SlashCommandBuilder().setName("top").setDescription("Top players")
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
})();

client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;

  if (i.commandName === "rank") {
    return i.reply({ embeds: [rankEmbed(i.member)] });
  }

  if (i.commandName === "messages") {
    return i.reply({ embeds: [messagesEmbed(i.user)] });
  }

  if (i.commandName === "top") {
    const db = loadDB();

    const ranking = Object.entries(db.xp)
      .sort((a, b) => b[1].level - a[1].level)
      .slice(0, 10);

    let desc = ranking.map((u, i) => {
      return `**#${i + 1}** <@${u[0]}> • Level ${u[1].level}`;
    }).join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🏆 Top Levels")
      .setColor("#22c55e")
      .setDescription(desc || "No data yet");

    return i.reply({ embeds: [embed] });
  }
});

// ===== START =====
client.once("ready", () => {
  console.log("🔥 FINAL SYSTEM ONLINE");
});

client.login(TOKEN);
