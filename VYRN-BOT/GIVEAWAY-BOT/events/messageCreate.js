const {
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const {
  addXP,
  loadConfig
} = require("../utils/levelSystem");

const { getConfig } = require("../utils/configSystem");
const { addMessage, isDailyReady } = require("../utils/profileSystem");

const fs = require("fs");

// ===== DB PATH
const DB_PATH = "/data/levels.json";

const cooldown = new Map();
const dailyNotified = new Set();

// ===== LOAD DB
function loadDB() {
  if (!fs.existsSync("/data")) {
    fs.mkdirSync("/data", { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ xp: {} }, null, 2));
  }

  return JSON.parse(fs.readFileSync(DB_PATH));
}

// ===== XP FORMULA
function neededXP(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

// ===== EVENT
module.exports = {
  name: "messageCreate",

  async execute(message) {
    try {
      if (!message.guild) return;
      if (message.author.bot) return;

      const config = getConfig(message.guild.id);

      const PREFIX = config.prefix || ".";
      const LEVEL_CHANNEL = "1475999590716018719";
      const BOOST_ROLE = config.boostRole;

      const isCommand = message.content.startsWith(PREFIX);

      // =========================
      // 💬 KOMENDY
      // =========================
      if (isCommand) {
        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const cmd = args.shift()?.toLowerCase();

        const db = loadDB();
        const data = db.xp[message.author.id] || { xp: 0, level: 0 };

        if (cmd === "rank" || cmd === "r") {
          const needed = neededXP(data.level);
          const progress = Math.min(
            100,
            Math.floor((data.xp / needed) * 100)
          );

          const cfg = loadConfig();

          const hasBoost = BOOST_ROLE
            ? message.member.roles.cache.has(BOOST_ROLE)
            : false;

          const embed = new EmbedBuilder()
            .setColor("#0f172a")
            .setAuthor({
              name: `${message.author.username}`,
              iconURL: message.author.displayAvatarURL()
            })
            .setDescription(
              `🏆 **LEVEL ${data.level}**\n\n` +
              `<a:XP:1488763317857161377> \`${data.xp} / ${needed} XP\` (${progress}%)\n\n` +
              `⚡ Boost: ${hasBoost ? "✅ Active" : "❌ No Active"}\n` +
              `🌍 Multiplier: \`${cfg.globalMultiplier}x\``
            )
            .setThumbnail(message.author.displayAvatarURL())
            .setFooter({ text: "VYRN • Level System" });

          return message.reply({ embeds: [embed] });
        }

        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        if (cmd === "setxp") {
          const val = parseInt(args[0]);
          if (isNaN(val)) return message.reply("❌ .setxp 5");

          require("../utils/levelSystem").setMessageXP(val);
          return message.reply(`✅ Message XP: ${val}`);
        }

        if (cmd === "setvcxp") {
          const val = parseInt(args[0]);
          if (isNaN(val)) return message.reply("❌ .setvcxp 5");

          require("../utils/levelSystem").setVoiceXP(val);
          return message.reply(`✅ Voice XP: ${val}`);
        }

        if (cmd === "setlengthbonus") {
          const val = parseFloat(args[0]);
          if (isNaN(val)) return message.reply("❌ .setlengthbonus 0.3");

          require("../utils/levelSystem").setLengthBonus(val);
          return message.reply(`✅ Bonus: ${val}`);
        }

        if (cmd === "multixp") {
          const val = parseFloat(args[0]);
          if (isNaN(val)) return message.reply("❌ .multixp 2");

          require("../utils/levelSystem").setGlobalMultiplier(val);
          return message.reply(`🔥 Multiplier: ${val}x`);
        }

        return;
      }

      // =========================
      // 💰 XP SYSTEM
      // =========================

      const now = Date.now();

      if (cooldown.has(message.author.id)) {
        if (now - cooldown.get(message.author.id) < 2000) return;
      }

      cooldown.set(message.author.id, now);

      if (message.content.length < 3) return;

      const cfg = loadConfig();

      const result = await addXP(
        message.member,
        cfg.messageXP,
        message.content.length
      );

      // =========================
      // 🎯 DAILY
      // =========================
      addMessage(message.author.id);

      if (isDailyReady(message.author.id) && !dailyNotified.has(message.author.id)) {
        dailyNotified.add(message.author.id);

        message.author.send(
          "🎯 **Daily gotowe!**\nUżyj `/daily`, aby odebrać nagrodę 🎁"
        ).catch(() => {});

        message.react("🎯").catch(() => {});
      }

      // =========================
      // 🚀 LEVEL UP (ULEPSZONY 🔥)
      // =========================
      if (result && result.leveledUp) {

        const channel = message.guild.channels.cache.get(LEVEL_CHANNEL);
        if (!channel) return;

        const nextXP = neededXP(result.level);
        const progress = Math.floor((result.xp / nextXP) * 100);

        const embed = new EmbedBuilder()
          .setColor("#b8a672") // 🔥 GOLD STYLE
          .setAuthor({
            name: "✨ LEVEL UP!",
            iconURL: message.guild.iconURL()
          })
          .setTitle(`🏆 ${message.author.username} reached Level ${result.level}!`)
          .setDescription(
`<a:XP:1488763317857161377> **XP:** \`${result.xp} / ${nextXP}\` (${progress}%)
⚡ **Gained:** \`+${result.gained} XP\`

🔥 Keep grinding, you're getting stronger!`
          )
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
          .setImage("https://media.discordapp.net/attachments/1475993709240778904/1486898592491896882/ezgif.com-video-to-gif-converter.gif")
          .setFooter({
            text: `User ID: ${message.author.id}`,
            iconURL: message.author.displayAvatarURL()
          })
          .setTimestamp();

        await channel.send({
          content: `🎉 ${message.author}`,
          embeds: [embed]
        }).catch(err => console.log("❌ LEVEL SEND ERROR:", err));
      }

    } catch (err) {
      console.error("❌ MESSAGE ERROR:", err);
    }
  }
};
