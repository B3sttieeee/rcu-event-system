const { Events, EmbedBuilder } = require("discord.js");
const { handleMessageXP } = require("../utils/levelSystem");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (!message.guild) return;
    if (!message.author || message.author.bot) return;
    if (message.system || message.webhookId) return;

    const member = message.member || 
      await message.guild.members.fetch(message.author.id).catch(() => null);

    if (!member) return;

    // 1. Dodajemy XP za wiadomość
    await handleMessageXP(member, message.content || "").catch(() => {});

    // 2. Małe reakcje na popularne słowa (opcjonalnie)
    const content = message.content.toLowerCase();

    if (content.includes("gg") || content.includes("good game")) {
      await message.react("👏").catch(() => {});
    }

    if (content.includes("brawo") || content.includes("gratulacje") || content.includes("gratz")) {
      await message.react("🎉").catch(() => {});
    }

    if (content.includes("xd") || content.includes("haha") || content.includes("lol")) {
      await message.react("😂").catch(() => {});
    }

    // 3. Opcjonalnie: mały embed gdy ktoś napisze "!stats" lub "moje staty" (przykładowo)
    if (content === "!stats" || content === "moje staty" || content === "staty") {
      // Tu możesz później dodać komendę /profile, ale na razie prosty response
      await message.reply({
        content: `📊 **${member}**, sprawdź swoje staty komendą \`/profile\`!`,
        allowedMentions: { repliedUser: false }
      }).catch(() => {});
    }

    // Możesz tu dodać więcej custom reakcji w przyszłości
  }
};
