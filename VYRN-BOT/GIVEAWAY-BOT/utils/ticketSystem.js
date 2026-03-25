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
const REQUIRED_ROLE = "1475998527191519302";
const ADMIN_ROLE = "1475998527191519302";

async function handle(interaction) {

  // ===== OPEN BUTTON =====
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

    const nick = new TextInputBuilder()
      .setCustomId("nick")
      .setLabel("Nick")
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

    return interaction.showModal(modal);
  }

  // ===== MODAL =====
  if (interaction.isModalSubmit() && interaction.customId === "ticket_modal") {

    const nick = interaction.fields.getTextInputValue("nick");
    const lang = interaction.fields.getTextInputValue("lang").toLowerCase();

    const channel = await interaction.guild.channels.create({
      name: `ticket-${nick}`,
      type: ChannelType.GuildText,
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
          id: ADMIN_ROLE,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        }
      ]
    });

    const embed = new EmbedBuilder()
      .setColor("#22c55e")
      .setTitle("🎫 Ticket Opened")
      .setThumbnail(interaction.user.displayAvatarURL())
      .setDescription(
        lang === "en"
          ? `👤 **User:** ${interaction.user}\n📝 **Nickname:** ${nick}\n\n📸 Send screenshots of your stats, gamepasses and team.`
          : `👤 **Użytkownik:** ${interaction.user}\n📝 **Nick:** ${nick}\n\n📸 Wyślij screeny statystyk, gamepassów i teamu.`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("🔒 Close")
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

  // ===== CLOSE =====
  if (interaction.isButton() && interaction.customId === "close_ticket") {

    if (!interaction.member.roles.cache.has(ADMIN_ROLE)) {
      return interaction.reply({
        content: "❌ Only admin can close ticket",
        ephemeral: true
      });
    }

    await interaction.reply({
      content: "🗑️ Closing ticket...",
      ephemeral: true
    });

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 2000);
  }
}

module.exports = { handle };
