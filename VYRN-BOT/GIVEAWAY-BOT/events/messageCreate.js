const { EmbedBuilder, Events, PermissionFlagsBits } = require("discord.js");

// ====================== SYSTEMY ======================
const { addXP, loadConfig, loadDB } = require("../utils/levelSystem");
const { addMessage, isDailyReady } = require("../utils/profileSystem");
const { getConfig } = require("../utils/configSystem");
const { addCoins } = require("../utils/economySystem");
const { checkDailyDM } = require("../utils/dailySystem");
const { getCurrentBoost } = require("../utils/boostSystem");

// 👉 AI (opcjonalnie — nie crashuje jeśli brak)
let ticketAI = null;
try {
  ticketAI = require("../utils/ticketAI").handleTicketAI;
} catch (e) {
  console.log("⚠️ ticketAI nie załadowany");
}

// ====================== COOLDOWN ======================
const xpCooldown = new Map();
const coinCooldown = new Map();

// ====================== CONFIG ======================
const LEVEL_CHANNEL_ID = "1475999590716018719";

// ====================== MAIN EVENT ======================
module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    if (!message.guild || message.author.bot) return;

    try {
      const config = await getConfig(message.guild.id).catch(() => ({}));
      const PREFIX = config?.prefix || ".";

      // ====================== PREFIX COMMANDS ======================
      if (message.content.startsWith(PREFIX)) {
        return await handleCommands(message, PREFIX);
      }

      // ====================== AI (TICKET) ======================
      if (ticketAI) {
        await ticketAI(message, message.client);
      }

      // ====================== XP SYSTEM ======================
      await handleXP(message);

    } catch (err) {
      console.error("❌ MessageCreate error:", err);
    }
  }
};

// ====================== XP SYSTEM ======================
async function handleXP(message) {
  const now = Date.now();
  const userId = message.author.id;

  // anti spam XP
  const lastXP = xpCooldown.get(userId) || 0;
  if (now - lastXP < 2000) return;
  xpCooldown.set(userId, now);

  if (message.content.length < 3) return;

  const cfg = loadConfig();

  // ====================== COINS ======================
  const lastCoin = coinCooldown.get(userId) || 0;
  if (now - lastCoin > 12000) {
    addCoins(userId, 3);
    coinCooldown.set(userId, now);
  }

  // ====================== XP ======================
  const boost = getCurrentBoost(userId);

  const result = await addXP(
    message.member,
    Math.floor((cfg.messageXP || 10) * boost),
    message.content.length
  );

  // ====================== DAILY ======================
  addMessage(userId);

  if (isDailyReady(userId)) {
    await checkDailyDM(message.member);
  }

  // ====================== LEVEL UP ======================
  if (result?.leveledUp) {
    await sendLevelUp(message, result);

    try {
      await message.author.send({
        embeds: [
          new EmbedBuilder()
            .setColor("#b8a672")
            .setTitle(`🎉 Level UP! ${result.level}`)
            .setDescription(`+50 coins nagrody`)
            .setTimestamp()
        ]
      });

      addCoins(userId, 50);
    } catch {}
  }
}

// ====================== LEVEL UP ======================
async function sendLevelUp(message, result) {
  const channel = message.guild.channels.cache.get(LEVEL_CHANNEL_ID);
  if (!channel?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor("#b8a672")
    .setTitle(`🏆 Level UP ${message.author.username}`)
    .setDescription(`Nowy poziom: **${result.level}**`)
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
    .setTimestamp();

  channel.send({
    content: `🎉 ${message.author}`,
    embeds: [embed],
  }).catch(() => {});
}

// ====================== COMMANDS ======================
async function handleCommands(message, PREFIX) {
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift()?.toLowerCase();
  if (!cmd) return;

  // public rank
  if (cmd === "rank" || cmd === "r") {
    return showRank(message);
  }

  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

  switch (cmd) {
    case "setxp":
      return setMessageXP(message, args);

    case "setvcxp":
      return setVoiceXP(message, args);

    case "setlengthbonus":
      return setLengthBonus(message, args);

    case "multixp":
      return setGlobalMultiplier(message, args);
  }
}

// ====================== RANK ======================
async function showRank(message) {
  const db = loadDB();
  const user = db.xp?.[message.author.id] || { xp: 0, level: 0 };

  const needed = Math.floor(100 * Math.pow(user.level, 1.5));
  const percent = needed ? Math.floor((user.xp / needed) * 100) : 0;

  const embed = new EmbedBuilder()
    .setColor("#0f172a")
    .setAuthor({
      name: message.author.username,
      iconURL: message.author.displayAvatarURL({ dynamic: true }),
    })
    .setDescription(
      `🏆 Level: **${user.level}**\n` +
      `XP: \`${user.xp}/${needed}\` (${percent}%)`
    )
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

  message.reply({ embeds: [embed] }).catch(() => {});
}

// ====================== ADMIN ======================
function setMessageXP(message, args) {
  const val = parseInt(args[0]);
  if (!val) return message.reply("❌ `.setxp <liczba>`");

  require("../utils/levelSystem").setMessageXP(val);
  message.reply(`✅ Message XP = ${val}`);
}

function setVoiceXP(message, args) {
  const val = parseInt(args[0]);
  if (!val) return message.reply("❌ `.setvcxp <liczba>`");

  require("../utils/levelSystem").setVoiceXP(val);
  message.reply(`✅ Voice XP = ${val}`);
}

function setLengthBonus(message, args) {
  const val = parseFloat(args[0]);
  if (!val) return message.reply("❌ `.setlengthbonus <liczba>`");

  require("../utils/levelSystem").setLengthBonus(val);
  message.reply(`✅ Length bonus = ${val}`);
}

function setGlobalMultiplier(message, args) {
  const val = parseFloat(args[0]);
  if (!val) return message.reply("❌ `.multixp <liczba>`");

  require("../utils/levelSystem").setGlobalMultiplier(val);
  message.reply(`🔥 Multiplier = ${val}x`);
}
