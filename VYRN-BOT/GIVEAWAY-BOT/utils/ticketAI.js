const { EmbedBuilder } = require("discord.js");

// ====================== CONFIG ======================
const LOG_CHANNEL_ID = "1494072832827850953";

// ====================== AI BRAIN ======================
function aiBrain(text, lang = "pl") {
  const msg = text.toLowerCase();

  // greeting
  if (msg.includes("cześć") || msg.includes("hej") || msg.includes("hi")) {
    return lang === "pl"
      ? "👋 Hej! Jestem VYRN AI Support. Pomogę Ci z rekrutacją."
      : "👋 Hi! I'm VYRN AI Support. I can help you with your application.";
  }

  // waiting time
  if (msg.includes("ile") && msg.includes("czek")) {
    return lang === "pl"
      ? "⏳ Czas odpowiedzi wynosi do **24h**. Administracja sprawdza zgłoszenia ręcznie."
      : "⏳ Response time is up to **24h**. Staff reviews applications manually.";
  }

  // requirements
  if (msg.includes("wymag")) {
    return lang === "pl"
      ? "📌 Wymagania są sprawdzane ręcznie przez administrację. Jeśli spełniasz — otrzymasz akceptację."
      : "📌 Requirements are manually checked by staff. If you qualify — you will be accepted.";
  }

  // status
  if (msg.includes("status")) {
    return lang === "pl"
      ? "📊 Twój ticket jest aktywny i oczekuje na odpowiedź administracji."
      : "📊 Your ticket is active and waiting for staff response.";
  }

  return null;
}

// ====================== CHECK IF TICKET ======================
function isTicketChannel(channel) {
  if (!channel || !channel.name) return false;

  return (
    channel.name.startsWith("ticket-") ||
    channel.name.startsWith("v2rn-") ||
    channel.name.includes("ticket")
  );
}

// ====================== MAIN HANDLER ======================
async function handleTicketAI(message, client) {
  try {
    if (message.author.bot) return;
    if (!isTicketChannel(message.channel)) return;

    const lang = message.content.toLowerCase().includes("en") ? "en" : "pl";

    const response = aiBrain(message.content, lang);
    if (!response) return;

    // reply AI
    await message.reply({
      content: response,
      allowedMentions: { repliedUser: false }
    });

    // ====================== LOG ======================
    try {
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setColor("#f59e0b")
        .setTitle("🤖 Ticket AI Log")
        .addFields(
          { name: "User", value: `${message.author.tag}`, inline: true },
          { name: "Channel", value: `${message.channel.name}`, inline: true },
          { name: "Message", value: message.content || "brak", inline: false },
          { name: "AI Response", value: response, inline: false }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });

    } catch (err) {
      console.error("❌ Ticket AI LOG error:", err.message);
    }

  } catch (err) {
    console.error("❌ Ticket AI error:", err.message);
  }
}

module.exports = {
  handleTicketAI
};
