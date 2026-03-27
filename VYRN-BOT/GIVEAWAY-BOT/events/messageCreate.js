const {
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const {
  addXP,
  loadConfig
} = require("../utils/levelSystem");

const fs = require("fs");

// ===== CONFIG =====
const PREFIX = ".";
const LEVEL_CHANNEL = "1475999590716018719";

// 🔥 TEN SAM PLIK CO LEVEL SYSTEM
const DB_PATH = "/data/levels.json";

const cooldown = new Map();

// ===== LOAD DB =====
function loadDB() {
  if (!fs.existsSync(DB_PATH)) return { xp: {} };
  return JSON.parse(fs.readFileSync(DB_PATH));
}

// ===== XP FORMULA =====
function neededXP(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

// ===== EVENT =====
module.exports = {
  name: "messageCreate",

  async execute(message) {
    if (!message.guild) return;
    if (message.author.bot) return;

    const isCommand = message.content.startsWith(PREFIX);

    // =========================
    // 💬 KOMENDY
    // =========================
    if (isCommand) {
      const args = message.content.slice(PREFIX.length).trim().split(/ +/);
      const cmd = args.shift()?.toLowerCase();

      const db = loadDB();
      const data = db.xp[message.author.id] || { xp: 0, level: 0 };

      // ===== RANK =====
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
        const hasBoost = message.member.roles.cache.has("1476000398107217980");

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
                ? `✅ Active (1.75x)`
                : `❌ No Active`
            }\n` +

            `🌍 Global Multiplier: \`${cfg.globalMultiplier}x\``
          )
          .setThumbnail(message.author.displayAvatarURL())
          .setFooter({ text: "VYRN • Level System" });

        return message.reply({ embeds: [embed] });
      }

      // ===== ADMIN =====
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
      if (now < cooldown.get(message.author.id)) return;
    }

    cooldown.set(message.author.id, now + 8000); // 🔥 8s cooldown

    const cfg = loadConfig();

    const result = await addXP(
      message.member,
      cfg.messageXP,
      message.content.length
    );

    // ===== DEBUG (możesz usunąć)
    console.log(`[XP] ${message.author.username} +${result.gained}`);

    // ===== LEVEL UP =====
    if (result.leveledUp) {
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
        });
      }
    }
  }
};
