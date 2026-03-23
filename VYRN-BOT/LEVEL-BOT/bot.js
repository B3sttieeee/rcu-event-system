const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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

const BOOST_ROLE = "1476000398107217980";
const BOOST_MULTIPLIER = 1.75;

const LEVEL_ROLES = {
  1: "1476000458987278397",
  15: "1476000995501670534",
  30: "1476000459595448442",
  45: "1476000991206707221",
  60: "1476000991823532032",
  75: "1476000992351879229"
};

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

// ===== XP =====
function neededXP(level) {
  return 50 + level * 25;
}

function getMultiplier(member) {
  return member.roles.cache.has(BOOST_ROLE) ? BOOST_MULTIPLIER : 1;
}

// ===== LEVEL UP =====
async function levelUp(member, level) {
  const channel = member.guild.channels.cache.get(LEVEL_CHANNEL);
  if (!channel) return;

  await channel.send(`🎉 ${member}`);

  const embed = new EmbedBuilder()
    .setColor("#facc15")
    .setAuthor({
      name: `${member.user.username} leveled up!`,
      iconURL: member.user.displayAvatarURL()
    })
    .setThumbnail(member.user.displayAvatarURL())
    .setDescription(`🏆 **New Level:** ${level}`)
    .setFooter({ text: "VYRN • by B3sttiee" });

  channel.send({ embeds: [embed] });
}

// ===== XP ADD =====
function addXP(member) {
  const db = loadDB();

  if (!db.xp[member.id]) db.xp[member.id] = { xp: 0, level: 0 };

  let gained = Math.floor(5 * getMultiplier(member));
  db.xp[member.id].xp += gained;

  while (db.xp[member.id].xp >= neededXP(db.xp[member.id].level)) {
    db.xp[member.id].xp -= neededXP(db.xp[member.id].level);
    db.xp[member.id].level++;

    levelUp(member, db.xp[member.id].level);

    const roleId = LEVEL_ROLES[db.xp[member.id].level];
    if (roleId) {
      const role = member.guild.roles.cache.get(roleId);
      if (role) member.roles.add(role).catch(() => {});
    }
  }

  saveDB(db);
}

// ===== MESSAGE EVENT =====
client.on("messageCreate", (msg) => {
  if (msg.author.bot) return;

  const db = loadDB();

  if (!db.messages[msg.author.id]) {
    db.messages[msg.author.id] = { total: 0, daily: 0, weekly: 0 };
  }

  db.messages[msg.author.id].total++;
  db.messages[msg.author.id].daily++;
  db.messages[msg.author.id].weekly++;

  saveDB(db);

  addXP(msg.member);

  if (!msg.content.startsWith(".")) return;
  const cmd = msg.content.slice(1).split(" ")[0];

  if (cmd === "rank") return msg.reply({ embeds: [rankEmbed(msg.member)] });
  if (cmd === "top") return sendLeaderboard(msg, "total");
  if (cmd === "topdaily") return sendLeaderboard(msg, "daily");
  if (cmd === "topweekly") return sendLeaderboard(msg, "weekly");
});

// ===== RANK EMBED =====
function rankEmbed(member) {
  const db = loadDB();
  const data = db.xp[member.id] || { xp: 0, level: 0 };

  const needed = neededXP(data.level);
  const percent = Math.floor((data.xp / needed) * 100);

  return new EmbedBuilder()
    .setColor(member.displayHexColor || "#22c55e")
    .setAuthor({
      name: `${member.user.username} • Stats`,
      iconURL: member.user.displayAvatarURL()
    })
    .setThumbnail(member.user.displayAvatarURL())
    .setDescription(
      `🏆 **Level:** ${data.level}\n\n` +
      `📊 **XP:** ${data.xp}/${needed} (${percent}%)\n\n` +
      `⚡ **Multiplier:** x${getMultiplier(member)}`
    );
}

// ===== PAGINATION =====
async function sendLeaderboard(msg, type) {
  const db = loadDB();

  let data;

  if (type === "total") {
    data = Object.entries(db.xp).sort((a, b) => b[1].level - a[1].level);
  } else {
    data = Object.entries(db.messages).sort((a, b) => b[1][type] - a[1][type]);
  }

  let page = 0;
  const perPage = 10;

  const generateEmbed = () => {
    const slice = data.slice(page * perPage, (page + 1) * perPage);

    let desc = slice.map((u, i) => {
      return `**#${page * perPage + i + 1}** <@${u[0]}> • ${
        type === "total" ? "LVL " + (u[1].level || 0) : u[1][type] || 0
      }`;
    }).join("\n");

    return new EmbedBuilder()
      .setTitle(`🏆 Leaderboard (${type})`)
      .setColor("#3b82f6")
      .setDescription(desc || "No data")
      .setFooter({ text: `Page ${page + 1}` });
  };

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Secondary)
  );

  const message = await msg.reply({
    embeds: [generateEmbed()],
    components: [row]
  });

  const collector = message.createMessageComponentCollector({ time: 60000 });

  collector.on("collect", async (i) => {
    if (i.user.id !== msg.author.id) return;

    if (i.customId === "prev") page = Math.max(page - 1, 0);
    if (i.customId === "next") page++;

    await i.update({
      embeds: [generateEmbed()],
      components: [row]
    });
  });
}

// ===== SLASH =====
const commands = [
  new SlashCommandBuilder().setName("rank").setDescription("Rank"),
  new SlashCommandBuilder().setName("top").setDescription("Leaderboard"),
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

  if (i.commandName === "top") return sendLeaderboard(i, "total");
  if (i.commandName === "topdaily") return sendLeaderboard(i, "daily");
  if (i.commandName === "topweekly") return sendLeaderboard(i, "weekly");
});

// ===== START =====
client.once("ready", () => {
  console.log("🔥 ELITE SYSTEM READY");
});

client.login(TOKEN);
