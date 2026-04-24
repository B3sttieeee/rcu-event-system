// =====================================================
// MESSAGE XP + ECONOMY EVENT - VYRN PRO UPGRADED
// =====================================================

const { Events } = require("discord.js");
const { handleMessageXP } = require("../systems/level");
const { addCoins } = require("../systems/economy");

// ====================== COOLDOWN MAP ======================
const cooldown = new Map();

// ====================== CONFIG ======================
const XP_COOLDOWN = 4000; // 4s anti spam
const BASE_COINS = 5;
const BOOST_MULTIPLIER_FOR_ACTIVITY = 1.2;

// ====================== MAIN ======================
module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    try {
      // ======================
      // SAFETY CHECKS
      // ======================
      if (!message.guild) return;
      if (!message.author || message.author.bot) return;
      if (message.system || message.webhookId) return;

      const userId = message.author.id;
      const now = Date.now();

      // ======================
      // COOLDOWN (ANTI FARM XP)
      // ======================
      const last = cooldown.get(userId) || 0;
      if (now - last < XP_COOLDOWN) return;

      cooldown.set(userId, now);

      // ======================
      // MEMBER FETCH FIX
      // ======================
      let member = message.member;

      if (!member) {
        member = await message.guild.members
          .fetch(userId)
          .catch(() => null);
      }

      if (!member) return;

      const content = (message.content || "").toLowerCase();

      // ======================
      // XP SYSTEM
      // ======================
      const xpResult = await handleMessageXP(member, message.content || "");

      const gainedXP = xpResult?.xp ?? 0;

      console.log(
        `[XP] ${member.user.tag} | +${gainedXP} XP`
      );

      // ======================
      // COINS SYSTEM (SCALED)
      // ======================
      let coins = BASE_COINS;

      // bonus za dłuższe wiadomości
      if (message.content.length > 40) {
        coins += 2;
      }

      if (message.content.length > 100) {
        coins += 3;
      }

      // small randomness
      coins += Math.floor(Math.random() * 3);

      addCoins(userId, coins);

      // ======================
      // REACTIONS SYSTEM
      // ======================
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

      if (
        content.includes("xd") ||
        content.includes("haha") ||
        content.includes("lol")
      ) {
        message.react("😂").catch(() => {});
      }

      // ======================
      // MINI ENGAGEMENT BONUS
      // ======================
      if (message.mentions.users.size > 0) {
        addCoins(userId, 2); // za interakcję
      }

      // ======================
      // TEXT COMMANDS (LEGACY SUPPORT)
      // ======================
      if (
        content === "!stats" ||
        content === "moje staty" ||
        content === "staty"
      ) {
        message.reply({
          content: `📊 **${member.user.username}**, use \`/profile\` for full stats!`,
          allowedMentions: { repliedUser: false }
        }).catch(() => {});
      }

    } catch (err) {
      console.error("[MESSAGE XP ERROR]", err);
    }
  }
};
