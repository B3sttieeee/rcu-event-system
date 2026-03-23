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

// ===== ROLE REWARDS =====
const LEVEL_ROLES = {
  1: "1476000458987278397",
  15: "1476000995501670534",
  30: "1476000459595448442",
  45: "1476000991206707221",
  60: "1476000991823532032",
  75: "1476000992351879229"
};

// BOOST
const BOOST_ROLE = "1476000398107217980";
const BOOST_MULTIPLIER = 1.75;

// ===== CLIENT =====
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
  try {
    return JSON.parse(fs.readFileSync(DB_PATH));
  } catch {
    return { xp: {}, messages: {} };
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== XP SYSTEM =====
function neededXP(level) {
  return 50 + (level * 25);
}

function getMultiplier(member) {
  if (member.roles.cache.has(BOOST_ROLE)) return BOOST_MULTIPLIER;
  return 1;
}

// ===== LEVEL UP =====
async function sendLevelUp(member, level) {
  const channel = member.guild.channels.cache.get(LEVEL_CHANNEL);
  if (!channel) return;

  await channel.send(`🎉 ${member}`);

  const embed = new EmbedBuilder()
    .setColor("#facc15")
    .setTitle("LEVEL UP!")
    .setDescription(`🏆 **New Level:** ${level}`)
    .setThumbnail(member.user.displayAvatarURL());

  channel.send({ embeds: [embed] });
}

// ===== ROLE REWARD =====
async function checkRoleReward(member, level) {
  if (!LEVEL_ROLES[level]) return;

  const role = member.guild.roles.cache.get(LEVEL_ROLES[level]);
  if (!role) return;

  await member.roles.add(role).catch(() => {});
}

// ===== ADD XP =====
function addXP(member) {
  const db = loadDB();

  if (!db.xp[member.id]) db.xp[member.id] = { xp: 0, level: 0 };

  let xp = Math.floor(5 * getMultiplier(member));

  db.xp[member.id].xp += xp;

  while (db.xp[member.id].xp >= neededXP(db.xp[member.id].level)) {
    db.xp[member.id].xp -= neededXP(db.xp[member.id].level);
    db.xp[member.id].level++;

    sendLevelUp(member, db.xp[member.id].level);
    checkRoleReward(member, db.xp[member.id].level);
  }

  saveDB(db);
}

// ===== RESET DAILY/WEEKLY =====
setInterval(() => {
  const db = loadDB();

  Object.keys(db.messages).forEach(id => {
    db.messages[id].daily = 0;
  });

  saveDB(db);
}, 86400000); // daily

setInterval(() => {
  const db = loadDB();

  Object.keys(db.messages).forEach(id => {
    db.messages[id].weekly = 0;
  });

  saveDB(db);
}, 604800000); // weekly

// ===== MESSAGE EVENT =====
client.on("messageCreate", (msg) => {
  if (msg.author.bot) return;

  const db = loadDB();

  if (!db.messages[msg.author.id]) {
    db.messages[msg.author.id] = {
      total: 0,
      daily: 0,
      weekly: 0,
      monthly: 0
    };
  }

  db.messages[msg.author.id].total++;
  db.messages[msg.author.id].daily++;
  db.messages[msg.author.id].weekly++;
  db.messages[msg.author.id].monthly++;

  saveDB(db);

  addXP(msg.member);

  if (!msg.content.startsWith(".")) return;

  const cmd = msg.content.slice(1).split(" ")[0];

  handleCommands(msg, cmd);
});

// ===== EMBEDS =====
function rankEmbed(member) {
  const db = loadDB();
  const data = db.xp[member.id] || { xp: 0, level: 0 };

  return new EmbedBuilder()
    .setColor("#22c55e")
    .setAuthor({
      name: `${member.user.username} • Stats`,
      iconURL: member.user.displayAvatarURL()
    })
    .setDescription(
      `🏆 **Level:** ${data.level}\n\n` +
      `📊 **XP:** ${data.xp}/${neededXP(data.level)}\n\n` +
      `⚡ **Multiplier:** x${getMultiplier(member)}`
    );
}

function leaderboardEmbed(type, guild) {
  const db = loadDB();

  let data;

  if (type === "daily") {
    data = Object.entries(db.messages)
      .sort((a, b) => b[1].daily - a[1].daily);
  } else if (type === "weekly") {
    data = Object.entries(db.messages)
      .sort((a, b) => b[1].weekly - a[1].weekly);
  } else {
    data = Object.entries(db.xp)
      .sort((a, b) => b[1].level - a[1].level);
  }

  const top = data.slice(0, 10);

  let desc = top.map((u, i) => {
    return `**#${i + 1}** <@${u[0]}> • ${
      type === "total" ? "Level " + u[1].level : u[1][type]
    }`;
  }).join("\n");

  return new EmbedBuilder()
    .setTitle(`🏆 Leaderboard (${type})`)
    .setColor("#3b82f6")
    .setDescription(desc || "No data");
}

// ===== COMMANDS =====
function handleCommands(msg, cmd) {

  if (cmd === "rank" || cmd === "r") {
    return msg.reply({ embeds: [rankEmbed(msg.member)] });
  }

  if (cmd === "top") {
    return msg.reply({ embeds: [leaderboardEmbed("total", msg.guild)] });
  }

  if (cmd === "topdaily") {
    return msg.reply({ embeds: [leaderboardEmbed("daily", msg.guild)] });
  }

  if (cmd === "topweekly") {
    return msg.reply({ embeds: [leaderboardEmbed("weekly", msg.guild)] });
  }
}

// ===== SLASH =====
const commands = [
  new SlashCommandBuilder().setName("rank").setDescription("Check rank"),
  new SlashCommandBuilder().setName("top").setDescription("Leaderboard total"),
  new SlashCommandBuilder().setName("topdaily").setDescription("Daily leaderboard"),
  new SlashCommandBuilder().setName("topweekly").setDescription("Weekly leaderboard")
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

  if (i.commandName === "top") {
    return i.reply({ embeds: [leaderboardEmbed("total", i.guild)] });
  }

  if (i.commandName === "topdaily") {
    return i.reply({ embeds: [leaderboardEmbed("daily", i.guild)] });
  }

  if (i.commandName === "topweekly") {
    return i.reply({ embeds: [leaderboardEmbed("weekly", i.guild)] });
  }
});

client.once("ready", () => {
  console.log("🔥 FINAL BOSS SYSTEM ONLINE");
});

client.login(TOKEN);
