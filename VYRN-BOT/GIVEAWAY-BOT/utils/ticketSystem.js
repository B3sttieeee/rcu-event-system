const {
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder
} = require("discord.js");

// ===== CONFIG =====
const CATEGORY_ID = "1475985874385899530";
const ADMIN_ROLE = "1475572271446884535";
const REQUIRED_ROLE = "1475998527191519302";

// ===== HANDLE =====
async function handle(interaction) {

  // =========================
  // 🔘 OPEN BUTTON
  // =========================
  if (interaction.isButton() && interaction.customId === "open_ticket") {

    if (!interaction.member.roles.cache.has(REQUIRED_ROLE)) {
      return interaction.reply({
        content: "❌ You don't have permission to open a ticket.",
        ephemeral: true
      });
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId("ticket_lang")
      .setPlaceholder("🌍 Choose language / Wybierz język")
      .addOptions([
        {
          label: "🇵🇱 Polish Ticket",
          value: "pl"
        },
        {
          label: "🇬🇧 English Ticket",
          value: "en"
        }
      ]);

    const row = new ActionRowBuilder().addComponents(select);

    return interaction.reply({
      content: "🎫 Choose ticket language:",
      components: [row],
      ephemeral: true
    });
  }

  // =========================
  // 🌍 LANGUAGE SELECT
  // =========================
  if (interaction.isStringSelectMenu() && interaction.customId === "ticket_lang") {

    const lang = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`ticket_modal_${lang}`)
      .setTitle("🎫 Ticket");

    const input = new TextInputBuilder()
      .setCustomId("nick")
      .setLabel(lang === "pl" ? "Twój nick" : "Your nickname")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    return interaction.showModal(modal);
  }

  // =========================
  // 📩 MODAL SUBMIT
  // =========================
  if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket_modal_")) {

    const lang = interaction.customId.split("_")[2];
    const nick = interaction.fields.getTextInputValue("nick");

    const channel = await interaction.guild.channels.create({
      name: `ticket-${nick}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
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
      .setColor("#2b2d31")
      .setTitle("🎫 Ticket Opened")
      .setDescription(
        lang === "pl"
          ? `👋 Witaj ${interaction.user}

📸 Wyślij screen swoich statystyk / gamepassów oraz teamu, abyśmy mogli rozpatrzyć Twoją aplikację do klanu.`
          : `👋 Welcome ${interaction.user}

📸 Please send screenshots of your stats / gamepasses and your team so we can review your clan application.`
      )
      .setFooter({ text: "VYRN SYSTEM" });

    const closeBtn = new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("🔒 Close Ticket")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeBtn);

    await channel.send({
      content: `<@${interaction.user.id}> <@&${ADMIN_ROLE}>`,
      embeds: [embed],
      components: [row]
    });

    return interaction.reply({
      content: `✅ Ticket created: ${channel}`,
      ephemeral: true
    });
  }

  // =========================
  // 🔒 CLOSE TICKET
  // =========================
  if (interaction.isButton() && interaction.customId === "close_ticket") {

    if (!interaction.member.roles.cache.has(ADMIN_ROLE)) {
      return interaction.reply({
        content: "❌ Only admin can close tickets.",
        ephemeral: true
      });
    }

    await interaction.reply({
      content: "🔒 Closing ticket in 3 seconds..."
    });

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 3000);
  }
}

// ===== EXPORT =====
module.exports = {
  handle
};
