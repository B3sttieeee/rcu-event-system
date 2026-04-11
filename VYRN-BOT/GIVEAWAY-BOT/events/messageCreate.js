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

  // Cooldown na XP
  if (xpCooldown.has(userId) && now - xpCooldown.get(userId) < 2000) return;
  xpCooldown.set(userId, now);

  if (message.content.length < 3) return;

  const cfg = loadConfig();

  // === MONETY ZA WIADOMOŚĆ ===
  if (!messageCoinCooldown.has(userId) || now - messageCoinCooldown.get(userId) > 12000) {
    addCoins(userId, 3);
    messageCoinCooldown.set(userId, now);
  }

  // === BOOST + XP ===
  const currentMultiplier = getCurrentBoost(userId);
  const result = await addXP(
    message.member,
    Math.floor(cfg.messageXP * currentMultiplier),
    message.content.length
  );

  // Daily
  addMessage(userId);
  if (isDailyReady(userId)) {
    await checkDailyDM(message.member);
  }

  if (result?.leveledUp) {
    console.log(`🎉 ${message.author.tag} wbija level ${result.level}!`);
    await sendLevelUpMessage(message, result);

    try {
      await message.author.send({
        embeds: [new EmbedBuilder()
          .setColor("#b8a672")
          .setTitle(`🎉 Level ${result.level}!`)
          .setDescription(`**+50** <:CASHH:1491180511308157041> dodano!`)
        ]
      });
      addCoins(userId, 50);
    } catch (e) {}
  }
}

// ====================== LEVEL UP MESSAGE ======================
async function sendLevelUpMessage(message, result) {
  const channel = message.guild.channels.cache.get(LEVEL_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#b8a672")
    .setTitle(`🏆 ${message.author.username} awansował na Level ${result.level}!`)
    .setDescription(`Zdobyto: +${result.gained} XP`)
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

  channel.send({ content: `🎉 ${message.author}`, embeds: [embed] }).catch(() => {});
}

// ====================== KOMENDY (bez zmian) ======================
async function handleCommands(message, PREFIX) {
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift()?.toLowerCase();
  if (!cmd) return;

  if (cmd === "rank" || cmd === "r") return await showRank(message);
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

  switch (cmd) {
    case "setxp": await setMessageXP(message, args); break;
    case "setvcxp": await setVoiceXP(message, args); break;
    case "setlengthbonus": await setLengthBonus(message, args); break;
    case "multixp": await setGlobalMultiplier(message, args); break;
  }
}

// Reszta funkcji (showRank, setMessageXP itd.) zostaw bez zmian albo wklej z poprzedniej wersji.

async function showRank(message) { /* Twój kod ranku */ }
async function setMessageXP(message, args) { /* ... */ }
async function setVoiceXP(message, args) { /* ... */ }
async function setLengthBonus(message, args) { /* ... */ }
async function setGlobalMultiplier(message, args) { /* ... */ }
