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
const REQUIRED_ROLE = "1475998527191519302"; // kto może otworzyć
const ADMIN_ROLE = "1475998527191519302"; // kto może zamknąć

async function handle(interaction) {

  // =========================
  // 🔘 OPEN BUTTON
  // =========================
  if (interaction.isButton() && interaction.customId === "open_ticket") {

    if (!interaction.member.roles.cache.has(REQUIRED_ROLE)) {
      return interaction.reply({
        content: "❌ Nie masz roli do tworzenia ticketów",
        ephemeral: true
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("ticket_modal")
      .setTitle("🎫 Create Ticket");

    const nickInput = new TextInputBuilder()
      .setCustomId("nick")
      .setLabel("Twój nick / Your nickname")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const langInput = new TextInputBuilder()
      .setCustomId("lang")
      .setLabel("Język (pl/en)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nickInput),
      new ActionRowBuilder().addComponents(langInput)
    );

    return interaction.showModal(modal);
  }

  // =========================
  // 📝 MODAL SUBMIT
  // =========================
  if (interaction.isModalSubmit() && interaction.customId === "ticket_modal") {

    const nick = interaction.fields.getTextInputValue("nick");
    const lang = interaction.fields.getTextInputValue("lang").toLowerCase();

    const guild = interaction.guild;

    const channel = await guild.channels.create({
      name: `ticket-${nick}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.id,
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
        }
      ]
    });

    // ===== EMBED =====
    const embed = new EmbedBuilder()
      .setColor("#22c55e")
      .setTitle("🎫 Ticket Opened")
      .setThumbnail(interaction.user.displayAvatarURL())
      .setDescription(
        lang === "en"
          ? `👤 **User:** ${interaction.user}\n📝 **Nickname:** ${nick}\n\n📸 Please send screenshots of your stats, gamepasses and your team.\nOur staff will review your application.`
          : `👤 **Użytkownik:** ${interaction.user}\n📝 **Nick:** ${nick}\n\n📸 Wyślij screeny statystyk, gamepassów oraz teamu.\nAdministracja sprawdzi twoją aplikację.`
      )
      .setFooter({ text: "VYRN Ticket System" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("🔒 Close Ticket")
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
  }

  // =========================
  // 🔒 CLOSE BUTTON
  // =========================
  if (interaction.isButton() && interaction.customId === "close_ticket") {

    if (!interaction.member.roles.cache.has(ADMIN_ROLE)) {
      return interaction.reply({
        content: "❌ Tylko Admin może zamknąć ticket",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor("#ef4444")
      .setTitle("🗑️ Ticket Closing")
      .setDescription("Ticket will be deleted in 3 seconds...");

    await interaction.reply({ embeds: [embed] });

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 3000);
  }
}

module.exports = {
  handle
};
