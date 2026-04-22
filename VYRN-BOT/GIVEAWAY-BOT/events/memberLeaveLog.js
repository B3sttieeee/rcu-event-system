const { Events, AuditLogEvent } = require("discord.js");
const {
  LOGS,
  LOG_COLORS,
  formatTime,
  sendLog,
  findAuditEntry,
  formatExecutor,
  clampText,
  createLogEmbed
} = require("../utils/logSystem");

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    if (!member || !member.guild) return;

    // Szukamy czy to był kick (audit log)
    const kickEntry = await findAuditEntry(member.guild, {
      type: AuditLogEvent.MemberKick,
      match: (entry) => entry.target?.id === member.id
    });

    // Określamy tytuł i kolor w zależności od sytuacji
    let title = "📤 Member Left";
    let color = LOG_COLORS.LEAVE || "#ef4444";   // czerwony

    if (kickEntry) {
      title = "👢 Member Kicked";
      color = "#f97316";   // pomarańczowy (moderacja)
    } else if (member.user.bot) {
      title = "🤖 Bot Removed";
      color = "#64748b";   // szary
    }

    const executor = kickEntry ? formatExecutor(kickEntry) : "Left voluntarily";
    const reason = kickEntry?.reason 
      ? clampText(kickEntry.reason, 1024, "No reason provided") 
      : null;

    // Tworzymy embed za pomocą ujednoliconej funkcji
    const embed = createLogEmbed(
      title,
      color,
      `**Użytkownik opuścił serwer**`,
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
          name: "🛠 By",
          value: executor,
          inline: true
        }
      ],
      `Time: ${formatTime()}`
    );

    // Dodajemy reason tylko jeśli istnieje
    if (reason) {
      embed.addFields({
        name: "📝 Reason",
        value: reason,
        inline: false
      });
    }

    // Wysyłamy log
    const success = await sendLog(member.guild, LOGS.JOIN_LEAVE, embed);

    if (success) {
      console.log(`[MEMBER LEAVE] Zalogowano wyjście/kick ${member.user.tag}`);
    } else {
      console.warn(`[MEMBER LEAVE] Nie udało się wysłać loga dla ${member.user.tag}`);
    }
  }
};
