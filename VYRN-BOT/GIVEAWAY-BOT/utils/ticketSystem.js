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
  VERIFY_ROLE: "1475998527191519302",        // rola która NIE widzi ticketów
  TICKET_PREFIX: "ticket-",
  V2RN_PREFIX: "v2rn-"                       // prefix dla ticketów akademii
};

// ====================== CREATE TICKET PANEL ======================
async function createTicketPanel(client) {
  try {
    const channel = await client.channels.fetch(CONFIG.PANEL_CHANNEL_ID);
    if (!channel?.isTextBased()) {
      return console.error("❌ Ticket panel channel not found or is not text-based.");
    }

    const embed = new EmbedBuilder()
      .setColor("#ff6600")
      .setTitle("📌 Clan VYRN • Ticket System")
      .setDescription(
        `📩 **Wybierz rodzaj ticketa**\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🔥 **VYRN** — Główny klan\n` +
        `• Good Team\n` +
        `• Good GamePass\n` +
        `• 🔄 500 O Rebirth+\n` +
        `• 🕒 3–8h AFK\n\n` +
        `🛡️ **V2RN** — Akademia / Rekrutacja\n` +
        `• Chcesz dołączyć do akademii V2RN\n` +
        `• Testy / pytania rekrutacyjne`
      )
      .setImage("https://cdn.discordapp.com/attachments/1475993709240778904/1488949259209281556/ezgif.com-video-to-gif-converter.gif")
      .setFooter({ text: "VYRN • Recruitment System" })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_ticket_vyrn")
        .setLabel("🔥 VYRN Main Clan")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🎫"),

      new ButtonBuilder()
        .setCustomId("open_ticket_v2rn")
        .setLabel("🛡️ V2RN Academy")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🛡️")
    );

    // Sprawdź czy panel już istnieje
    const messages = await channel.messages.fetch({ limit: 10 });
    const existingPanel = messages.find(msg =>
      msg.author.id === client.user.id &&
      msg.embeds.length > 0 &&
      msg.embeds[0].title?.includes("Ticket System")
    );

    if (existingPanel) {
      await existingPanel.edit({ embeds: [embed], components: [row] });
      console.log("✅ Ticket panel updated successfully.");
    } else {
      await channel.send({ embeds: [embed], components: [row] });
      console.log("✅ Ticket panel created successfully.");
    }
  } catch (err) {
    console.error("❌ Failed to create/update ticket panel:", err);
  }
}

// ====================== MAIN HANDLER ======================
async function handle(interaction, client) {
  try {
    // VYRN Main Ticket
    if (interaction.isButton() && interaction.customId === "open_ticket_vyrn") {
      return await handleOpenTicket(interaction, "vyrn");
    }

    // V2RN Academy Ticket
    if (interaction.isButton() && interaction.customId === "open_ticket_v2rn") {
      return await handleOpenTicket(interaction, "v2rn");
    }

    // Modal Submit (wspólny dla obu)
    if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket_modal_")) {
      return await handleModalSubmit(interaction);
    }

    // Close Ticket
    if (interaction.isButton() && interaction.customId === "close_ticket") {
      return await handleCloseTicket(interaction);
    }

  } catch (err) {
    console.error("❌ Ticket System Error:", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Wystąpił błąd w systemie ticketów. Zgłoś to administratorowi.",
        ephemeral: true
      }).catch(() => {});
    }
  }
}

// ====================== OPEN TICKET (wspólna funkcja) ======================
async function handleOpenTicket(interaction, type) {
  const isV2RN = type === "v2rn";
  const prefix = isV2RN ? CONFIG.V2RN_PREFIX : CONFIG.TICKET_PREFIX;
  const ticketName = isV2RN ? "v2rn" : "ticket";

  // Sprawdź czy użytkownik już ma otwarty ticket tego typu
  const existingTicket = interaction.guild.channels.cache.find(
    ch => ch.topic === interaction.user.id && ch.name.startsWith(prefix)
  );

  if (existingTicket) {
    return interaction.reply({
      content: `❌ Masz już otwarty ticket: ${existingTicket}`,
      ephemeral: true
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${type}`)
    .setTitle(isV2RN ? "🛡️ V2RN Academy Application" : "🎫 VYRN Main Clan Application");

  const nickInput = new TextInputBuilder()
    .setCustomId("nick")
    .setLabel("Nickname w grze")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(3)
    .setMaxLength(32);

  const langInput = new TextInputBuilder()
    .setCustomId("lang")
    .setLabel("Język (pl / en)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(2);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nickInput),
    new ActionRowBuilder().addComponents(langInput)
  );

  await interaction.showModal(modal);
}

// ====================== MODAL SUBMIT ======================
async function handleModalSubmit(interaction) {
  const nick = interaction.fields.getTextInputValue("nick").trim();
  const langInput = interaction.fields.getTextInputValue("lang").toLowerCase().trim();
  const isPolish = langInput === "pl";

  const isV2RN = interaction.customId === "ticket_modal_v2rn";
  const prefix = isV2RN ? CONFIG.V2RN_PREFIX : CONFIG.TICKET_PREFIX;

  await interaction.deferReply({ ephemeral: true });

  const ticketChannel = await interaction.guild.channels.create({
    name: `${prefix}${interaction.user.username}`.toLowerCase(),
    type: ChannelType.GuildText,
    topic: interaction.user.id,
    parent: CONFIG.TICKET_CATEGORY_ID,
    permissionOverwrites: [
      { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.EmbedLinks
        ]
      },
      {
        id: CONFIG.ADMIN_ROLE,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
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
    .setTitle(isV2RN ? "🛡️ V2RN Academy Ticket" : "🎫 VYRN Main Clan Ticket")
    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
    .setDescription(
      isPolish
        ? `👤 **Użytkownik:** ${interaction.user}\n📝 **Nick:** ${nick}\n\n📸 Proszę wyślij screeny statystyk, gamepassów oraz teamu.`
        : `👤 **User:** ${interaction.user}\n📝 **Nickname:** ${nick}\n\n📸 Please send screenshots of your stats, gamepasses and team.`
    )
    .setFooter({ text: isV2RN ? "VYRN • V2RN Academy" : "VYRN • Recruitment" })
    .setTimestamp();

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("🔒 Close Ticket")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🗑️")
  );

  await ticketChannel.send({
    content: `${interaction.user}`,
    embeds: [embed],
    components: [closeRow]
  });

  await interaction.editReply({
    content: `✅ Twój ticket został utworzony: ${ticketChannel}`
  });
}

// ====================== CLOSE TICKET ======================
async function handleCloseTicket(interaction) {
  const isAdmin = 
    interaction.member.roles.cache.has(CONFIG.ADMIN_ROLE) ||
    interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

  if (!isAdmin) {
    return interaction.reply({
      content: "❌ Tylko administrator może zamknąć ticket.",
      ephemeral: true
    });
  }

  await interaction.reply({
    content: "🗑️ Ticket zostanie zamknięty za 3 sekundy...",
    ephemeral: true
  });

  setTimeout(async () => {
    try {
      await interaction.channel.delete();
    } catch (err) {
      console.error("❌ Nie udało się usunąć ticketa:", err);
    }
  }, 3000);
}

// ====================== EXPORT ======================
module.exports = {
  handle,
  createTicketPanel
};
