const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionsBitField,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

// ====================== CONFIG ======================
const CONFIG = {
  PANEL_CHANNEL_ID: "1475558248487583805",
  LOG_CHANNEL_ID: "1494072832827850953",
  CATEGORY_ID: "1475985874385899530",
  ADMIN_ROLE: "1475998527191519302",
  PREFIX: "ticket-"
};

// ====================== PANEL (ENGLISH + SELECT) ======================
async function createTicketPanel(client) {
  const channel = await client.channels.fetch(CONFIG.PANEL_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#ff6600")
    .setTitle("🎫 Recruitment Center")
    .setDescription(
      `Welcome to the **VYRN Recruitment System**\n\n` +
      `Please select the application type below.\n\n` +
      `⚡ Response time: up to 24h\n` +
      `📌 All applications are reviewed manually`
    )
    .setTimestamp();

  const select = new StringSelectMenuBuilder()
    .setCustomId("ticket_select")
    .setPlaceholder("Select application type...")
    .addOptions(
      {
        label: "VYRN Main Clan",
        description: "High requirements recruitment",
        value: "vyrn",
        emoji: "🔥"
      },
      {
        label: "V2RN Academy",
        description: "Beginner / training clan",
        value: "v2rn",
        emoji: "🛡️"
      }
    );

  const row = new ActionRowBuilder().addComponents(select);

  const msg = await channel.messages.fetch({ limit: 10 }).catch(() => null);
  const existing = msg?.find(m => m.embeds?.[0]?.title?.includes("Recruitment"));

  if (existing) {
    await existing.edit({ embeds: [embed], components: [row] });
  } else {
    await channel.send({ embeds: [embed], components: [row] });
  }
}

// ====================== OPEN MODAL ======================
async function openModal(interaction, type) {
  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${type}`)
    .setTitle("Application Form");

  const nick = new TextInputBuilder()
    .setCustomId("nick")
    .setLabel("Your in-game nickname")
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
async function createTicket(interaction, type) {
  const nick = interaction.fields.getTextInputValue("nick");
  const lang = interaction.fields.getTextInputValue("lang");

  const prefix = type === "v2rn" ? "v2rn-" : "ticket-";

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
    .setColor("#22c55e")
    .setTitle("🎫 Ticket Opened")
    .setDescription(
      `👤 User: ${interaction.user}\n` +
      `📝 Nick: ${nick}\n` +
      `🌍 Language: ${lang}\n\n` +
      `📌 Type: ${type.toUpperCase()}\n` +
      `⏳ Response time: up to 24h`
    )
    .setTimestamp();

  const closeBtn = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒")
  );

  await channel.send({
    content: `${interaction.user}`,
    embeds: [embed],
    components: [closeBtn]
  });

  await interaction.editReply({
    content: `✅ Ticket created: ${channel}`
  });

  // LOGS
  const log = await interaction.client.channels.fetch(CONFIG.LOG_CHANNEL_ID).catch(() => null);
  if (log) {
    log.send({
      embeds: [
        new EmbedBuilder()
          .setColor("Orange")
          .setTitle("📩 Ticket Created")
          .addFields(
            { name: "User", value: interaction.user.tag },
            { name: "Type", value: type },
            { name: "Nick", value: nick },
            { name: "Lang", value: lang }
          )
      ]
    });
  }
}

// ====================== CLOSE + TRANSCRIPT (SIMPLE) ======================
async function closeTicket(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: "❌ No permission", ephemeral: true });
  }

  const messages = await interaction.channel.messages.fetch({ limit: 50 });

  const transcript = messages
    .reverse()
    .map(m => `${m.author.tag}: ${m.content}`)
    .join("\n");

  const userId = interaction.channel.topic;

  const user = await interaction.client.users.fetch(userId).catch(() => null);

  if (user) {
    user.send({
      content: "📄 Your ticket transcript:",
      files: [{
        attachment: Buffer.from(transcript, "utf-8"),
        name: "transcript.txt"
      }]
    }).catch(() => {});
  }

  await interaction.reply({ content: "🗑 Closing ticket...", ephemeral: true });

  setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
}

// ====================== MAIN INTERACTION ======================
async function handle(interaction) {
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "ticket_select") {
      return openModal(interaction, interaction.values[0]);
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === "ticket_modal_vyrn")
      return createTicket(interaction, "vyrn");

    if (interaction.customId === "ticket_modal_v2rn")
      return createTicket(interaction, "v2rn");
  }

  if (interaction.isButton()) {
    if (interaction.customId === "close_ticket")
      return closeTicket(interaction);
  }
}

module.exports = {
  createTicketPanel,
  handle
};
