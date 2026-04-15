const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

// ====================== CONFIG ======================
const CONFIG = {
  ADMIN_ROLE: "1475998527191519302",
  PANEL_CHANNEL_ID: "1475558248487583805",
  CATEGORY_ID: "1475985874385899530",

  VERIFY_ROLE: "1475998527191519302",
  PREFIXES: {
    vyrn: "ticket-",
    v2rn: "v2rn-"
  }
};

// ====================== PANEL ======================
async function createTicketPanel(client) {
  const channel = await client.channels.fetch(CONFIG.PANEL_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#2b2d31")
    .setTitle("🎫 Clan Applications")
    .setDescription(
      [
        "**Select a clan to apply:**",
        "",
        "🔥 VYRN Main Clan",
        "🛡️ V2RN Academy",
        "",
        "Click a button to start your application."
      ].join("\n")
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("open_ticket_vyrn")
      .setLabel("VYRN Clan")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("open_ticket_v2rn")
      .setLabel("V2RN Academy")
      .setStyle(ButtonStyle.Success)
  );

  const msgs = await channel.messages.fetch({ limit: 10 }).catch(() => null);

  const existing = msgs?.find(m =>
    m.embeds?.[0]?.title?.includes("Clan Applications")
  );

  if (existing) {
    await existing.edit({ embeds: [embed], components: [row] });
  } else {
    await channel.send({ embeds: [embed], components: [row] });
  }
}

// ====================== HANDLER ======================
async function handle(interaction) {
  try {
    if (interaction.isButton()) {
      if (interaction.customId === "open_ticket_vyrn") {
        return openModal(interaction, "vyrn");
      }

      if (interaction.customId === "open_ticket_v2rn") {
        return openModal(interaction, "v2rn");
      }

      if (interaction.customId === "close_ticket") {
        return closeTicket(interaction);
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith("ticket_modal_")) {
        return createTicket(interaction);
      }
    }
  } catch (err) {
    console.error("Ticket error:", err);
  }
}

// ====================== MODAL ======================
async function openModal(interaction, type) {
  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${type}`)
    .setTitle(type === "vyrn" ? "VYRN Application" : "V2RN Application");

  const nick = new TextInputBuilder()
    .setCustomId("nick")
    .setLabel("In-game nickname")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const lang = new TextInputBuilder()
    .setCustomId("lang")
    .setLabel("Language (pl/en)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nick),
    new ActionRowBuilder().addComponents(lang)
  );

  await interaction.showModal(modal);
}

// ====================== CREATE TICKET ======================
async function createTicket(interaction) {
  const type = interaction.customId.replace("ticket_modal_", "");

  const nick = interaction.fields.getTextInputValue("nick");
  const lang = interaction.fields.getTextInputValue("lang");

  const prefix = CONFIG.PREFIXES[type];

  await interaction.deferReply({ ephemeral: true });

  const channel = await interaction.guild.channels.create({
    name: `${prefix}${interaction.user.username}`.toLowerCase(),
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
    .setColor("#57F287")
    .setTitle(`🎫 ${type.toUpperCase()} Application`)
    .addFields(
      { name: "User", value: `${interaction.user.tag}`, inline: true },
      { name: "Nickname", value: nick, inline: true },
      { name: "Language", value: lang, inline: true }
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: `${interaction.user}`,
    embeds: [embed],
    components: [row]
  });

  await interaction.editReply({
    content: `✅ Ticket created: ${channel}`
  });

  // ================= LOG =================
  const log = await interaction.client.channels.fetch("1494072832827850953").catch(() => null);

  if (log) {
    const logEmbed = new EmbedBuilder()
      .setColor("#f59e0b")
      .setTitle("New Clan Ticket")
      .addFields(
        { name: "User", value: interaction.user.tag },
        { name: "Clan", value: type },
        { name: "Nick", value: nick },
        { name: "Lang", value: lang },
        { name: "Channel", value: channel.name }
      )
      .setTimestamp();

    log.send({ embeds: [logEmbed] });
  }
}

// ====================== CLOSE ======================
async function closeTicket(interaction) {
  const isAdmin =
    interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    interaction.member.roles.cache.has(CONFIG.ADMIN_ROLE);

  if (!isAdmin) {
    return interaction.reply({
      content: "❌ No permission.",
      ephemeral: true
    });
  }

  await interaction.reply({
    content: "Closing ticket...",
    ephemeral: true
  });

  setTimeout(() => {
    interaction.channel.delete().catch(() => {});
  }, 2500);
}

module.exports = {
  handle,
  createTicketPanel
};
