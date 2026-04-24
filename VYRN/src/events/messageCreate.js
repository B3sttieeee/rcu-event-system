// =====================================================
// MESSAGE XP + ECONOMY EVENT - VYRN PRO UPGRADED (FIXED)
// =====================================================

const { Events } = require("discord.js");
const { handleMessageXP } = require("../systems/level");
const { addCoins } = require("../systems/economy");

const cooldown = new Map();

const XP_COOLDOWN = 4000;
const BASE_COINS = 5;

// ====================== MAIN ======================
module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    try {
      if (!message.guild) return;
      if (!message.author || message.author.bot) return;
      if (message.system || message.webhookId) return;

      const userId = message.author.id;
      const now = Date.now();

      // ====================== COOLDOWN ======================
      const last = cooldown.get(userId) || 0;
      if (now - last < XP_COOLDOWN) return;

      cooldown.set(userId, now);

      // ====================== MEMBER SAFE FETCH ======================
      let member = message.member;

      if (!member) {
        member = await message.guild.members.fetch(userId).catch(() => null);
      }

      if (!member) return;

      const content = message.content || "";

      // ====================== XP ======================
      const xpResult = await handleMessageXP(member, content);

      const gainedXP = xpResult?.xp || 0;

      console.log(`[XP] ${member.user.tag} | +${gainedXP} XP`);

      // ====================== COINS ======================
      let coins = BASE_COINS;

      const len = content.length;

      if (len > 40) coins += 2;
      if (len > 100) coins += 3;

      coins += Math.floor(Math.random() * 3);

      addCoins(userId, coins);

      // ====================== REACTIONS ======================
      const lower = content.toLowerCase();

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

      // ====================== MENTIONS BONUS ======================
      if (message.mentions.users.size > 0) {
        addCoins(userId, 2);
      }

      // ====================== LEGACY COMMANDS ======================
      if (["!stats", "staty", "moje staty"].includes(lower)) {
        return message.reply({
          content: `📊 **${member.user.username}**, use \`/profile\` for full stats!`,
          allowedMentions: { repliedUser: false }
        });
      }

    } catch (err) {
      console.error("[MESSAGE XP ERROR]", err);
    }
  }
};
