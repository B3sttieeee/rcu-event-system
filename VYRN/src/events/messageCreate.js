const { Events } = require("discord.js");
const { handleMessageXP } = require("../systems/level");
const { addCoins } = require("../systems/economy");

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    try {
      if (!message.guild) return;
      if (message.author.bot) return;

      let member = message.member;

      if (!member) {
        member = await message.guild.members.fetch(message.author.id).catch(() => null);
      }

      if (!member) return;

      await handleMessageXP(member, message.content || "");

      addCoins(member.id, 5);

    } catch (err) {
      console.error("[MESSAGE XP ERROR]", err);
    }
  }
};
