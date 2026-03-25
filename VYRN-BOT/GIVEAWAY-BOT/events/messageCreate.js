const { EmbedBuilder } = require("discord.js");
const fs = require("fs");

// ===== CONFIG =====
const PREFIX = ".";
const LEVEL_CHANNEL = "1475999590716018719";

const BOOST_ROLE = "1476000398107217980";
const BOOST_MULTIPLIER = 1.75;

// ===== DB =====
const DB_PATH = "./data.json";

function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH));
  } catch {
    return { xp: {} };
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
  if (!member) return 1;
  return member.roles.cache.has(BOOST_ROLE) ? BOOST_MULTIPLIER : 1;
}

// ===== EVENT =====
module.exports = {
  name: "messageCreate",

  async execute(message) {
    if (!message.guild) return;
    if (message.author.bot) return;

    const db = loadDB();

    if (!db.xp[message.author.id]) {
      db.xp[message.author.id] = { xp: 0, level: 0 };
    }

    const member = message.member;

    // ===== XP ADD =====
    const gained = Math.floor(5 * getMultiplier(member));
    db.xp[message.author.id].xp += gained;

    let leveledUp = false;

    while (
      db.xp[message.author.id].xp >=
      neededXP(db.xp[message.author.id].level)
    ) {
      db.xp[message.author.id].xp -= neededXP(db.xp[message.author.id].level);
      db.xp[message.author.id].level++;
      leveledUp = true;
    }

    saveDB(db);

    // ===== LEVEL UP EMBED =====
    if (leveledUp) {
      const channel = message.guild.channels.cache.get(LEVEL_CHANNEL);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor("#facc15")
          .setAuthor({
            name: `${message.author.username} • Level Up`,
            iconURL: message.author.displayAvatarURL()
          })
          .setDescription(
            `🏆 **New Level Achieved!**\n\n` +
            `🎯 You are now **Level ${db.xp[message.author.id].level}**\n\n` +
            `🚀 Keep chatting to earn more XP!`
          )
          .setThumbnail(message.author.displayAvatarURL())
          .setFooter({ text: "VYRN Level System • by B3sttiee" });

        channel.send({
          content: `🎉 ${message.author}`,
          embeds: [embed]
        });
      }
    }

    // ===== PREFIX =====
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    const data = db.xp[message.author.id];

    // ===== RANK =====
    if (cmd === "rank" || cmd === "r") {
      const needed = neededXP(data.level);

      const hasBoost =
        member &&
        member.roles.cache &&
        member.roles.cache.has(BOOST_ROLE);

      const embed = new EmbedBuilder()
        .setColor("#111111")
        .setAuthor({
          name: `${message.author.username} • Profile`,
          iconURL: message.author.displayAvatarURL()
        })
        .setThumbnail(message.author.displayAvatarURL())
        .setDescription(
          `🏆 **Level Information**\n` +
          `▶ Level: **${data.level}**\n` +
          `▶ XP: **${data.xp}/${needed}**\n\n` +

          `⚡ **XP Boost Status**\n` +
          (hasBoost
            ? `▶ Activated Booster Role\n▶ **${BOOST_MULTIPLIER}x More XP**`
            : `▶ No Active Boost\n▶ **1x XP**`)
        )
        .setFooter({ text: "VYRN System • by B3sttiee" });

      return message.reply({ embeds: [embed] });
    }

    // ===== TOP =====
    if (cmd === "top") {
      const sorted = Object.entries(db.xp)
        .sort((a, b) => b[1].level - a[1].level)
        .slice(0, 10);

      const leaderboard = sorted
        .map(
          (u, i) =>
            `**#${i + 1}** <@${u[0]}> • Level ${u[1].level}`
        )
        .join("\n");

      const embed = new EmbedBuilder()
        .setColor("#6366f1")
        .setTitle("🏆 Leaderboard")
        .setDescription(leaderboard || "No data");

      return message.reply({ embeds: [embed] });
    }
  }
};
