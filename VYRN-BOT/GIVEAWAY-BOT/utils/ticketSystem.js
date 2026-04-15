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
  TICKET_CATEGORY_ID: "1475985874385899530",
  VERIFY_ROLE: "1475998527191519302",

  PREFIX_VYRN: "vyrn-",
  PREFIX_V2RN: "v2rn-",

  DELETE_AFTER_CLOSE: 5000
};

// ====================== PANEL ======================
async function createTicketPanel(client) {
  try {
    const channel = await client.channels.fetch(CONFIG.PANEL_CHANNEL_ID);
    if (!channel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor("#ff6600")
      .setTitle("🎫 VYRN Support & Recruitment Center")
      .setDescription(
        `📌 **Wybierz typ aplikacji**\n\n` +

        `🔥 **VYRN MAIN CLAN**\n` +
        `• 3MN+ Rebirthy\n• 15M+ Jajek\n• Dobry team\n\n` +

        `🛡️ **V2RN ACADEMY**\n` +
        `• 150 O+\n• Starter friendly\n\n` +

        `━━━━━━━━━━━━━━━━━━\n` +
        `Kliknij przycisk aby rozpocząć aplikację`
      )
      .setFooter({ text: "VYRN Recruitment System" })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_vyrn")
        .setLabel("🔥 VYRN Clan")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🎫"),

      new ButtonBuilder()
        .setCustomId("ticket_v2rn")
        .setLabel("🛡️ V2RN Academy")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🛡️")
    );

    const messages = await channel.messages.fetch({ limit: 20 });

    const existing = messages.find(m =>
      m.author.id === client.user.id &&
      m.embeds[0]?.title?.includes("Support & Recruitment")
    );

    if (existing) {
      await existing.edit({ embeds: [embed], components: [row] });
    } else {
      await channel.send({ embeds: [embed], components: [row] });
    }

  } catch (err) {
    console.error("Ticket panel error:", err);
  }
}

// ====================== HANDLER ======================
async function handle(interaction) {
  try {
    if (interaction.isButton()) {
      if (interaction.customId === "ticket_vyrn")
        return openTicketModal(interaction, "vyrn");

      if (interaction.customId === "ticket_v2rn")
        return openTicketModal(interaction, "v2rn");

      if (interaction.customId === "close_ticket")
        return closeTicket(interaction);
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith("ticket_modal_"))
        return createTicket(interaction);
    }

  } catch (err) {
    console.error("Ticket system error:", err);
  }
}

// ====================== OPEN MODAL ======================
async function openTicketModal(interaction, type) {
  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${type}`)
    .setTitle(type === "vyrn" ? "🔥 VYRN Application" : "🛡️ V2RN Application");

  const nick = new TextInputBuilder()
    .setCustomId("nick")
    .setLabel("Nickname")
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
  await interaction.deferReply({ ephemeral: true });

  const type = interaction.customId.split("_")[2];
  const prefix = type === "v2rn" ? CONFIG.PREFIX_V2RN : CONFIG.PREFIX_VYRN;

  const nick = interaction.fields.getTextInputValue("nick");
  const lang = interaction.fields.getTextInputValue("lang");

  // 🔥 anti duplicate
  const existing = interaction.guild.channels.cache.find(c =>
    c.topic === interaction.user.id && c.name.startsWith(prefix)
  );

  if (existing) {
    return interaction.editReply("❌ Masz już aktywny ticket.");
  }

  const channel = await interaction.guild.channels.create({
    name: `${prefix}${interaction.user.username}`.toLowerCase(),
    topic: interaction.user.id,
    type: ChannelType.GuildText,
    parent: CONFIG.TICKET_CATEGORY_ID,

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
          PermissionsBitField.Flags.ManageMessages
        ]
      },
      {
        id: CONFIG.VERIFY_ROLE,
        deny: [PermissionsBitField.Flags.ViewChannel]
      }
    ]
  });

  const embed = new EmbedBuilder()
    .setColor("#22c55e")
    .setTitle("🎫 New Ticket Created")
    .setDescription(
      `👤 User: ${interaction.user}\n` +
      `📝 Nick: **${nick}**\n` +
      `🌍 Language: **${lang}**\n\n` +
      `📌 Staff will assist you soon.`
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒")
  );

  await channel.send({
    content: `${interaction.user}`,
    embeds: [embed],
    components: [row]
  });

  await interaction.editReply(`✅ Ticket created: ${channel}`);
}

// ====================== CLOSE ======================
async function closeTicket(interaction) {
  if (
    !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
    !interaction.member.roles.cache.has(CONFIG.ADMIN_ROLE)
  ) {
    return interaction.reply({
      content: "❌ No permission.",
      ephemeral: true
    });
  }

  await interaction.reply({
    content: "🔒 Closing ticket...",
    ephemeral: true
  });

  setTimeout(() => {
    interaction.channel.delete().catch(() => {});
  }, CONFIG.DELETE_AFTER_CLOSE);
}

// ====================== EXPORT ======================
module.exports = {
  handle,
  createTicketPanel
};
