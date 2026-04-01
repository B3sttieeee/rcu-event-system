const {
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const {
  addXP,
  loadConfig
} = require("../utils/levelSystem");

const { getConfig } = require("../utils/configSystem");
const { addMessage } = require("../utils/profileSystem");

const fs = require("fs");

// ===== DB PATH
const DB_PATH = "/data/levels.json";

const cooldown = new Map();

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

      // ===== CONFIG
      const config = getConfig(message.guild.id);

      const PREFIX = config.prefix || ".";
      const LEVEL_CHANNEL = config.levelChannel;
      const BOOST_ROLE = config.boostRole;

      const isCommand = message.content.startsWith(PREFIX);

      // =========================
      // 💬 KOMENDY (PREFIX)
      // =========================
      if (isCommand) {
        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const cmd = args.shift()?.toLowerCase();

        const db = loadDB();
        const data = db.xp[message.author.id] || { xp: 0, level: 0 };

        // ===== RANK
        if (cmd === "rank" || cmd === "r") {
          const needed = neededXP(data.level);
          const progress = Math.min(
            100,
            Math.floor((data.xp / needed) * 100)
          );

          const barSize = 12;
          const filled = Math.round((progress / 100) * barSize);
          const empty = barSize - filled;

          const bar =
            "🟩".repeat(filled) +
            "⬛".repeat(empty);

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
              `🔥 **LEVEL ${data.level}**\n\n` +
              `${bar} **${progress}%**\n` +
              `\`${data.xp} / ${needed} XP\`\n\n` +
              `⚡ Boost: ${
                hasBoost
                  ? `✅ Active`
                  : `❌ No Active`
              }\n` +
              `🌍 Global Multiplier: \`${cfg.globalMultiplier}x\``
            )
            .setThumbnail(message.author.displayAvatarURL())
            .setFooter({ text: "VYRN • Level System" });

          return message.reply({ embeds: [embed] });
        }

        // ===== ADMIN
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
      // 💰 XP SYSTEM (MESSAGE XP)
      // =========================

      const now = Date.now();

      if (cooldown.has(message.author.id)) {
        if (now < cooldown.get(message.author.id)) return;
      }

      cooldown.set(message.author.id, now + 8000);

      const cfg = loadConfig();

      const result = await addXP(
        message.member,
        cfg.messageXP,
        message.content.length
      );

      console.log(`[XP] ${message.author.username} +${result.gained}`);

      // =========================
      // 🎯 DAILY QUEST SYSTEM (NOWE)
      // =========================

      const completed = await addMessage(message.member);

      if (completed) {
        message.reply("🎯 Daily quest completed! +50 XP").catch(() => {});
      }

      // =========================
      // 🚀 LEVEL UP
      // =========================
      if (result.leveledUp && LEVEL_CHANNEL) {
        const channel = message.guild.channels.cache.get(LEVEL_CHANNEL);

        if (channel) {
          const embed = new EmbedBuilder()
            .setColor("#22c55e")
            .setAuthor({
              name: `${message.author.username}`,
              iconURL: message.author.displayAvatarURL()
            })
            .setDescription(
              `🚀 **LEVEL UP!**\n\n` +
              `🏆 Level: **${result.level}**\n` +
              `➕ Gained: **${result.gained} XP**`
            )
            .setThumbnail(message.author.displayAvatarURL());

          channel.send({
            content: `🎉 ${message.author}`,
            embeds: [embed]
          }).catch(() => {});
        }
      }

    } catch (err) {
      console.error("❌ MESSAGE ERROR:", err);
    }
  }
};
