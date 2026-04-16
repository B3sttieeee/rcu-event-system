const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");

// ================= CONFIG =================
const CONFIG = {
  PANEL_CHANNEL_ID: "1475558248487583805",
  LOG_CHANNEL_ID: "1494072832827850953",
  CATEGORY_ID: "1475985874385899530",
  ADMIN_ROLE: "1475998527191519302",

  PANEL_IMAGE:
    "https://cdn.discordapp.com/attachments/1475993709240778904/1488949259209281556/ezgif.com-video-to-gif-converter.gif"
};

// ================= PANEL =================
async function createTicketPanel(client) {
  const channel = await client.channels.fetch(CONFIG.PANEL_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#2b2d31")
    .setTitle("🎫 Recruitment Center")
    .setDescription(
      [
        "**Choose application type:**",
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
    .setImage(CONFIG.PANEL_IMAGE) // ✅ GIF TYLKO TUTAJ
    .setFooter({ text: "Clan System • Recruitment" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_vyrn")
      .setLabel("VYRN")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("ticket_v2rn")
      .setLabel("V2RN")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("ticket_staff")
      .setLabel("STAFF")
      .setStyle(ButtonStyle.Primary)
  );

  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);

  const existing = messages?.find(m =>
    m.embeds?.[0]?.title?.includes("Recruitment Center")
  );

  if (existing) {
    await existing.edit({ embeds: [embed], components: [row] });
  } else {
    await channel.send({ embeds: [embed], components: [row] });
  }
}

// ================= HANDLE =================
async function handle(interaction, client) {

  // ===== BUTTONS =====
  if (interaction.isButton()) {

    if (interaction.customId === "ticket_vyrn")
      return openModal(interaction, "vyrn");

    if (interaction.customId === "ticket_v2rn")
      return openModal(interaction, "v2rn");

    if (interaction.customId === "ticket_staff")
      return openModal(interaction, "staff");

    if (interaction.customId === "close_ticket")
      return closeTicket(interaction);
  }

  // ===== MODAL =====
  if (interaction.isModalSubmit()) {

    if (interaction.customId.startsWith("ticket_modal_")) {
      const type = interaction.customId.split("_")[2];
      return createTicket(interaction, type, client);
    }
  }
}

// ================= MODAL =================
async function openModal(interaction, type) {

  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${type}`)
    .setTitle("Application Form");

  const nick = new TextInputBuilder()
    .setCustomId("nick")
    .setLabel("In-game nickname")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const lang = new TextInputBuilder()
    .setCustomId("lang")
    .setLabel("Language (Polish / English)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nick),
    new ActionRowBuilder().addComponents(lang)
  );

  await interaction.showModal(modal);
}

// ================= CREATE =================
async function createTicket(interaction, type, client) {

  const nick = interaction.fields.getTextInputValue("nick");
  const lang = interaction.fields.getTextInputValue("lang");

  const names = {
    vyrn: "VYRN",
    v2rn: "V2RN",
    staff: "STAFF SUPPORT"
  };

  const existing = interaction.guild.channels.cache.find(
    c => c.topic === interaction.user.id
  );

  if (existing) {
    return interaction.reply({
      content: `❌ You already have a ticket: ${existing}`,
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const channel = await interaction.guild.channels.create({
    name: `ticket-${type}-${interaction.user.username}`.toLowerCase(),
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
          PermissionsBitField.Flags.SendMessages
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

  // 🎫 EMBED (CZYSTY - NO GIF)
  const embed = new EmbedBuilder()
    .setColor("#2b2d31")
    .setTitle("🎫 New Application")
    .setDescription(
      [
        `**Type:** ${names[type]}`,
        `**User:** ${interaction.user}`,
        "",
        `**Nickname:** \`${nick}\``,
        `**Language:** \`${lang}\``,
        "",
        "📌 Please send your full application below."
      ].join("\n")
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

  await sendLog(client, interaction, type, channel, nick, lang);
}

// ================= CLOSE + TRANSCRIPT =================
async function closeTicket(interaction) {

  await interaction.reply({ content: "🔒 Closing ticket...", ephemeral: true });

  const messages = await interaction.channel.messages.fetch({ limit: 100 });

  const transcript = messages
    .map(m => `[${m.author.tag}] ${m.content}`)
    .reverse()
    .join("\n");

  const logChannel = await interaction.client.channels
    .fetch(CONFIG.LOG_CHANNEL_ID)
    .catch(() => null);

  if (logChannel) {
    const embed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setTitle("📁 Ticket Closed")
      .addFields(
        { name: "User", value: interaction.user.tag },
        { name: "Channel", value: interaction.channel.name }
      )
      .setTimestamp();

    await logChannel.send({
      embeds: [embed],
      files: [
        {
          attachment: Buffer.from(transcript, "utf-8"),
          name: "transcript.txt"
        }
      ]
    });
  }

  setTimeout(() => {
    interaction.channel.delete().catch(() => {});
  }, 2000);
}

// ================= LOG =================
async function sendLog(client, interaction, type, channel, nick, lang) {

  const names = {
    vyrn: "VYRN",
    v2rn: "V2RN",
    staff: "STAFF SUPPORT"
  };

  const log = await client.channels
    .fetch(CONFIG.LOG_CHANNEL_ID)
    .catch(() => null);

  if (!log) return;

  const embed = new EmbedBuilder()
    .setColor("#2b2d31")
    .setTitle("📩 New Application Ticket")
    .addFields(
      { name: "User", value: interaction.user.tag, inline: true },
      { name: "Type", value: names[type], inline: true },
      { name: "Channel", value: channel.toString(), inline: true },
      { name: "Nickname", value: nick },
      { name: "Language", value: lang }
    )
    .setTimestamp();

  log.send({ embeds: [embed] });
}

// ================= EXPORT =================
module.exports = {
  createTicketPanel,
  handle
};
