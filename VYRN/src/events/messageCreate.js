const { Events } = require("discord.js");
const { handleMessageXP } = require("../systems/level");
const { addCoins } = require("../systems/economy");

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    if (!message.guild) return;
    if (message.author.bot || message.system || message.webhookId) return;

    let member = message.member;
    if (!member) {
      member = await message.guild.members.fetch(message.author.id).catch(() => null);
    }
    if (!member) return;

    await handleMessageXP(member, message.content || "").catch(() => {});

    addCoins(member.id, 5); // ← TU MONETY

    const content = message.content.toLowerCase().trim();

    if (content.includes("gg") || content.includes("good game")) {
      message.react("👏").catch(() => {});
    }

    if (content.includes("brawo") || content.includes("gratulacje") || content.includes("gratz")) {
      message.react("🎉").catch(() => {});
    }

    if (content.includes("xd") || content.includes("haha") || content.includes("lol")) {
      message.react("😂").catch(() => {});
    }

    if (content === "!stats" || content === "moje staty" || content === "staty") {
      message.reply({
        content: `📊 **${member}**, sprawdź swoje staty komendą \`/profile\`!`,
        allowedMentions: { repliedUser: false }
      }).catch(() => {});
    }
  }
};
