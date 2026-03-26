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

    // ===== COMMANDS =====
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    const db = loadDB();
    const data = db.xp[message.author.id];
    if (!data) return;

    // ===== RANK =====
    if (cmd === "rank") {
      const needed = neededXP(data.level);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#111111")
            .setTitle("🏆 Your Profile")
            .setDescription(
              `Level: **${data.level}**\nXP: **${data.xp}/${needed}**`
            )
        ]
      });
    }

    // ===== ADMIN =====
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

    if (cmd === "setxp") {
      setMessageXP(parseInt(args[0]));
      return message.reply("✅ Message XP updated");
    }

    if (cmd === "setvcxp") {
      setVoiceXP(parseInt(args[0]));
      return message.reply("✅ Voice XP updated");
    }

    if (cmd === "setlengthbonus") {
      setLengthBonus(parseFloat(args[0]));
      return message.reply("✅ Length bonus updated");
    }

    if (cmd === "multixp") {
      setGlobalMultiplier(parseFloat(args[0]));
      return message.reply("🔥 Global multiplier updated");
    }
  }
};
