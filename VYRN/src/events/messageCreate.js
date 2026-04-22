// src/events/messageCreate.js
const { handleMessageXP } = require("../systems/level");

module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (!message.guild || message.author.bot || message.system || message.webhookId) return;

    const member = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
    if (!member) return;

    // XP za wiadomość
    await handleMessageXP(member, message.content || "").catch(() => {});

    // Reakcje na słowa
    const content = message.content.toLowerCase();
    if (content.includes("gg") || content.includes("good game")) message.react("👏").catch(() => {});
    if (content.includes("brawo") || content.includes("gratulacje") || content.includes("gratz")) message.react("🎉").catch(() => {});
    if (content.includes("xd") || content.includes("haha") || content.includes("lol")) message.react("😂").catch(() => {});

    // Prosty !stats
    if (content === "!stats" || content === "moje staty" || content === "staty") {
      message.reply({
        content: `📊 **${member}**, sprawdź swoje staty komendą \`/profile\`!`,
        allowedMentions: { repliedUser: false }
      }).catch(() => {});
    }
  }
};
