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

// ===== CONFIG =====
const ADMIN_ROLE = "1475998527191519302";
const PANEL_CHANNEL_ID = "1475558248487583805";
const CATEGORY_ID = "1475985874385899530";
const VERIFY_ROLE = "1475998527191519302"; // 🔥 TWOJA ROLA CO NIE MA WIDZIEĆ

// ================= PANEL =================
async function createTicketPanel(client) {
  const channel = await client.channels.fetch(PANEL_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#0f172a")
    .setTitle("🎫 VYRN • Ticket")
    .setDescription("Click button to open ticket");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("open_ticket")
      .setLabel("Open")
      .setStyle(ButtonStyle.Primary)
  );

  const msgs = await channel.messages.fetch({ limit: 10 });
  const existing = msgs.find(m => m.author.id === client.user.id);

  if (existing) {
    return existing.edit({ embeds: [embed], components: [row] });
  }

  await channel.send({ embeds: [embed], components: [row] });
}

// ================= HANDLE =================
async function handle(interaction) {

  // ===== OPEN =====
  if (interaction.isButton() && interaction.customId === "open_ticket") {

    const existing = interaction.guild.channels.cache.find(
      c => c.topic === interaction.user.id
    );

    if (existing) {
      return interaction.reply({
        content: `❌ Masz już ticket: ${existing}`,
        ephemeral: true
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("ticket_modal")
      .setTitle("Ticket");

    const nick = new TextInputBuilder()
      .setCustomId("nick")
      .setLabel("Nick")
      .setStyle(TextInputStyle.Short);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nick)
    );

    return interaction.showModal(modal);
  }

  // ===== MODAL =====
  if (interaction.isModalSubmit() && interaction.customId === "ticket_modal") {

    const nick = interaction.fields.getTextInputValue("nick");

    // 🔥 1. TWORZYMY BEZ KATEGORII
    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`.toLowerCase(),
      type: ChannelType.GuildText,
      topic: interaction.user.id
    });

    // 🔥 2. USTAWIAMY PERMISJE NA TWARDO
    await channel.permissionOverwrites.set([
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
        id: ADMIN_ROLE,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages
        ]
      },
      {
        id: VERIFY_ROLE,
        deny: [PermissionsBitField.Flags.ViewChannel]
      }
    ]);

    // 🔥 3. DOPIERO TERAZ KATEGORIA
    await channel.setParent(CATEGORY_ID, { lockPermissions: false });

    const embed = new EmbedBuilder()
      .setColor("#22c55e")
      .setTitle("Ticket Opened")
      .setDescription(`👤 ${interaction.user}\n📝 ${nick}`);

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
      content: `✅ ${channel}`,
      ephemeral: true
    });
  }

  // ===== CLOSE =====
  if (interaction.isButton() && interaction.customId === "close_ticket") {

    const isAdmin =
      interaction.member.roles.cache.has(ADMIN_ROLE) ||
      interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!isAdmin) {
      return interaction.reply({
        content: "❌ Only admin",
        ephemeral: true
      });
    }

    await interaction.reply({ content: "Closing...", ephemeral: true });

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 1500);
  }
}

module.exports = {
  handle,
  createTicketPanel
};
