const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

async function createTicketPanel(client) {
  const channel = await client.channels.fetch(CONFIG.PANEL_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#2b2d31")
    .setTitle("🎫 Recruitment Center")
    .setDescription(
      [
        "**Select application type:**",
        "",
        "```",
        "🔥 VYRN — Main Clan",
        "🛡️ V2RN — Academy",
        "🛠️ STAFF — Support Team",
        "```",
        "",
        "• Fill the form carefully",
        "• Response time: up to 24h"
      ].join("\n")
    )
    .setImage(CONFIG.PANEL_IMAGE) // GIF tylko tutaj
    .setFooter({ text: "Clan System • Recruitment" })
    .setTimestamp();

  const menu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("clan_ticket_select")
      .setPlaceholder("Select application type...")
      .addOptions([
        {
          label: "VYRN Main Clan",
          description: "Competitive clan",
          value: "vyrn",
          emoji: "🔥"
        },
        {
          label: "V2RN Academy",
          description: "Training clan",
          value: "v2rn",
          emoji: "🛡️"
        },
        {
          label: "Staff Support",
          description: "Join support team",
          value: "staff",
          emoji: "🛠️"
        }
      ])
  );

  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);

  const existing = messages?.find(m =>
    m.embeds?.[0]?.title?.includes("Recruitment Center")
  );

  if (existing) {
    await existing.edit({ embeds: [embed], components: [menu] });
  } else {
    await channel.send({ embeds: [embed], components: [menu] });
  }
}
