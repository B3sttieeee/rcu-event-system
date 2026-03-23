const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const fs = require("fs");

// ================= ENV =================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ]
});

// ================= CONFIG =================

const LEVEL_CHANNEL = "1475999590716018719";

const ROLES = {
  1: "1476000458987278397",
  15: "1476000995501670534",
  30: "1476000459595448442",
  45: "1476000991206707221",
  60: "1476000991823532032",
  75: "1476000992351879229"
};

const BOOST_ROLE = "1476000398107217980"; // 2.5x XP

// ================= DB =================

const DB_PATH = "./data.json";

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ================= XP SYSTEM =================

const cooldown = new Map();

function neededXP(level) {
  return 100 + level * 75; // trudniejsze levele
}

function addXP(userId, member) {
  const db = loadDB();

  if (!db.xp[userId]) {
    db.xp[userId] = { xp: 0, level: 0 };
  }

  let gain = Math.floor(Math.random() * 10) + 10;

  // multiplier
  if (member.roles.cache.has(BOOST_ROLE)) {
    gain = Math.floor(gain * 2.5);
  }

  db.xp[userId].xp += gain;

  let leveled = false;

  while (db.xp[userId].xp >= neededXP(db.xp[userId].level)) {
    db.xp[userId].xp -= neededXP(db.xp[userId].level);
    db.xp[userId].level++;
    leveled = true;
  }

  saveDB(db);

  return {
    leveled,
    level: db.xp[userId].level,
    xp: db.xp[userId].xp
  };
}

// ================= LEVEL UP =================

async function levelUp(member, level) {
  const channel = await client.channels.fetch(LEVEL_CHANNEL);

  const embed = new EmbedBuilder()
    .setColor("#FFD700")
    .setTitle(`${member.user.username} leveled up!`)
    .setDescription(
`**CONGRATS**
You are now level **${level}**!!`
    )
    .setThumbnail(member.user.displayAvatarURL())
    .setFooter({ text: "VYRN — Vengeance Yearns Ruthless Night" });

  channel.send({ embeds: [embed] });

  if (ROLES[level]) {
    try {
      await member.roles.add(ROLES[level]);
    } catch {}
  }
}

// ================= MESSAGE XP =================

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const now = Date.now();

  if (cooldown.has(msg.author.id)) {
    if (now - cooldown.get(msg.author.id) < 30000) return;
  }

  cooldown.set(msg.author.id, now);

  const result = addXP(msg.author.id, msg.member);

  if (result.leveled) {
    levelUp(msg.member, result.level);
  }
});

// ================= VOICE XP =================

setInterval(() => {
  const db = loadDB();

  client.guilds.cache.forEach(guild => {
    guild.members.cache.forEach(member => {
      if (!member.voice.channel) return;

      if (!db.xp[member.id]) {
        db.xp[member.id] = { xp: 0, level: 0 };
      }

      let gain = 5;

      if (member.roles.cache.has(BOOST_ROLE)) {
        gain *= 2.5;
      }

      db.xp[member.id].xp += gain;

      if (db.xp[member.id].xp >= neededXP(db.xp[member.id].level)) {
        db.xp[member.id].xp = 0;
        db.xp[member.id].level++;

        levelUp(member, db.xp[member.id].level);
      }
    });
  });

  saveDB(db);

}, 60000); // co minute

// ================= COMMANDS =================

const commands = [
  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Twój poziom"),

  new SlashCommandBuilder()
    .setName("top")
    .setDescription("Topka")
];

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
}

// ================= RANK =================

client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;

  const db = loadDB();

  if (i.commandName === "rank") {

    const user = i.user;
    const data = db.xp[user.id] || { xp: 0, level: 0 };

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle(`${user.username}`)
      .setDescription(
`**LEVEL:** ${data.level}
**XP:** ${data.xp}/${neededXP(data.level)}`
      )
      .setThumbnail(user.displayAvatarURL());

    i.reply({ embeds: [embed] });
  }

  if (i.commandName === "top") {

    const sorted = Object.entries(db.xp)
      .sort((a, b) => b[1].level - a[1].level)
      .slice(0, 10);

    let desc = "";

    for (let i2 = 0; i2 < sorted.length; i2++) {
      const user = await client.users.fetch(sorted[i2][0]);
      desc += `**${i2 + 1}. ${user.username}** — lvl ${sorted[i2][1].level}\n`;
    }

    const embed = new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle("🏆 TOP GRACZY")
      .setDescription(desc || "Brak danych");

    i.reply({ embeds: [embed] });
  }
});

// ================= READY =================

client.once("clientReady", async () => {
  console.log("🔥 LEVEL SYSTEM READY");
  await registerCommands();
});

client.login(TOKEN);
