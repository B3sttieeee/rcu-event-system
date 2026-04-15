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

// ================= CONFIG =================
const CONFIG = {
  PANEL_CHANNEL_ID: "1475558248487583805",
  LOG_CHANNEL_ID: "1494072832827850953",
  CATEGORY_ID: "1475985874385899530",
  ADMIN_ROLE: "1475998527191519302"
};

// ================= AI =================
function aiBrain(text) {
  const msg = text.toLowerCase();

  if (msg.includes("hej") || msg.includes("cześć")) {
    return "👋 Hej! Jestem AI Support.";
  }

  if (msg.includes("ile") && msg.includes("czek")) {
    return "⏳ Do 24h odpowiedzi.";
  }

  if (msg.includes("rekrut")) {
    return "📌 Rekrutacja trwa do 24h.";
  }

  return null;
}

// ================= HANDLE =================
async function handle(interaction, client) {

  // ===== BUTTONS =====
  if (interaction.isButton()) {

    if (interaction.customId === "ticket_vyrn") {
      return openTicket(interaction, "vyrn");
    }

    if (interaction.customId === "ticket_v2rn") {
      return openTicket(interaction, "v2rn");
    }

    if (interaction.customId === "close_ticket") {
      return closeTicket(interaction);
    }
  }

  // ===== MODAL =====
  if (interaction.isModalSubmit()) {

    if (interaction.customId === "ticket_modal_vyrn") {
      return createTicket(interaction, "vyrn");
    }

    if (interaction.customId === "ticket_modal_v2rn") {
      return createTicket(interaction, "v2rn");
    }
  }
}

// ================= OPEN =================
async function openTicket(interaction, type) {

  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${type}`)
    .setTitle("Ticket Form");

  const nick = new TextInputBuilder()
    .setCustomId("nick")
    .setLabel("Nick")
    .setStyle(TextInputStyle.Short);

  const lang = new TextInputBuilder()
    .setCustomId("lang")
    .setLabel("Lang (pl/en)")
    .setStyle(TextInputStyle.Short);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nick),
    new ActionRowBuilder().addComponents(lang)
  );

  await interaction.showModal(modal);
}

// ================= CREATE =================
async function createTicket(interaction, type) {

  const nick = interaction.fields.getTextInputValue("nick");
  const lang = interaction.fields.getTextInputValue("lang");

  const channel = await interaction.guild.channels.create({
    name: `${type}-${interaction.user.username}`,
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
          PermissionsBitField.Flags.SendMessages
        ]
      }
    ]
  });

  const embed = new EmbedBuilder()
    .setTitle("🎫 Ticket opened")
    .setDescription(`Nick: ${nick}\nLang: ${lang}`)
    .setColor("Green");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Close")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({ embeds: [embed], components: [row] });

  await interaction.reply({
    content: `Ticket created: ${channel}`,
    ephemeral: true
  });
}

// ================= CLOSE =================
async function closeTicket(interaction) {
  await interaction.reply({ content: "Closing...", ephemeral: true });
  setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
}

// ================= AI + LOGS =================
async function handleAI(message, client) {

  const response = aiBrain(message.content);
  if (!response) return;

  await message.reply(response);

  const log = await client.channels.fetch(CONFIG.LOG_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle("AI LOG")
    .addFields(
      { name: "User", value: message.author.tag },
      { name: "Channel", value: message.channel.name },
      { name: "Msg", value: message.content },
      { name: "AI", value: response }
    )
    .setColor("Orange");

  log.send({ embeds: [embed] });
}

module.exports = {
  handle,
  handleAI
};
