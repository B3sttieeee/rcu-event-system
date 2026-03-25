const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const Panel = require("../models/Panel");
const config = require("../config");

const REQUIRED_ROLE = "1475998527191519302";

// ===== PANEL =====
async function createTicketPanel(client) {

  const channel = await client.channels.fetch(config.PANEL_CHANNEL).catch(() => null);
  if (!channel) return console.log("❌ PANEL CHANNEL NOT FOUND");

  let data = await Panel.findOne({ guildId: channel.guild.id });

  const embed = new EmbedBuilder()
    .setColor("#2b2d31")
    .setTitle("🎟 Clan Ticket")
    .setDescription(`
📌 Open a ticket to apply for clan

📋 Requirements:
• Good Gamepasses
• Active player
• High stats
`)
    .setImage(config.IMAGE);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("open_ticket")
      .setLabel("🔥 Open Ticket")
      .setStyle(ButtonStyle.Primary)
  );

  try {
    const msg = await channel.messages.fetch(data?.messageId);
    await msg.edit({ embeds: [embed], components: [row] });

  } catch {

    const msg = await channel.send({ embeds: [embed], components: [row] });

    if (!data) {
      await Panel.create({
        guildId: channel.guild.id,
        messageId: msg.id
      });
    } else {
      data.messageId = msg.id;
      await data.save();
    }
  }
}

// ===== INTERACTION HANDLER =====
async function handleInteraction(interaction) {

  // ===== OPEN TICKET =====
  if (interaction.isButton() && interaction.customId === "open_ticket") {

    if (!interaction.member.roles.cache.has(REQUIRED_ROLE)) {
      return interaction.reply({
        content: "❌ You don't have required role!",
        ephemeral: true
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("ticket_modal")
      .setTitle("🎟 Create Ticket");

    const nick = new TextInputBuilder()
      .setCustomId("nick")
      .setLabel("Your Nick")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const lang = new TextInputBuilder()
      .setCustomId("lang")
      .setLabel("Language (PL / EN)")
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

    const ticket = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: config.CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
        { id: config.OFFICER_ROLE, allow: [PermissionsBitField.Flags.ViewChannel] }
      ]
    });

    let desc;

    if (lang === "pl") {
      desc = `Cześć ${interaction.user}

📸 Wyślij screen statystyk i gamepassów,
abyśmy mogli rozpatrzyć twoją aplikację.

👤 Nick: **${nick}**`;
    } else {
      desc = `Hello ${interaction.user}

📸 Send screenshot of stats and gamepasses,
so we can review your application.

👤 Nick: **${nick}**`;
    }

    const embed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setTitle("🎟 Ticket")
      .setDescription(desc);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("🔒 Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await ticket.send({
      content: `<@${interaction.user.id}> <@&${config.OFFICER_ROLE}>`,
      embeds: [embed],
      components: [row]
    });

    interaction.reply({
      content: `✅ Ticket created: ${ticket}`,
      ephemeral: true
    });
  }

  // ===== CLOSE =====
  if (interaction.isButton() && interaction.customId === "close_ticket") {

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: "❌ Only admin can close!",
        ephemeral: true
      });
    }

    await interaction.reply({ content: "🔒 Closing...", ephemeral: true });

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 2000);
  }
}

module.exports = {
  createTicketPanel,
  handleInteraction
};
