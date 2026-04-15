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

// ====================== PANEL ======================
async function createTicketPanel(client) {
  const channel = await client.channels.fetch(CONFIG.PANEL_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#2b2d31")
    .setTitle("🎫 Clan Recruitment")
    .setDescription(
      [
        "**Select the clan you want to apply for:**",
        "",
        "```",
        "• VYRN Main Clan",
        "• V2RN Academy",
        "• Staff Recruitment",
        "```",
        "",
        "⚠️ Make sure your application is clear and complete."
      ].join("\n")
    )
    .setImage(CONFIG.IMAGE)
    .setFooter({ text: "Clan System • Recruitment Panel" });

  const menu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("clan_ticket_select")
      .setPlaceholder("Select a clan...")
      .addOptions([
        {
          label: "VYRN Main Clan",
          description: "High rank clan recruitment",
          value: "vyrn",
          emoji: "🔥"
        },
        {
          label: "V2RN Academy",
          description: "Training & academy recruitment",
          value: "v2rn",
          emoji: "🛡️"
        },
        {
          label: "Staff Team",
          description: "Moderator / admin applications",
          value: "staff",
          emoji: "⚙️"
        }
      ])
  );

  const msgs = await channel.messages.fetch({ limit: 10 }).catch(() => null);

  const existing = msgs?.find(m =>
    m.embeds?.[0]?.title?.includes("Clan Recruitment")
  );

  if (existing) {
    await existing.edit({ embeds: [embed], components: [menu] });
  } else {
    await channel.send({ embeds: [embed], components: [menu] });
  }
}

// ====================== CREATE TICKET ======================
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
    name: `apply-${type}-${user.username}`.toLowerCase(),
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
    .setTitle("🎫 Application Ticket Created")
    .setDescription(
      [
        `**Clan:** \`${type.toUpperCase()}\``,
        `**User:** ${user}`,
        "",
        "Please provide your application:",
        "- In-game nickname",
        "- Experience",
        "- Why do you want to join"
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

  // ================= LOG =================
  const log = await interaction.client.channels.fetch(CONFIG.LOG_CHANNEL_ID).catch(() => null);

  if (log) {
    const logEmbed = new EmbedBuilder()
      .setColor("#f59e0b")
      .setTitle("📩 New Clan Ticket")
      .addFields(
        { name: "User", value: `${user.tag}` },
        { name: "Clan", value: type },
        { name: "Channel", value: `${channel.name}` }
      )
      .setTimestamp();

    log.send({ embeds: [logEmbed] });
  }
}

// ====================== HANDLER ======================
async function handle(interaction) {
  try {
    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId === "clan_ticket_select") {
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
