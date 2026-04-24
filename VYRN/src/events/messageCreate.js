// =====================================================
// MESSAGE XP + ECONOMY EVENT - VYRN FIXED
// =====================================================

const { Events } = require("discord.js");
const { handleMessageXP } = require("../systems/level");
const { addCoins } = require("../systems/economy");

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    try {
      // ====================== SAFETY ======================
      if (!message.guild) return;
      if (message.author.bot) return;
      if (message.system || message.webhookId) return;

      // ====================== MEMBER FIX ======================
      let member = message.member;

      if (!member) {
        member = await message.guild.members
          .fetch(message.author.id)
          .catch(() => null);
      }

      if (!member) return;

      // ====================== XP SYSTEM ======================
      const xpResult = await handleMessageXP(member, message.content || "");

      console.log(
        `[XP DEBUG] ${member.user.tag} | XP result:`,
        xpResult?.xp ?? "NO DATA"
      );

      // ====================== COINS ======================
      addCoins(member.id, 5);

      // ====================== REACTIONS ======================
      const content = (message.content || "").toLowerCase().trim();

      if (content.includes("gg") || content.includes("good game")) {
        message.react("👏").catch(() => {});
      }

      if (
        content.includes("brawo") ||
        content.includes("gratulacje") ||
        content.includes("gratz")
      ) {
        message.react("🎉").catch(() => {});
      }

      if (content.includes("xd") || content.includes("haha") || content.includes("lol")) {
        message.react("😂").catch(() => {});
      }

      // ====================== STATS COMMAND (TEXT TRIGGER) ======================
      if (
        content === "!stats" ||
        content === "moje staty" ||
        content === "staty"
      ) {
        message.reply({
          content: `📊 **${member.user.username}**, use \`/profile\` to check your stats!`,
          allowedMentions: { repliedUser: false }
        }).catch(() => {});
      }

    } catch (err) {
      console.error("[MESSAGE XP ERROR]", err);
    }
  }
};
