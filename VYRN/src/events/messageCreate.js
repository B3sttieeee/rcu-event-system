// =====================================================
// src/events/messagecreate.js
// VYRN CLEAN MESSAGE XP SYSTEM
// =====================================================

const { Events } = require("discord.js");
const { handleMessageXP } = require("../systems/level");
const { addCoins } = require("../systems/economy");

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    try {
      // ====================== BASIC CHECKS ======================
      if (!message.guild) return;
      if (!message.author) return;
      if (message.author.bot) return;
      if (message.webhookId) return;
      if (message.system) return;

      let member = message.member;

      if (!member) {
        member = await message.guild.members.fetch(message.author.id).catch(() => null);
      }

      if (!member) return;

      const content = (message.content || "").trim();
      const lower = content.toLowerCase();

      // ====================== XP SYSTEM ======================
      const user = await handleMessageXP(member);

      console.log(
        `[XP] ${member.user.tag} | +5 XP | TOTAL: ${user.totalXP} | LVL: ${user.level}`
      );

      // ====================== BONUS COINS ======================
      // standard 5 coins daje level system
      // tu tylko dodatki za aktywność

      if (content.length > 40) {
        addCoins(member.id, 2);
      }

      if (content.length > 100) {
        addCoins(member.id, 3);
      }

      if (message.mentions.users.size > 0) {
        addCoins(member.id, 2);
      }

      // ====================== FUN REACTIONS ======================
      if (lower.includes("gg") || lower.includes("good game")) {
        message.react("👏").catch(() => {});
      }

      if (
        lower.includes("brawo") ||
        lower.includes("gratulacje") ||
        lower.includes("gratz")
      ) {
        message.react("🎉").catch(() => {});
      }

      if (
        lower.includes("xd") ||
        lower.includes("haha") ||
        lower.includes("lol")
      ) {
        message.react("😂").catch(() => {});
      }

      // ====================== QUICK STATS ======================
      if (
        lower === "!stats" ||
        lower === "staty" ||
        lower === "moje staty"
      ) {
        return message.reply({
          content: `📊 **${member.user.username}**, use \`/profile\` for full stats!`,
          allowedMentions: {
            repliedUser: false
          }
        });
      }

    } catch (err) {
      console.error("[MESSAGE CREATE ERROR]", err);
    }
  }
};
