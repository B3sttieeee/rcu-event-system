const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const fs = require("fs");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// ===== CONFIG =====
const LEVEL_CHANNEL = "1475999590716018719";

// BOOST ROLE
const BOOST_ROLE = "1476000398107217980";
const BOOST_MULTIPLIER = 1.75;

// ===== DB =====
const DB_PATH = "./data.json";

function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH));
  } catch {
    return { xp: {}, messages: {}, voice: {} };
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ===== XP SYSTEM =====
function neededXP(level) {
  return Math.floor(120 * Math.pow(1.25, level));
}

function getMultiplier(member) {
  if (member.roles.cache.has(BOOST_ROLE)) return BOOST_MULTIPLIER;
  return 1;
}

// ===== LEVEL UP =====
async function levelUp(msg, userId, level) {
  const channel = msg.guild.channels.cache.get(LEVEL_CHANNEL);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("🎉 LEVEL UP!")
    .setDescription(`Congratulations <@${userId}>!\n\n🏆 You reached level **${level}**`)
    .setColor("#facc15")
    .setThumbnail(msg.author.displayAvatarURL())
    .setFooter({ text: "VYRN Level System" });

  channel.send({ embeds: [embed] });
}

// ===== MESSAGE XP =====
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const db = loadDB();

  // ===== MESSAGE TRACK =====
  if (!db.messages[msg.author.id]) {
    db.messages[msg.author.id] = { total: 0, daily: 0, weekly: 0, monthly: 0 };
  }

  db.messages[msg.author.id].total++;
  db.messages[msg.author.id].daily++;
  db.messages[msg.author.id].weekly++;
  db.messages[msg.author.id].monthly++;

  // ===== XP FROM MESSAGE =====
  if (!db.xp[msg.author.id]) db.xp[msg.author.id] = { xp: 0, level: 0 };

  let baseXP = Math.min(msg.content.length / 5, 10); // zależne od długości
  let multiplier = getMultiplier(msg.member);

  let gained = Math.floor(baseXP * multiplier);

  db.xp[msg.author.id].xp += gained;

  while (db.xp[msg.author.id].xp >= neededXP(db.xp[msg.author.id].level)) {
    db.xp[msg.author.id].xp -= neededXP(db.xp[msg.author.id].level);
    db.xp[msg.author.id].level++;

    levelUp(msg, msg.author.id, db.xp[msg.author.id].level);
  }

  saveDB(db);

  // ===== PREFIX =====
  if (!msg.content.startsWith(".")) return;

  const args = msg.content.slice(1).split(" ");
  const cmd = args[0];

  // ===== RANK =====
  if (cmd === "rank" || cmd === "r") {
    const data = db.xp[msg.author.id];
    const needed = neededXP(data.level);
    const percent = Math.floor((data.xp / needed) * 100);
    const multiplier = getMultiplier(msg.member);

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${msg.author.username} • Stats`,
        iconURL: msg.author.displayAvatarURL()
      })
      .setColor(msg.member.displayHexColor || "#22c55e")
      .setThumbnail(msg.author.displayAvatarURL())
      .addFields(
        { name: "🏆 Level", value: `${data.level}`, inline: true },
        { name: "📊 XP", value: `${data.xp}/${needed} (${percent}%)`, inline: true },
        { name: "⚡ Multiplier", value: `x${multiplier}`, inline: true }
      );

    return msg.reply({ embeds: [embed] });
  }

  // ===== MESSAGES =====
  if (cmd === "messages") {
    const data = db.messages[msg.author.id];

    const embed = new EmbedBuilder()
      .setTitle("💬 Messages Stats")
      .setColor("#3b82f6")
      .setThumbnail(msg.author.displayAvatarURL())
      .addFields(
        { name: "📅 Today", value: `${data.daily}`, inline: true },
        { name: "📆 Weekly", value: `${data.weekly}`, inline: true },
        { name: "🗓️ Monthly", value: `${data.monthly}`, inline: true },
        { name: "📊 Total", value: `${data.total}`, inline: false }
      );

    return msg.reply({ embeds: [embed] });
  }

  // ===== TOP =====
  if (cmd === "top") {
    const users = Object.entries(db.messages)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    let desc = "";

    for (let i = 0; i < users.length; i++) {
      const user = await client.users.fetch(users[i][0]);
      desc += `**#${i + 1}** ${user.username} — ${users[i][1].total} msgs\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle("🏆 Messages Leaderboard")
      .setDescription(desc)
      .setColor("#22c55e");

    return msg.reply({ embeds: [embed] });
  }
});

// ===== VOICE XP =====
setInterval(() => {
  const db = loadDB();

  client.guilds.cache.forEach(guild => {
    guild.members.cache.forEach(member => {
      if (member.voice.channel) {
        if (!db.xp[member.id]) db.xp[member.id] = { xp: 0, level: 0 };

        let multiplier = getMultiplier(member);
        let xp = Math.floor(15 * multiplier);

        db.xp[member.id].xp += xp;
      }
    });
  });

  saveDB(db);
}, 60000);

// ===== SLASH =====
const commands = [
  new SlashCommandBuilder().setName("rank").setDescription("Check rank"),
  new SlashCommandBuilder().setName("messages").setDescription("Check messages"),
  new SlashCommandBuilder().setName("top").setDescription("Leaderboard")
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands
  });
})();

client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;

  if (i.commandName === "rank") {
    return i.reply("Use .rank");
  }

  if (i.commandName === "messages") {
    return i.reply("Use .messages");
  }

  if (i.commandName === "top") {
    return i.reply("Use .top");
  }
});

// ===== START =====
client.once("ready", () => {
  console.log("🔥 FULL SYSTEM ONLINE");
});

client.login(TOKEN);
