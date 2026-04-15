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
  PREFIXES: ["ticket-", "v2rn-"]
};

// ====================== AI BRAIN ======================
function aiBrain(text) {
  const msg = text.toLowerCase();

  if (msg.includes("cześć") || msg.includes("hej")) {
    return "👋 Hej! Jestem VYRN AI Support. Pomogę Ci z rekrutacją.";
  }

  if (msg.includes("ile") && msg.includes("czek")) {
    return "⏳ Czas odpowiedzi to do **24h**. Administracja sprawdza zgłoszenia ręcznie.";
  }

  if (msg.includes("rekrut")) {
    return "📌 Rekrutacja trwa do 24h. Czekaj na decyzję staffu.";
  }

  if (msg.includes("status")) {
    return "📊 Twój ticket jest aktywny i oczekuje na odpowiedź.";
  }

  return null;
}

// ====================== PANEL ======================
async function createTicketPanel(client) {
  const channel = await client.channels.fetch(CONFIG.PANEL_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setColor("#ff6600")
    .setTitle("📌 VYRN Ticket System")
    .setDescription(
      `🎫 Wybierz rekrutację:\n\n` +
      `🔥 **VYRN Main Clan**\n` +
      `🛡️ **V2RN Academy**\n\n` +
      `⏳ Odpowiedź do 24h`
    )
    .setImage("https://cdn.discordapp.com/attachments/1475993709240778904/1488949259209281556/ezgif.com-video-to-gif-converter.gif")
    .setFooter({ text: "VYRN Recruitment System" });

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
  const existing = msgs.find(m => m.embeds.length > 0 && m.embeds[0].title?.includes("Ticket"));

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
    c => c.topic === interaction.user.id && c.name.startsWith(prefix)
  );

  if (existing) {
    return interaction.reply({
      content: `❌ Masz już ticket: ${existing}`,
      ephemeral: true
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${type}`)
    .setTitle("🎫 Ticket Form");

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
    .setDescription(
      `👤 User: ${interaction.user}\n` +
      `📝 Nick: ${nick}\n` +
      `🌍 Lang: ${lang}\n\n` +
      `⏳ Odpowiedź do 24h`
    )
    .setFooter({ text: "VYRN Ticket System" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("🔒 Close")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({ embeds: [embed], components: [row] });

  await interaction.editReply({
    content: `✅ Ticket utworzony: ${channel}`
  });
}

// ====================== CLOSE ======================
async function closeTicket(interaction) {
  await interaction.reply({ content: "🗑️ Zamykam ticket...", ephemeral: true });

  setTimeout(() => {
    interaction.channel.delete().catch(() => {});
  }, 3000);
}

// ====================== AI HANDLER ======================
async function handleAI(message, client) {
  if (message.author.bot) return;

  const isTicket = CONFIG.PREFIXES.some(p =>
    message.channel.name?.startsWith(p)
  );

  if (!isTicket) return;

  const ai = aiBrain(message.content);

  if (!ai) return;

  await message.reply({ content: ai });

  // LOG
  const log = await client.channels.fetch(CONFIG.LOG_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setColor("#f59e0b")
    .setTitle("📩 Ticket AI Log")
    .addFields(
      { name: "User", value: message.author.tag },
      { name: "Channel", value: message.channel.name },
      { name: "Message", value: message.content },
      { name: "AI", value: ai }
    )
    .setTimestamp();

  log.send({ embeds: [embed] });
}

// ====================== MAIN HANDLER ======================
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
