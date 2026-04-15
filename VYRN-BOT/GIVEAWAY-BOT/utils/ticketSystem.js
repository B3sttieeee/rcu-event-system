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
  LOG_CHANNEL_ID: "1494072832827850953",

  TICKET_CATEGORY_ID: "1475985874385899530",
  VERIFY_ROLE: "1475998527191519302",

  IMAGE:
    "https://cdn.discordapp.com/attachments/1475993709240778904/1488949259209281556/ezgif.com-video-to-gif-converter.gif",

  PREFIX_VYRN: "vyrn-",
  PREFIX_V2RN: "v2rn-"
};

// ====================== AI SUPPORT ======================
function aiSupportResponse(lang, type) {
  const isPL = lang === "pl";

  const responses = {
    vyrn: {
      pl:
        "🤖 **VYRN AI Support**\n\n" +
        "Twoje zgłoszenie zostało przyjęte.\n\n" +
        "⏳ Standardowy czas odpowiedzi: **do 24h**\n" +
        "📌 Rekrutacja zależy od aktywności administracji\n" +
        "📊 W międzyczasie możesz normalnie grać i czekać na odpowiedź",

      en:
        "🤖 **VYRN AI Support**\n\n" +
        "Your application has been received.\n\n" +
        "⏳ Response time: **up to 24h**\n" +
        "📌 Recruitment depends on admin availability\n" +
        "📊 You can continue playing while waiting"
    },

    v2rn: {
      pl:
        "🤖 **V2RN Academy AI Support**\n\n" +
        "Twoje zgłoszenie zostało zapisane.\n\n" +
        "⏳ Czas odpowiedzi: **do 24h**\n" +
        "📌 Akademia może odpowiadać szybciej lub wolniej\n" +
        "📊 Prosimy o cierpliwość",

      en:
        "🤖 **V2RN Academy AI Support**\n\n" +
        "Your application has been recorded.\n\n" +
        "⏳ Response time: **up to 24h**\n" +
        "📌 Academy response time may vary\n" +
        "📊 Please be patient"
    }
  };

  return isPL ? responses[type].pl : responses[type].en;
}

// ====================== PANEL ======================
async function createTicketPanel(client) {
  const channel = await client.channels.fetch(CONFIG.PANEL_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#ff6600")
    .setTitle("📌 VYRN • Recruitment System")
    .setDescription(
      "📩 **Wybierz typ zgłoszenia**\n\n" +
        "🔥 **VYRN Main Clan**\n" +
        "🛡️ **V2RN Academy**\n\n" +
        "Kliknij przycisk aby rozpocząć rekrutację"
    )
    .setImage(CONFIG.IMAGE)
    .setFooter({ text: "VYRN Recruitment System" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("open_ticket_vyrn")
      .setLabel("🔥 VYRN")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("open_ticket_v2rn")
      .setLabel("🛡️ V2RN")
      .setStyle(ButtonStyle.Success)
  );

  const messages = await channel.messages.fetch({ limit: 10 });
  const existing = messages.find(m =>
    m.author.id === client.user.id &&
    m.embeds[0]?.title?.includes("Recruitment")
  );

  if (existing) {
    await existing.edit({ embeds: [embed], components: [row] });
  } else {
    await channel.send({ embeds: [embed], components: [row] });
  }
}

// ====================== MAIN HANDLER ======================
async function handle(interaction, client) {
  try {
    if (interaction.isButton()) {
      if (interaction.customId === "open_ticket_vyrn")
        return openTicket(interaction, "vyrn");

      if (interaction.customId === "open_ticket_v2rn")
        return openTicket(interaction, "v2rn");

      if (interaction.customId === "close_ticket")
        return closeTicket(interaction);
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith("ticket_modal_")) {
        return submitTicket(interaction, client);
      }
    }
  } catch (err) {
    console.error("Ticket error:", err);
  }
}

// ====================== OPEN TICKET ======================
async function openTicket(interaction, type) {
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

// ====================== SUBMIT ======================
async function submitTicket(interaction, client) {
  const nick = interaction.fields.getTextInputValue("nick");
  const lang = interaction.fields.getTextInputValue("lang").toLowerCase();

  const type = interaction.customId.includes("v2rn") ? "v2rn" : "vyrn";
  const prefix = type === "v2rn" ? CONFIG.PREFIX_V2RN : CONFIG.PREFIX_VYRN;

  await interaction.deferReply({ ephemeral: true });

  const channel = await interaction.guild.channels.create({
    name: `${prefix}${interaction.user.username}`.toLowerCase(),
    type: ChannelType.GuildText,
    parent: CONFIG.TICKET_CATEGORY_ID,
    topic: interaction.user.id,
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
        allow: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: CONFIG.VERIFY_ROLE,
        deny: [PermissionsBitField.Flags.ViewChannel]
      }
    ]
  });

  const embed = new EmbedBuilder()
    .setColor("#22c55e")
    .setTitle(type === "vyrn" ? "🔥 VYRN Ticket" : "🛡️ V2RN Ticket")
    .setThumbnail(interaction.user.displayAvatarURL())
    .setDescription(
      `👤 User: ${interaction.user}\n` +
      `📝 Nick: **${nick}**\n\n` +
      aiSupportResponse(lang, type)
    )
    .setImage(CONFIG.IMAGE)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Close")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: `${interaction.user}`,
    embeds: [embed],
    components: [row]
  });

  // ================= LOGS =================
  const logChannel = await client.channels.fetch(CONFIG.LOG_CHANNEL_ID);
  if (logChannel) {
    logChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("#ffaa00")
          .setTitle("📥 Ticket Created")
          .setDescription(
            `👤 User: ${interaction.user.tag}\n` +
            `📌 Type: ${type}\n` +
            `🌐 Lang: ${lang}\n` +
            `📺 Channel: ${channel}`
          )
          .setTimestamp()
      ]
    });
  }

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
      content: "❌ No permission",
      ephemeral: true
    });
  }

  await interaction.reply({
    content: "🗑️ Closing ticket...",
    ephemeral: true
  });

  setTimeout(() => interaction.channel.delete(), 2500);
}

module.exports = {
  handle,
  createTicketPanel
};
