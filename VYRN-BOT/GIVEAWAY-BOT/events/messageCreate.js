const { EmbedBuilder, Events, PermissionFlagsBits } = require("discord.js");

// ====================== IMPORTY ======================
const { addXP, loadConfig } = require("../utils/levelSystem");
const { addMessage, isDailyReady } = require("../utils/profileSystem");
const { getConfig } = require("../utils/configSystem");
const { addCoins } = require("../utils/economySystem");
const { checkDailyDM } = require("../utils/dailySystem");
const { getCurrentBoost } = require("../utils/boostSystem");

// ====================== COOLDOWNS ======================
const xpCooldown = new Map();
const messageCoinCooldown = new Map();

// ====================== CONFIG ======================
const LEVEL_CHANNEL_ID = "1475999590716018719";

// ====================== HELPERS ======================
function neededXP(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

// ====================== EVENT ======================
module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (!message.guild || message.author.bot) return;

    try {
      const config = await getConfig(message.guild.id) || {};
      const PREFIX = config.prefix || ".";

      if (message.content.startsWith(PREFIX)) {
        await handleCommands(message, PREFIX);
        return;
      }

      await handleXPSystem(message);
    } catch (err) {
      console.error("❌ Błąd w messageCreate:", err);
    }
  }
};

// ====================== GŁÓWNY SYSTEM ======================
async function handleXPSystem(message) {
  const now = Date.now();
  const userId = message.author.id;

  // Cooldown XP
  if (xpCooldown.has(userId) && now - xpCooldown.get(userId) < 2000) return;
  xpCooldown.set(userId, now);

  if (message.content.length < 3) return;

  const cfg = loadConfig();

  // Monety za wiadomość
  if (!messageCoinCooldown.has(userId) || now - messageCoinCooldown.get(userId) > 12000) {
    addCoins(userId, 3);
    messageCoinCooldown.set(userId, now);
  }

  // Pobierz aktualny boost ze sklepu
  const currentMultiplier = getCurrentBoost(userId);

  // Dodawanie XP z boostem
  const result = await addXP(
    message.member,
    Math.floor(cfg.messageXP * currentMultiplier),
    message.content.length
  );

  // Daily System
  addMessage(userId);
  if (isDailyReady(userId)) {
    await checkDailyDM(message.member);
  }

  // Level Up
  if (result?.leveledUp) {
    console.log(`🎉 ${message.author.tag} wbija level ${result.level}!`);
    await sendLevelUpMessage(message, result);

    try {
      const levelUpEmbed = new EmbedBuilder()
        .setColor("#b8a672")
        .setTitle(`🎉 Gratulacje! Osiągnąłeś poziom ${result.level}!`)
        .setDescription(`**+50 🪙** zostało dodane do Twojego konta!\n\nKontynuuj grind!`)
        .setFooter({ text: "VYRN • Level System" })
        .setTimestamp();

      await message.author.send({ embeds: [levelUpEmbed] });
      addCoins(userId, 50);
    } catch (e) {}
  }
}

// ====================== LEVEL UP MESSAGE ======================
async function sendLevelUpMessage(message, result) {
  const levelUpChannel = message.guild.channels.cache.get(LEVEL_CHANNEL_ID);
  if (!levelUpChannel?.isTextBased()) return;

  const nextXP = neededXP(result.level);
  const progress = nextXP > 0 ? Math.floor((result.xp / nextXP) * 100) : 0;

  const embed = new EmbedBuilder()
    .setColor("#b8a672")
    .setAuthor({ name: "✨ LEVEL UP!", iconURL: message.guild.iconURL({ dynamic: true }) })
    .setTitle(`🏆 ${message.author.username} awansował na Level ${result.level}!`)
    .setDescription(
      `<a:XP:1488763317857161377> **XP:** \`${result.xp} / ${nextXP}\` **(${progress}%)**\n` +
      `⚡ **Zdobyto:** \`+${result.gained} XP\`\n\n` +
      `🔥 Gratulacje! Kontynuuj grind!`
    )
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
    .setImage("https://media.discordapp.net/attachments/1475993709240778904/1486898592491896882/ezgif.com-video-to-gif-converter.gif")
    .setFooter({ text: `ID: ${message.author.id}`, iconURL: message.author.displayAvatarURL() })
    .setTimestamp();

  await levelUpChannel.send({ content: `🎉 ${message.author}`, embeds: [embed] }).catch(() => {});
}

// ====================== KOMENDY PREFIXOWE ======================
async function handleCommands(message, PREFIX) {
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift()?.toLowerCase();
  if (!cmd) return;

  if (cmd === "rank" || cmd === "r") {
    await showRank(message);
    return;
  }

  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

  switch (cmd) {
    case "setxp": await setMessageXP(message, args); break;
    case "setvcxp": await setVoiceXP(message, args); break;
    case "setlengthbonus": await setLengthBonus(message, args); break;
    case "multixp": await setGlobalMultiplier(message, args); break;
  }
}

// ====================== RANK ======================
async function showRank(message) {
  const { loadDB } = require("../utils/levelSystem");
  const db = loadDB();
  const userData = db.xp?.[message.author.id] || { xp: 0, level: 0 };
  const needed = neededXP(userData.level);
  const progress = needed > 0 ? Math.min(100, Math.floor((userData.xp / needed) * 100)) : 0;

  const embed = new EmbedBuilder()
    .setColor("#0f172a")
    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
    .setDescription(
      `🏆 **LEVEL ${userData.level}**\n\n` +
      `<a:XP:1488763317857161377> \`${userData.xp} / ${needed} XP\` **(${progress}%)**`
    )
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: "VYRN • Level System" })
    .setTimestamp();

  await message.reply({ embeds: [embed] }).catch(() => {});
}

// ====================== ADMIN COMMANDS ======================
async function setMessageXP(message, args) {
  const val = parseInt(args[0]);
  if (isNaN(val) || val < 1) return message.reply("❌ Poprawne użycie: `.setxp <liczba>`");
  require("../utils/levelSystem").setMessageXP(val);
  await message.reply(`✅ Message XP ustawione na **${val}**`);
}

async function setVoiceXP(message, args) {
  const val = parseInt(args[0]);
  if (isNaN(val) || val < 1) return message.reply("❌ Poprawne użycie: `.setvcxp <liczba>`");
  require("../utils/levelSystem").setVoiceXP(val);
  await message.reply(`✅ Voice XP ustawione na **${val}**`);
}

async function setLengthBonus(message, args) {
  const val = parseFloat(args[0]);
  if (isNaN(val)) return message.reply("❌ Poprawne użycie: `.setlengthbonus <liczba>`");
  require("../utils/levelSystem").setLengthBonus(val);
  await message.reply(`✅ Length Bonus ustawiony na **${val}**`);
}

async function setGlobalMultiplier(message, args) {
  const val = parseFloat(args[0]);
  if (isNaN(val) || val < 0.1) return message.reply("❌ Poprawne użycie: `.multixp <liczba>`");
  require("../utils/levelSystem").setGlobalMultiplier(val);
  await message.reply(`🔥 Global Multiplier ustawiony na **${val}x**`);
}
