// =====================================================
// MESSAGE CREATE - CLEAN & INTEGRATED WITH ACTIVITY
// =====================================================
const { Events } = require("discord.js");
const activity = require("../systems/activity");
const { addCoins } = require("../systems/economy");

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    try {
      // ====================== BASIC CHECKS ======================
      if (!message.guild) return;
      if (!message.author || message.author.bot) return;
      if (message.webhookId || message.system) return;

      let member = message.member;
      if (!member) {
        member = await message.guild.members.fetch(message.author.id).catch(() => null);
      }
      if (!member) return;

      const content = (message.content || "").trim();
      const lower = content.toLowerCase();

      // ====================== ACTIVITY REWARDS ======================
      const xpAdded = 5;           // bazowe XP za wiadomość
      const coinsAdded = 5;        // bazowe monety za wiadomość

      activity.addActivityXP(member, xpAdded, coinsAdded);

      // Bonus za długie wiadomości
      if (content.length > 40) addCoins(member.id, 2);
      if (content.length > 100) addCoins(member.id, 3);

      // Bonus za mention
      if (message.mentions.users.size > 0) addCoins(member.id, 2);

      console.log(`[MESSAGE] ${member.user.tag} | +${xpAdded} XP | +${coinsAdded} coins | length: ${content.length}`);

      // ====================== REACTIONS ======================
      if (lower.includes("gg") || lower.includes("good game")) {
        message.react("👏").catch(() => {});
      }
      if (lower.includes("brawo") || lower.includes("gratulacje") || lower.includes("gratz")) {
        message.react("🎉").catch(() => {});
      }
      if (lower.includes("xd") || lower.includes("haha") || lower.includes("lol")) {
        message.react("😂").catch(() => {});
      }

      // ====================== QUICK STATS ======================
      if (lower === "!stats" || lower === "staty" || lower === "moje staty") {
        return message.reply({
          content: `📊 **${member.user.username}**, użyj komendy \`/profile\` aby zobaczyć pełne statystyki!`,
          allowedMentions: { repliedUser: false }
        });
      }
    } catch (err) {
      console.error("[MESSAGE CREATE ERROR]", err);
    }
  }
};
