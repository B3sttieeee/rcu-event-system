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

// ===== XP SYSTEM =====
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
      name: `${member.user.username} • Level Up`,
      iconURL: member.user.displayAvatarURL()
    })
    .setThumbnail(member.user.displayAvatarURL())
    .setDescription(
      `🏆 **New Level Achieved!**\n\n` +
      `🎯 You are now **Level ${level}**\n\n` +
      `🚀 Keep chatting to earn more XP!`
    )
    .setFooter({ text: "VYRN Level System • by B3sttiee" });

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
    db.messages[msg.author.id] = { total: 0, daily: 0, weekly: 0, monthly: 0 };
  }

  db.messages[msg.author.id].total++;
  db.messages[msg.author.id].daily++;
  db.messages[msg.author.id].weekly++;
  db.messages[msg.author.id].monthly++;

  saveDB(db);

  addXP(msg.member);

  if (!msg.content.startsWith(".")) return;

  const cmd = msg.content.slice(1).split(" ")[0];

  if (cmd === "rank" || cmd === "r")
    return msg.reply({ embeds: [rankEmbed(msg.member)] });

  if (cmd === "messages")
    return msg.reply({ embeds: [messagesEmbed(msg.author)] });

  if (cmd === "top") return sendLeaderboard(msg, "total");
  if (cmd === "topdaily") return sendLeaderboard(msg, "daily");
  if (cmd === "topweekly") return sendLeaderboard(msg, "weekly");
});

// ===== RANK EMBED =====
function rankEmbed(member) {
  const db = loadDB();
  const data = db.xp[member.id] || { xp: 0, level: 0 };

  const needed = neededXP(data.level);
  const multiplier = getMultiplier(member);

  const hasBoost = member.roles.cache.has(BOOST_ROLE);

  return new EmbedBuilder()
    .setColor(member.displayHexColor || "#22c55e")
    .setAuthor({
      name: `${member.user.username} • Profile`,
      iconURL: member.user.displayAvatarURL()
    })
    .setThumbnail(member.user.displayAvatarURL())
    .setDescription(
      `🏆 **Level Information**\n` +
      `➤ Level: **${data.level}**\n` +
      `➤ XP: **${data.xp}/${needed}**\n\n` +

      `⚡ **XP Boost Status**\n` +
      (hasBoost
        ? `➤ Activated Booster Role\n➤ **${BOOST_MULTIPLIER}x More XP**`
        : `➤ No Active Boost`)
    )
    .setFooter({ text: "VYRN System • by B3sttiee" });
}

// ===== MESSAGES EMBED =====
function messagesEmbed(user) {
  const db = loadDB();
  const data = db.messages[user.id] || {
    total: 0, daily: 0, weekly: 0, monthly: 0
  };

  return new EmbedBuilder()
    .setColor("#3b82f6")
    .setAuthor({
      name: `${user.username} • Message Activity`,
      iconURL: user.displayAvatarURL()
    })
    .setThumbnail(user.displayAvatarURL())
    .setDescription(
      `📊 **Message Statistics**\n\n` +
      `📅 Today: **${data.daily}**\n` +
      `📆 Weekly: **${data.weekly}**\n` +
      `🗓️ Monthly: **${data.monthly}**\n\n` +
      `📌 Total Messages: **${data.total}**`
    )
    .setFooter({ text: "VYRN System • by B3sttiee" });
}

// ===== LEADERBOARD =====
async function sendLeaderboard(ctx, type) {
  const db = loadDB();

  let data =
    type === "total"
      ? Object.entries(db.xp).sort((a, b) => b[1].level - a[1].level)
      : Object.entries(db.messages).sort((a, b) => b[1][type] - a[1][type]);

  let page = 0;
  const perPage = 10;

  const generate = () => {
    const slice = data.slice(page * perPage, (page + 1) * perPage);

    const desc = slice
      .map((u, i) => {
        return `**#${page * perPage + i + 1}** <@${u[0]}> • ${
          type === "total" ? "Level " + (u[1].level || 0) : u[1][type] || 0
        }`;
      })
      .join("\n");

    return new EmbedBuilder()
      .setColor("#6366f1")
      .setTitle(`🏆 Leaderboard • ${type.toUpperCase()}`)
      .setDescription(desc || "No data")
      .setFooter({ text: `Page ${page + 1}` });
  };

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Secondary)
  );

  const msg = await ctx.reply({ embeds: [generate()], components: [row] });

  const collector = msg.createMessageComponentCollector({ time: 60000 });

  collector.on("collect", async (i) => {
    if (i.user.id !== ctx.author?.id && i.user.id !== ctx.user?.id) return;

    if (i.customId === "prev") page = Math.max(page - 1, 0);
    if (i.customId === "next") page++;

    await i.update({ embeds: [generate()], components: [row] });
  });
}

// ===== SLASH =====
const commands = [
  new SlashCommandBuilder().setName("rank").setDescription("Check your level"),
  new SlashCommandBuilder().setName("messages").setDescription("Check messages"),
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

  if (i.commandName === "rank")
    return i.reply({ embeds: [rankEmbed(i.member)] });

  if (i.commandName === "messages")
    return i.reply({ embeds: [messagesEmbed(i.user)] });

  if (i.commandName === "top") return sendLeaderboard(i, "total");
  if (i.commandName === "topdaily") return sendLeaderboard(i, "daily");
  if (i.commandName === "topweekly") return sendLeaderboard(i, "weekly");
});

// ===== START =====
client.once("ready", () => {
  console.log("🔥 ULTRA SYSTEM READY");
});

client.login(TOKEN);
