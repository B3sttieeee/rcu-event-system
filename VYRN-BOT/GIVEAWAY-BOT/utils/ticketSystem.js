const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

// ====================== CONFIG ======================
const CONFIG = {
  PANEL_CHANNEL_ID: "1475558248487583805",
  LOG_CHANNEL_ID: "1494072832827850953",
  CATEGORY_ID: "1475985874385899530",
  ADMIN_ROLE: "1475998527191519302",

  IMAGE:
    "https://cdn.discordapp.com/attachments/1475993709240778904/1488949259209281556/ezgif.com-video-to-gif-converter.gif"
};

// ====================== PANEL (PRO UI) ======================
async function createTicketPanel(client) {
  const channel = await client.channels.fetch(CONFIG.PANEL_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🎫 Support Center")
    .setDescription(
      [
        "**Welcome to the official support system.**",
        "",
        "Please select a category below to create a ticket.",
        "",
        "```",
        "• Response time: up to 24 hours",
        "• Please provide clear information",
        "• Do not spam tickets",
        "```"
      ].join("\n")
    )
    .setImage(CONFIG.IMAGE)
    .setFooter({ text: "Support System • Professional Help Desk" });

  const menu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("ticket_select")
      .setPlaceholder("Select ticket category...")
      .addOptions([
        {
          label: "General Support",
          description: "Questions, help, general issues",
          value: "general",
          emoji: "💬"
        },
        {
          label: "Recruitment",
          description: "Apply for clan / staff / academy",
          value: "recruitment",
          emoji: "📝"
        },
        {
          label: "Report User",
          description: "Report rule breaking user",
          value: "report",
          emoji: "🚨"
        },
        {
          label: "Billing / Payment",
          description: "Payments, donations, shop",
          value: "billing",
          emoji: "💰"
        }
      ])
  );

  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);

  const existing = messages?.find(m =>
    m.embeds?.[0]?.title?.includes("Support Center")
  );

  if (existing) {
    await existing.edit({ embeds: [embed], components: [menu] });
  } else {
    await channel.send({ embeds: [embed], components: [menu] });
  }
}

// ====================== TICKET CREATE ======================
async function createTicket(interaction, type) {
  const user = interaction.user;

  const existing = interaction.guild.channels.cache.find(
    c => c.topic === user.id
  );

  if (existing) {
    return interaction.reply({
      content: `❌ You already have an active ticket: ${existing}`,
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const channel = await interaction.guild.channels.create({
    name: `ticket-${user.username}`.toLowerCase(),
    type: ChannelType.GuildText,
    topic: user.id,
    parent: CONFIG.CATEGORY_ID,
    permissionOverwrites: [
      {
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: user.id,
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
    .setColor("#57F287")
    .setTitle("🎫 Ticket Created")
    .setDescription(
      [
        `**Category:** \`${type.toUpperCase()}\``,
        `**User:** ${user}`,
        "",
        "A staff member will respond soon.",
        "Please describe your issue clearly."
      ].join("\n")
    )
    .setTimestamp();

  await channel.send({
    content: `${user}`,
    embeds: [embed]
  });

  await interaction.editReply({
    content: `✅ Ticket created: ${channel}`
  });
}

// ====================== HANDLER ======================
async function handle(interaction) {
  try {
    // SELECT MENU
    if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
      const value = interaction.values[0];
      return createTicket(interaction, value);
    }
  } catch (err) {
    console.error("Ticket error:", err);
  }
}

module.exports = {
  createTicketPanel,
  handle
};
