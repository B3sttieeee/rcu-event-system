const { Events } = require("discord.js");
const { handleMessageXP } = require("../systems/level");
const { addCoins } = require("../systems/economy");

const BASE_COINS = 5;

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    try {
      if (!message.guild) return;
      if (!message.author || message.author.bot) return;
      if (message.system || message.webhookId) return;

      let member = message.member;
      if (!member) {
        member = await message.guild.members.fetch(message.author.id).catch(() => null);
      }
      if (!member) return;

      const content = message.content || "";
      const lower = content.toLowerCase();

      const xpResult = await handleMessageXP(member, content);
      const gainedXP = xpResult?.xp || 0;

      console.log(`[XP] ${member.user.tag} | +${gainedXP}`);

      let coins = BASE_COINS;

      const len = content.length;

      if (len > 40) coins += 2;
      if (len > 100) coins += 3;

      coins += Math.floor(Math.random() * 3);

      addCoins(member.id, coins);

      if (lower.includes("gg") || lower.includes("good game")) {
        message.react("👏").catch(() => {});
      }

      if (lower.includes("brawo") || lower.includes("gratulacje") || lower.includes("gratz")) {
        message.react("🎉").catch(() => {});
      }

      if (lower.includes("xd") || lower.includes("haha") || lower.includes("lol")) {
        message.react("😂").catch(() => {});
      }

      if (message.mentions.users.size > 0) {
        addCoins(member.id, 2);
      }

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
