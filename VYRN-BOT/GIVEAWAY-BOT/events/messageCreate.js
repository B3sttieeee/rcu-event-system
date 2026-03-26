const {
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const {
  addXP,
  loadConfig,
  setMessageXP,
  setVoiceXP,
  setLengthBonus,
  setGlobalMultiplier
} = require("../utils/levelSystem");

const fs = require("fs");

// ===== CONFIG =====
const PREFIX = ".";
const LEVEL_CHANNEL = "1475999590716018719";

const DB_PATH = "/data/levels.json";

const cooldown = new Map();

// ===== LOAD DB =====
function loadDB() {
  if (!fs.existsSync(DB_PATH)) return { xp: {} };
  return JSON.parse(fs.readFileSync(DB_PATH));
}

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
    // 💬 KOMENDY (NAJPIERW)
    // =========================
    if (isCommand) {
      const args = message.content.slice(PREFIX.length).trim().split(/ +/);
      const cmd = args.shift().toLowerCase();

      const db = loadDB();
      const data = db.xp[message.author.id] || { xp: 0, level: 0 };

      // ===== RANK =====
      if (cmd === "rank" || cmd === "r") {
        const needed = neededXP(data.level);
        const progress = Math.floor((data.xp / needed) * 100);

        const barSize = 10;
        const filled = Math.round((progress / 100) * barSize);
        const empty = barSize - filled;

        const bar = "🟩".repeat(filled) + "⬛".repeat(empty);

        const cfg = loadConfig();
        const hasBoost = message.member.roles.cache.has("1476000398107217980");

        const embed = new EmbedBuilder()
          .setColor("#0f172a")
          .setAuthor({
            name: `${message.author.username} • Level ${data.level}`,
            iconURL: message.author.displayAvatarURL()
          })
          .setThumbnail(message.author.displayAvatarURL())
          .setDescription(
            `🏆 **LEVEL SYSTEM**\n\n` +
            `📊 ${bar} **${progress}%**\n` +
            `\`${data.xp} / ${needed} XP\`\n\n` +
            `⚡ Boost: ${
              hasBoost
                ? `✅ Active (1.75x)`
                : `❌ No Active`
            }\n` +
            `🌍 Global: ${cfg.globalMultiplier}x`
          )
          .setFooter({
            text: "VYRN System • Grind Mode 🔥"
          });

        return message.reply({ embeds: [embed] });
      }

      // ===== ADMIN ONLY =====
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

      if (cmd === "setxp") {
        const val = parseInt(args[0]);
        if (isNaN(val)) return message.reply("❌ Usage: .setxp 5");

        setMessageXP(val);
        return message.reply(`✅ Message XP set to ${val}`);
      }

      if (cmd === "setvcxp") {
        const val = parseInt(args[0]);
        if (isNaN(val)) return message.reply("❌ Usage: .setvcxp 5");

        setVoiceXP(val);
        return message.reply(`✅ Voice XP set to ${val}`);
      }

      if (cmd === "setlengthbonus") {
        const val = parseFloat(args[0]);
        if (isNaN(val)) return message.reply("❌ Usage: .setlengthbonus 0.3");

        setLengthBonus(val);
        return message.reply(`✅ Length bonus set to ${val}`);
      }

      if (cmd === "multixp") {
        const val = parseFloat(args[0]);
        if (isNaN(val)) return message.reply("❌ Usage: .multixp 2");

        setGlobalMultiplier(val);
        return message.reply(`🔥 Global multiplier set to ${val}x`);
      }

      return;
    }

    // =========================
    // 💰 XP SYSTEM (TYLKO NORMALNE WIADOMOŚCI)
    // =========================

    const now = Date.now();

    if (cooldown.has(message.author.id)) {
      if (now < cooldown.get(message.author.id)) return;
    }

    cooldown.set(message.author.id, now + 10000); // 10s

    const cfg = loadConfig();

    const result = await addXP(
      message.member,
      cfg.messageXP,
      message.content.length
    );

    // ===== LEVEL UP =====
    if (result.leveledUp) {
      const channel = message.guild.channels.cache.get(LEVEL_CHANNEL);

      if (channel) {
        const embed = new EmbedBuilder()
          .setColor("#facc15")
          .setAuthor({
            name: `${message.author.username} • Level Up`,
            iconURL: message.author.displayAvatarURL()
          })
          .setDescription(
            `🏆 **LEVEL UP!**\n` +
            `🎯 Level **${result.level}**\n\n` +
            `➕ +${result.gained} XP`
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
