const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const CONFIG = {
  PANEL_CHANNEL_ID: "1475558248487583805",
  LOG_CHANNEL_ID: "1494072832827850953",
  CATEGORY_ID: "1475985874385899530",
  ADMIN_ROLE: "1475998527191519302"
};

// ====================== MEMORY ======================
let ticketCounter = 0;

// ====================== PANEL ======================
async function createTicketPanel(client) {
  const channel = await client.channels.fetch(CONFIG.PANEL_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#ff6600")
    .setTitle("📌 VYRN Recruitment System")
    .setDescription("Wybierz klan z listy poniżej");

  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticket_select")
    .setPlaceholder("Wybierz rekrutację")
    .addOptions(
      {
        label: "🔥 VYRN Main Clan",
        value: "vyrn",
        description: "Rekrutacja do głównego klanu"
      },
      {
        label: "🛡️ V2RN Academy",
        value: "v2rn",
        description: "Akademia / trening"
      }
    );

  const row = new ActionRowBuilder().addComponents(menu);

  const msgs = await channel.messages.fetch({ limit: 10 });
  const existing = msgs.find(m => m.embeds?.[0]?.title?.includes("Recruitment"));

  if (existing) {
    await existing.edit({ embeds: [embed], components: [row] });
  } else {
    await channel.send({ embeds: [embed], components: [row] });
  }
}

// ====================== OPEN ======================
async function handleSelect(interaction) {
  const type = interaction.values[0];

  const ticketId = ++ticketCounter;

  await interaction.deferReply({ ephemeral: true });

  const channel = await interaction.guild.channels.create({
    name: `ticket-${ticketId}-${type}-${interaction.user.username}`.toLowerCase(),
    type: ChannelType.GuildText,
    topic: interaction.user.id,
    parent: CONFIG.CATEGORY_ID,
    permissionOverwrites: [
      {
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      },
      {
        id: CONFIG.ADMIN_ROLE,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ManageMessages
        ]
      }
    ]
  });

  const embed = new EmbedBuilder()
    .setColor("Green")
    .setTitle("🎫 Ticket Opened")
    .setDescription(
      `🆔 ID: #${ticketId}\n` +
      `👤 User: ${interaction.user.tag}\n` +
      `🏷️ Klan: ${type}\n\n` +
      `📌 Czekaj na odpowiedź (do 24h)`
    );

  const closeBtn = new ButtonBuilder()
    .setCustomId(`close_ticket_${ticketId}`)
    .setLabel("🔒 Close Ticket")
    .setStyle(ButtonStyle.Danger);

  await channel.send({
    content: `${interaction.user}`,
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(closeBtn)]
  });

  await interaction.editReply({
    content: `✅ Ticket utworzony: ${channel}`
  });
}

// ====================== CLOSE + TRANSCRIPT ======================
async function handleClose(interaction) {
  const channel = interaction.channel;

  await interaction.reply({ content: "🗑 Generuję transcript...", ephemeral: true });

  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = [...messages.values()].reverse();

  let transcript = `TICKET TRANSCRIPT\nChannel: ${channel.name}\n\n`;

  sorted.forEach(m => {
    transcript += `[${m.author.tag}] ${m.content}\n`;
  });

  const userId = channel.topic;

  // ===== DM USER =====
  try {
    const user = await interaction.client.users.fetch(userId);
    await user.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("📜 Twój transcript ticketu")
          .setDescription("Załączam historię rozmowy.")
      ]
    });
  } catch {}

  // ===== LOG CHANNEL =====
  const logChannel = await interaction.client.channels.fetch(CONFIG.LOG_CHANNEL_ID);

  await logChannel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("📩 Ticket Closed")
        .addFields(
          { name: "Channel", value: channel.name },
          { name: "User ID", value: userId || "unknown" }
        )
    ]
  });

  await channel.delete().catch(() => {});
}

// ====================== HANDLER ======================
async function handle(interaction, client) {
  if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
    return handleSelect(interaction);
  }

  if (interaction.isButton() && interaction.customId.startsWith("close_ticket_")) {
    return handleClose(interaction);
  }
}

module.exports = {
  createTicketPanel,
  handle
};
