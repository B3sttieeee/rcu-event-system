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
  PANEL_CHANNEL_ID: "1475558248487583805",
  LOG_CHANNEL_ID: "1494072832827850953",
  CATEGORY_ID: "1475985874385899530",
  ADMIN_ROLE: "1475998527191519302",
  VERIFY_ROLE: "1475998527191519302",

  PREFIXES: ["ticket-", "v2rn-"],

  IMAGE:
    "https://cdn.discordapp.com/attachments/1475993709240778904/1488949259209281556/ezgif.com-video-to-gif-converter.gif"
};

// ====================== AI BRAIN ======================
function aiBrain(text, lang = "pl") {
  const msg = text.toLowerCase();

  const isEN = lang === "en";

  if (msg.includes("cześć") || msg.includes("hej") || msg.includes("hello")) {
    return isEN
      ? "👋 Hi! I'm VYRN AI Support. I can help you with recruitment."
      : "👋 Hej! Jestem VYRN AI Support. Pomogę Ci z rekrutacją.";
  }

  if (msg.includes("ile") && msg.includes("czek") || msg.includes("how long")) {
    return isEN
      ? "⏳ Response time is up to **24h**. Staff manually reviews applications."
      : "⏳ Czas odpowiedzi to do **24h**. Administracja sprawdza zgłoszenia ręcznie.";
  }

  if (msg.includes("rekrut")) {
    return isEN
      ? "📌 Recruitment takes up to 24h. Please wait for staff decision."
      : "📌 Rekrutacja trwa do 24h. Czekaj na decyzję staffu.";
  }

  if (msg.includes("status")) {
    return isEN
      ? "📊 Your ticket is active and waiting for response."
      : "📊 Twój ticket jest aktywny i oczekuje na odpowiedź.";
  }

  return null;
}

// ====================== PANEL ======================
async function createTicketPanel(client) {
  const channel = await client.channels.fetch(CONFIG.PANEL_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#ff6600")
    .setTitle("📌 VYRN Recruitment System")
    .setDescription(
      `🎫 **Choose your application type**\n\n` +
      `🔥 VYRN Main Clan\n` +
      `🛡️ V2RN Academy\n\n` +
      `⏳ Response time: up to 24h`
    )
    .setImage(CONFIG.IMAGE)
    .setFooter({ text: "VYRN Recruitment System" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_vyrn")
      .setLabel("🔥 VYRN")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("ticket_v2rn")
      .setLabel("🛡️ V2RN")
      .setStyle(ButtonStyle.Success)
  );

  const msgs = await channel.messages.fetch({ limit: 10 });
  const existing = msgs.find(m =>
    m.embeds?.[0]?.title?.includes("Recruitment")
  );

  if (existing) {
    await existing.edit({ embeds: [embed], components: [row] });
  } else {
    await channel.send({ embeds: [embed], components: [row] });
  }
}

// ====================== OPEN TICKET ======================
async function openTicket(interaction, type) {
  const prefix = type === "v2rn" ? "v2rn-" : "ticket-";

  const existing = interaction.guild.channels.cache.find(
    c =>
      c.topic === interaction.user.id &&
      c.name.startsWith(prefix)
  );

  if (existing) {
    return interaction.reply({
      content: `❌ Masz już ticket: ${existing}`,
      ephemeral: true
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${type}`)
    .setTitle("🎫 Application Form");

  const nick = new TextInputBuilder()
    .setCustomId("nick")
    .setLabel("Nick w grze")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const lang = new TextInputBuilder()
    .setCustomId("lang")
    .setLabel("Język (pl/en)")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nick),
    new ActionRowBuilder().addComponents(lang)
  );

  await interaction.showModal(modal);
}

// ====================== CREATE CHANNEL ======================
async function createTicketChannel(interaction, type) {
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
    .setThumbnail(interaction.user.displayAvatarURL())
    .setDescription(
      `👤 User: ${interaction.user}\n` +
      `📝 Nick: ${nick}\n` +
      `🌍 Lang: ${lang}\n\n` +
      `⏳ Response time: up to 24h`
    )
    .setFooter({ text: "VYRN Ticket System" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("🔒 Close Ticket")
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
}

// ====================== CLOSE ======================
async function closeTicket(interaction) {
  const isAdmin =
    interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    interaction.member.roles.cache.has(CONFIG.ADMIN_ROLE);

  if (!isAdmin) {
    return interaction.reply({
      content: "❌ Brak uprawnień.",
      ephemeral: true
    });
  }

  await interaction.reply({
    content: "🗑️ Closing ticket...",
    ephemeral: true
  });

  setTimeout(() => {
    interaction.channel.delete().catch(() => {});
  }, 3000);
}

// ====================== AI + LOG SYSTEM ======================
async function handleAI(message, client) {
  if (message.author.bot) return;

  const isTicket = CONFIG.PREFIXES.some(p =>
    message.channel.name?.startsWith(p)
  );

  if (!isTicket) return;

  const lang = message.content.toLowerCase().includes("hej") ? "pl" : "en";

  const response = aiBrain(message.content, lang);
  if (!response) return;

  await message.reply({ content: response });

  // LOG
  const logChannel = await client.channels.fetch(CONFIG.LOG_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setColor("#f59e0b")
    .setTitle("📩 AI Ticket Log")
    .addFields(
      { name: "User", value: `${message.author.tag}` },
      { name: "Channel", value: `${message.channel.name}` },
      { name: "Message", value: message.content },
      { name: "AI Response", value: response }
    )
    .setTimestamp();

  logChannel.send({ embeds: [embed] });
}

// ====================== HANDLER ======================
async function handle(interaction, client) {
  try {
    if (interaction.isButton()) {
      if (interaction.customId === "ticket_vyrn")
        return openTicket(interaction, "vyrn");

      if (interaction.customId === "ticket_v2rn")
        return openTicket(interaction, "v2rn");

      if (interaction.customId === "close_ticket")
        return closeTicket(interaction);
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === "ticket_modal_vyrn")
        return createTicketChannel(interaction, "vyrn");

      if (interaction.customId === "ticket_modal_v2rn")
        return createTicketChannel(interaction, "v2rn");
    }
  } catch (err) {
    console.error("Ticket error:", err);
  }
}

module.exports = {
  handle,
  createTicketPanel,
  handleAI
};
