const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

// ================= CONFIG =================
const CONFIG = {
  PANEL_CHANNEL_ID: "1475558248487583805",
  LOG_CHANNEL_ID: "1494072832827850953",
  CATEGORY_ID: "1475985874385899530",
  ADMIN_ROLE: "1475998527191519302",
  PANEL_IMAGE: "https://media.discordapp.net/attachments/1475992778554216448/1496214765406650489/ezgif.com-animated-gif-maker.gif"
};

// ================= CREATE PANEL =================
async function createTicketPanel(client) {
  const channel = await client.channels.fetch(CONFIG.PANEL_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🎫 Recruitment Center")
    .setDescription(
      `**Welcome to VYRN Clan Recruitment**\n\n` +

      `Select the type of application you want to submit below.\n\n` +

      `**Available Applications:**\n\n` +
      `• **VYRN Main Clan** — Competitive / High-tier players\n` +
      `• **Staff Support** — Join the moderation team\n\n` +

      `━━━━━━━━━━━━━━━━━━\n\n` +

      `📌 **Instructions**\n` +
      `• Choose an option\n` +
      `• Fill out the form honestly\n` +
      `• Wait for a response (up to 24h)`
    )
    .setImage(CONFIG.PANEL_IMAGE)
    .setFooter({ text: "VYRN CLAN • Recruitment Panel" })
    .setTimestamp();

  const menu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("clan_ticket_select")
      .setPlaceholder("🎫 Select application type...")
      .addOptions([
        {
          label: "VYRN Main Clan",
          description: "Competitive / High-tier players",
          value: "vyrn",
          emoji: "🔥"
        },
        {
          label: "Staff Support",
          description: "Join the moderation team",
          value: "staff",
          emoji: "🛠️"
        }
      ])
  );

  // Usuń stare panele i wyślij nowy
  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
  const existing = messages?.find(m => m.embeds?.[0]?.title?.includes("Recruitment Center"));

  if (existing) {
    await existing.edit({ embeds: [embed], components: [menu] });
  } else {
    await channel.send({ embeds: [embed], components: [menu] });
  }
}

// ================= HANDLE INTERACTIONS =================
async function handle(interaction, client) {
  // Select Menu
  if (interaction.isStringSelectMenu() && interaction.customId === "clan_ticket_select") {
    const type = interaction.values[0];
    return openModal(interaction, type);
  }

  // Close Button
  if (interaction.isButton() && interaction.customId === "close_ticket") {
    return closeTicket(interaction);
  }

  // Modal Submit
  if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket_modal_")) {
    const type = interaction.customId.split("_")[2];
    return createTicket(interaction, type, client);
  }
}

// ================= OPEN MODAL =================
async function openModal(interaction, type) {
  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${type}`)
    .setTitle(type === "vyrn" ? "VYRN Main Clan Application" : "Staff Support Application");

  const nick = new TextInputBuilder()
    .setCustomId("nick")
    .setLabel("In-game nickname (Roblox)")
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

// ================= CREATE TICKET =================
async function createTicket(interaction, type, client) {
  const nick = interaction.fields.getTextInputValue("nick");
  const lang = interaction.fields.getTextInputValue("lang");

  const names = {
    vyrn: "VYRN Main Clan",
    staff: "Staff Support"
  };

  // Sprawdź czy użytkownik już ma ticket
  const existing = interaction.guild.channels.cache.find(c => c.topic === interaction.user.id);
  if (existing) {
    return interaction.reply({
      content: `❌ You already have an open ticket: ${existing}`,
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
      { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { 
        id: interaction.user.id, 
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] 
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
    .setColor("#0a0a0a")
    .setTitle("🎫 New Application")
    .setDescription(
      `**Type:** ${names[type]}\n` +
      `**User:** ${interaction.user}\n\n` +
      `**Nickname:** \`${nick}\`\n` +
      `**Language:** \`${lang}\`\n\n` +
      `📌 Please send your full application below.`
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

  await interaction.editReply({ content: `✅ Your ticket has been created: ${channel}` });

  await sendLog(client, interaction, type, channel, nick, lang);
}

// ================= CLOSE TICKET =================
async function closeTicket(interaction) {
  await interaction.reply({ content: "🔒 Closing ticket...", ephemeral: true });

  const messages = await interaction.channel.messages.fetch({ limit: 100 });
  const transcript = messages
    .map(m => `[${m.author.tag}] ${m.content}`)
    .reverse()
    .join("\n");

  const logChannel = await interaction.client.channels.fetch(CONFIG.LOG_CHANNEL_ID).catch(() => null);

  if (logChannel) {
    const logEmbed = new EmbedBuilder()
      .setColor("#0a0a0a")
      .setTitle("📁 Ticket Closed")
      .addFields(
        { name: "User", value: interaction.user.tag, inline: true },
        { name: "Channel", value: interaction.channel.name, inline: true }
      )
      .setTimestamp();

    await logChannel.send({
      embeds: [logEmbed],
      files: [{ attachment: Buffer.from(transcript, "utf-8"), name: `ticket-${interaction.channel.name}.txt` }]
    });
  }

  setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
}

// ================= SEND LOG =================
async function sendLog(client, interaction, type, channel, nick, lang) {
  const logChannel = await client.channels.fetch(CONFIG.LOG_CHANNEL_ID).catch(() => null);
  if (!logChannel) return;

  const names = {
    vyrn: "VYRN Main Clan",
    staff: "Staff Support"
  };

  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("📩 New Application Ticket")
    .addFields(
      { name: "User", value: interaction.user.tag, inline: true },
      { name: "Type", value: names[type], inline: true },
      { name: "Channel", value: channel.toString(), inline: true },
      { name: "Nickname", value: nick },
      { name: "Language", value: lang }
    )
    .setTimestamp();

  logChannel.send({ embeds: [embed] }).catch(() => {});
}

// ================= EXPORT =================
module.exports = {
  createTicketPanel,
  handle
};
