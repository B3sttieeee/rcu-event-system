const { Events } = require("discord.js");
const {
  LOGS,
  LOG_COLORS,
  formatTime,
  sendLog,
  createLogEmbed
} = require("../utils/logSystem");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    if (!member || !member.guild) return;

    const isBot = member.user.bot;

    const title = isBot ? "🤖 Bot Joined" : "📥 Member Joined";
    const color = isBot ? "#64748b" : LOG_COLORS.JOIN_LEAVE || "#22c55e";

    // Obliczanie wieku konta
    const createdTimestamp = Math.floor(member.user.createdTimestamp / 1000);

    const embed = createLogEmbed(
      title,
      color,
      `**Nowy użytkownik dołączył do serwera**`,
      [
        {
          name: "👤 User",
          value: `<@${member.id}> (${member.user.tag})`,
          inline: true
        },
        {
          name: "🆔 ID",
          value: `\`${member.id}\``,
          inline: true
        },
        {
          name: "🤖 Bot",
          value: isBot ? "✅ Tak" : "❌ Nie",
          inline: true
        },
        {
          name: "📅 Konto utworzone",
          value: `<t:${createdTimestamp}:F>`,
          inline: false
        },
        {
          name: "⏳ Wiek konta",
          value: `<t:${createdTimestamp}:R>`,
          inline: false
        },
        {
          name: "👥 Liczba członków",
          value: `\`${member.guild.memberCount}\``,
          inline: true
        }
      ],
      `Time: ${formatTime()}`
    );

    // Dodatkowe pole dla botów (opcjonalnie)
    if (isBot) {
      embed.addFields({
        name: "⚠️ Uwaga",
        value: "To jest bot. Sprawdź czy został dodany legalnie.",
        inline: false
      });
    }

    const success = await sendLog(member.guild, LOGS.JOIN_LEAVE, embed);

    if (success) {
      console.log(`[MEMBER JOIN] Zalogowano dołączenie ${member.user.tag} ${isBot ? '(bot)' : ''}`);
    } else {
      console.warn(`[MEMBER JOIN] Nie udało się wysłać loga dla ${member.user.tag}`);
    }
  }
};
