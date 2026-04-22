const { Events } = require("discord.js");
const {
  LOGS,
  LOG_COLORS,
  formatTime,
  sendLog,
  clampText,
  createLogEmbed
} = require("../utils/logSystem");

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMsg, newMsg) {
    if (!oldMsg.guild || !newMsg.guild) return;

    // Pomijamy boty i wiadomości systemowe
    if (oldMsg.author?.bot || newMsg.author?.bot) return;

    // Obsługa partial messages
    if (oldMsg.partial) {
      try { await oldMsg.fetch(); } catch { return; }
    }
    if (newMsg.partial) {
      try { await newMsg.fetch(); } catch { return; }
    }

    const before = clampText(oldMsg.content || "", 800, "[No content]");
    const after = clampText(newMsg.content || "", 800, "[No content]");

    // Jeśli treść się nie zmieniła (np. tylko embed lub attachment) – pomijamy
    if (before === after) return;

    // Tworzymy embed za pomocą ujednoliconej funkcji
    const embed = createLogEmbed(
      "✏️ Message Edited",
      LOG_COLORS.CHAT || "#f59e0b",   // żółty/pomarańczowy – pasuje do edycji
      `**Wiadomość została edytowana**`,
      [
        {
          name: "👤 User",
          value: `<@${oldMsg.author.id}> (${oldMsg.author.tag})`,
          inline: true
        },
        {
          name: "🆔 Message ID",
          value: `\`${oldMsg.id}\``,
          inline: true
        },
        {
          name: "📍 Channel",
          value: `<#${oldMsg.channel.id}>`,
          inline: true
        },
        {
          name: "📜 Before",
          value: before,
          inline: false
        },
        {
          name: "📝 After",
          value: after,
          inline: false
        }
      ],
      `Time: ${formatTime()}`
    );

    // Dodajemy link do wiadomości (Jump to Message)
    if (newMsg.url) {
      embed.addFields({
        name: "🔗 Jump to Message",
        value: `[Click here](${newMsg.url})`,
        inline: false
      });
    }

    // Wysyłamy log
    const success = await sendLog(oldMsg.guild, LOGS.CHAT, embed);

    if (success) {
      console.log(`[MESSAGE EDIT] Zalogowano edycję wiadomości od ${oldMsg.author.tag}`);
    } else {
      console.warn(`[MESSAGE EDIT] Nie udało się wysłać loga edycji dla ${oldMsg.author.tag}`);
    }
  }
};
