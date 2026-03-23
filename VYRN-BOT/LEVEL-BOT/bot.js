const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");

const TOKEN = process.env.TOKEN;

// ===== CONFIG =====
const BOOST_ROLE = "1476000398107217980";
const BOOST_MULTIPLIER = 1.75;

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

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===== XP =====
function neededXP(level) {
  return Math.floor(120 * Math.pow(1.25, level));
}

function getMultiplier(member) {
  if (member.roles.cache.has(BOOST_ROLE)) return BOOST_MULTIPLIER;
  return 1;
}

// ===== MESSAGE EVENT =====
client.on("messageCreate", (msg) => {
  if (msg.author.bot) return;

  const db = loadDB();

  // ===== INIT =====
  if (!db.xp[msg.author.id]) db.xp[msg.author.id] = { xp: 0, level: 0 };
  if (!db.messages[msg.author.id]) {
    db.messages[msg.author.id] = { total: 0, daily: 0, weekly: 0, monthly: 0 };
  }

  // ===== MESSAGE TRACK =====
  db.messages[msg.author.id].total++;
  db.messages[msg.author.id].daily++;
  db.messages[msg.author.id].weekly++;
  db.messages[msg.author.id].monthly++;

  // ===== XP =====
  let baseXP = Math.min(msg.content.length / 6, 10);
  let multiplier = getMultiplier(msg.member);
  let gained = Math.floor(baseXP * multiplier);

  db.xp[msg.author.id].xp += gained;

  while (db.xp[msg.author.id].xp >= neededXP(db.xp[msg.author.id].level)) {
    db.xp[msg.author.id].xp -= neededXP(db.xp[msg.author.id].level);
    db.xp[msg.author.id].level++;
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

    const hasBoost = msg.member.roles.cache.has(BOOST_ROLE);

    const embed = new EmbedBuilder()
      .setColor(msg.member.displayHexColor || "#22c55e")
      .setAuthor({
        name: `${msg.author.username} • Level Stats`,
        iconURL: msg.author.displayAvatarURL()
      })
      .setThumbnail(msg.author.displayAvatarURL())
      .setDescription(
        `🏆 **Level:** ${data.level}\n` +
        `📊 **XP:** ${data.xp}/${needed} (${percent}%)\n` +
        `⚡ **Multiplier:** x${multiplier}\n` +
        (hasBoost ? `🎖️ Boost Role Active` : `❌ No Boost Role`)
      )
      .setFooter({ text: "VYRN System • by B3sttiee" });

    return msg.reply({ embeds: [embed] });
  }

  // ===== MESSAGES =====
  if (cmd === "messages") {

    const data = db.messages[msg.author.id];

    const embed = new EmbedBuilder()
      .setColor("#3b82f6")
      .setAuthor({
        name: `${msg.author.username} • Messages`,
        iconURL: msg.author.displayAvatarURL()
      })
      .setThumbnail(msg.author.displayAvatarURL())
      .setDescription(
        `📅 **Today:** ${data.daily}\n` +
        `📆 **Weekly:** ${data.weekly}\n` +
        `🗓️ **Monthly:** ${data.monthly}\n` +
        `📊 **Total:** ${data.total}`
      )
      .setFooter({ text: "VYRN System • by B3sttiee" });

    return msg.reply({ embeds: [embed] });
  }

  // ===== TOP =====
  if (cmd === "top") {

    const ranking = Object.entries(db.xp)
      .sort((a, b) => b[1].level - a[1].level)
      .slice(0, 10);

    let desc = "";

    for (let i = 0; i < ranking.length; i++) {
      const user = msg.guild.members.cache.get(ranking[i][0]);
      if (!user) continue;

      desc += `**#${i + 1}** ${user.user.username} • LVL ${ranking[i][1].level}\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle("🏆 Top Levels")
      .setColor("#22c55e")
      .setDescription(desc || "No data yet")
      .setFooter({ text: "VYRN System • by B3sttiee" });

    return msg.reply({ embeds: [embed] });
  }

});

client.once("ready", () => {
  console.log("🔥 CLEAN UI BOT ONLINE");
});

client.login(TOKEN);
