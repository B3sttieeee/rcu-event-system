const { EmbedBuilder } = require("discord.js");
const fs = require("fs");

// ===== CONFIG =====
const PREFIX = ".";
const DB_PATH = "./data.json";
const PROFILE_PATH = "./profile.json";

// ===== LOAD / SAVE =====
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

function loadProfile() {
  try {
    return JSON.parse(fs.readFileSync(PROFILE_PATH));
  } catch {
    return { users: {} };
  }
}

function saveProfile(data) {
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(data, null, 2));
}

// ===== XP SYSTEM =====
function neededXP(level) {
  return 120 + level * 80; // 🔥 cięższe levele
}

// ===== PROGRESS BAR =====
function getProgressBar(current, max) {
  const percent = Math.floor((current / max) * 100);
  const filled = Math.floor(percent / 10);

  const bar = "🟩".repeat(filled) + "⬛".repeat(10 - filled);

  return { bar, percent };
}

// ===== EVENT =====
module.exports = {
  name: "messageCreate",

  async execute(message) {
    if (!message.guild) return;
    if (message.author.bot) return;

    // ===== IGNORUJ KOMENDY XP =====
    if (message.content.startsWith(PREFIX)) {
      const args = message.content.slice(PREFIX.length).trim().split(/ +/);
      const cmd = args.shift().toLowerCase();

      // ===== PROFILE =====
      if (cmd === "profile" || cmd === "p") {

        const db = loadDB();
        const profile = loadProfile();

        // ===== USER DATA =====
        if (!db.xp[message.author.id]) {
          db.xp[message.author.id] = { xp: 0, level: 0 };
        }

        if (!profile.users[message.author.id]) {
          profile.users[message.author.id] = {
            voice: 0,
            daily: { msgs: 0, vc: 0 }
          };
        }

        const data = db.xp[message.author.id];
        const user = profile.users[message.author.id];

        const needed = neededXP(data.level);

        const { bar, percent } = getProgressBar(data.xp, needed);

        const vcMinutes = Math.floor(user.voice / 60);
        const dailyVC = Math.floor(user.daily.vc / 60);

        // ===== EMBED =====
        const embed = new EmbedBuilder()
          .setColor("#0f172a")
          .setAuthor({
            name: `${message.author.username}'s Profile`,
            iconURL: message.author.displayAvatarURL()
          })
          .setThumbnail(message.author.displayAvatarURL())
          .setDescription(
`✨ **Your Progress Overview**

━━━━━━━━━━━━━━━━━━

🏆 **Level ${data.level}**
${bar} **${percent}%**
📊 XP: **${data.xp} / ${needed}**

━━━━━━━━━━━━━━━━━━

🎤 **Voice Activity**
⏱ Total Time: **${vcMinutes} min**

━━━━━━━━━━━━━━━━━━

🎯 **Daily Quests**
💬 Messages: **${user.daily.msgs} / 50**
🎤 VC Time: **${dailyVC} / 30 min**

━━━━━━━━━━━━━━━━━━

🚀 *Stay active to level up faster!*`
          )
          .setFooter({
            text: "VYRN System • Profile",
            iconURL: message.guild.iconURL()
          })
          .setTimestamp();

        return message.reply({ embeds: [embed] });
      }

      return;
    }

    // ===== NORMAL XP =====
    const db = loadDB();
    const profile = loadProfile();

    if (!db.xp[message.author.id]) {
      db.xp[message.author.id] = { xp: 0, level: 0 };
    }

    if (!profile.users[message.author.id]) {
      profile.users[message.author.id] = {
        voice: 0,
        daily: { msgs: 0, vc: 0 }
      };
    }

    const data = db.xp[message.author.id];

    // 🔥 XP ZA WIADOMOŚĆ
    const gained = 8 + Math.floor(Math.random() * 5);
    data.xp += gained;

    profile.users[message.author.id].daily.msgs++;

    // ===== LEVEL UP =====
    let leveled = false;

    while (data.xp >= neededXP(data.level)) {
      data.xp -= neededXP(data.level);
      data.level++;
      leveled = true;
    }

    saveDB(db);
    saveProfile(profile);

    // ===== LEVEL UP MESSAGE =====
    if (leveled) {
      const embed = new EmbedBuilder()
        .setColor("#22c55e")
        .setDescription(
`🎉 **LEVEL UP!**

🚀 ${message.author} reached **Level ${data.level}**

Keep going 🔥`
        );

      message.channel.send({ embeds: [embed] });
    }
  }
};
