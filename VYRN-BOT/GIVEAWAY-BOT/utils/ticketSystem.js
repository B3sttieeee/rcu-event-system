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

// ================= CONFIG =================
const CONFIG = {
  PANEL_CHANNEL_ID: "1475558248487583805",
  LOG_CHANNEL_ID: "1494072832827850953",
  CATEGORY_ID: "1475985874385899530",
  ADMIN_ROLE: "1475998527191519302",

  IMAGE: "https://cdn.discordapp.com/attachments/1475993709240778904/1488949259209281556/ezgif.com-video-to-gif-converter.gif"
};

// ================= TYPE =================
const getTypeLabel = (type) => {
  if (type === "staff") {
    return {
      name: "Staff Support",
      field: "Department"
    };
  }

  return {
    name: type.toUpperCase(),
    field: "Clan"
  };
};

// ================= PANEL =================
async function createTicketPanel(client) {
  const channel = await client.channels.fetch(CONFIG.PANEL_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#2b2d31")
    .setTitle("🎫 Clan Recruitment")
    .setDescription(
      [
        "**Select what you need:**",
        "",
        "```",
        "🔥 VYRN Main Clan",
        "🛡️ V2RN Academy",
        "⚙️ Staff Support",
        "```"
      ].join("\n")
    )
    .setImage(CONFIG.IMAGE)
    .setFooter({ text: "Clan System • Recruitment" })
    .setTimestamp();

  const menu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("clan_ticket_select")
      .setPlaceholder("Select option...")
      .addOptions([
        { label: "VYRN Main Clan", value: "vyrn", emoji: "🔥" },
        { label: "V2RN Academy", value: "v2rn", emoji: "🛡️" },
        { label: "Staff Support", value: "staff", emoji: "⚙️" }
      ])
  );

  await channel.send({ embeds: [embed], components: [menu] });
}

// ================= HANDLER =================
async function handle(interaction, client) {
  try {
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "clan_ticket_select") {
        return openModal(interaction, interaction.values[0]);
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith("ticket_modal_")) {
        const type = interaction.customId.split("_")[2];
        return createTicket(interaction, client, type);
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === "close_ticket") {
        return closeTicket(interaction, client);
      }
    }

  } catch (err) {
    console.error("Ticket error:", err);
  }
}

// ================= MODAL =================
async function openModal(interaction, type) {
  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${type}`)
    .setTitle("Application Form");

  const nick = new TextInputBuilder()
    .setCustomId("nick")
    .setLabel("Nickname")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const lang = new TextInputBuilder()
    .setCustomId("lang")
    .setLabel("Language (Polish/English)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nick),
    new ActionRowBuilder().addComponents(lang)
  );

  return interaction.showModal(modal);
}

// ================= CREATE =================
async function createTicket(interaction, client, type) {
  const nick = interaction.fields.getTextInputValue("nick");
  const lang = interaction.fields.getTextInputValue("lang");

  const existing = interaction.guild.channels.cache.find(
    c => c.topic === interaction.user.id
  );

  if (existing) {
    return interaction.reply({
      content: `❌ You already have a ticket: ${existing}`,
      ephemeral: true
    });
  }

  const typeData = getTypeLabel(type);

  const channel = await interaction.guild.channels.create({
    name: `apply-${type}-${interaction.user.username}`.toLowerCase(),
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
    .setColor("#2b2d31")
    .setTitle("🎫 Ticket Opened")
    .addFields(
      { name: "User", value: interaction.user.tag, inline: true },
      { name: typeData.field, value: typeData.name, inline: true },
      { name: "Nickname", value: nick, inline: true },
      { name: "Language", value: lang, inline: true }
    )
    .setImage(CONFIG.IMAGE)
    .setFooter({ text: "Clan System • Ticket" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Close")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: `<@${interaction.user.id}>`,
    embeds: [embed],
    components: [row]
  });

  await interaction.reply({
    content: `✅ Ticket created: ${channel}`,
    ephemeral: true
  });

  // LOG
  const logChannel = await client.channels.fetch(CONFIG.LOG_CHANNEL_ID).catch(() => null);

  if (logChannel) {
    const logEmbed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setTitle("📩 New Ticket")
      .addFields(
        { name: "User", value: interaction.user.tag },
        { name: typeData.field, value: typeData.name },
        { name: "Nickname", value: nick },
        { name: "Language", value: lang },
        { name: "Channel", value: `${channel}` }
      )
      .setTimestamp();

    logChannel.send({ embeds: [logEmbed] });
  }
}

// ================= TRANSCRIPT =================
async function generateTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });

  return messages
    .reverse()
    .map(m => `[${m.author.tag}]: ${m.content}`)
    .join("\n");
}

// ================= CLOSE =================
async function closeTicket(interaction, client) {
  const channel = interaction.channel;

  const transcript = await generateTranscript(channel);

  const logChannel = await client.channels.fetch(CONFIG.LOG_CHANNEL_ID).catch(() => null);

  if (logChannel) {
    const embed = new EmbedBuilder()
      .setColor("#ef4444")
      .setTitle("📁 Ticket Closed")
      .addFields(
        { name: "Channel", value: channel.name },
        { name: "Closed by", value: interaction.user.tag }
      );

    await logChannel.send({
      embeds: [embed],
      files: [{
        attachment: Buffer.from(transcript, "utf-8"),
        name: `transcript-${channel.name}.txt`
      }]
    });
  }

  await interaction.reply({ content: "Closing ticket...", ephemeral: true });

  setTimeout(() => channel.delete().catch(() => {}), 2000);
}

module.exports = {
  createTicketPanel,
  handle
};
