// src/events/messageCreate.js
const { Events } = require("discord.js");
const { handleMessageXP } = require("../systems/level");

module.exports = {
  name: Events.MessageCreate,   // Poprawna nazwa eventu
  async execute(message) {
    // Podstawowe filtry
    if (!message.guild) return;
    if (message.author.bot || message.system || message.webhookId) return;

    // Pobieramy member (bezpiecznie)
    let member = message.member;
    if (!member) {
      member = await message.guild.members.fetch(message.author.id).catch(() => null);
    }
    if (!member) return;

    // 1. Dodajemy XP za wiadomość
    await handleMessageXP(member, message.content || "").catch(() => {});

    // 2. Reakcje na popularne słowa
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

    // 3. Prosta wskazówka do komendy /profile
    if (content === "!stats" || content === "moje staty" || content === "staty") {
      message.reply({
        content: `📊 **${member}**, sprawdź swoje staty komendą \`/profile\`!`,
        allowedMentions: { repliedUser: false }
      }).catch(() => {});
    }
  }
};
