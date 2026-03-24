js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require('discord.js');

const config = require('../config');

// ===== PANEL CREATE =====
async function createTicketPanel(client) {
  const channel = await client.channels.fetch(config.PANEL_CHANNEL).catch(() => null);
  if (!channel) return console.log("❌ PANEL CHANNEL NOT FOUND");

  const embed = new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('🎟 Ticket Panel')
    .setDescription('Kliknij przycisk aby otworzyć ticket')
    .setImage(config.IMAGE);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('open_ticket')
      .setLabel('🔥 Open Ticket')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [row] });

  console.log("✅ PANEL CREATED");
}

// ===== HANDLE INTERACTIONS =====
async function handleTicket(interaction) {

  // ===== OPEN =====
  if (interaction.customId === 'open_ticket') {

    const existing = interaction.guild.channels.cache.find(
      c => c.name === `ticket-${interaction.user.username}`
    );

    if (existing) {
      return interaction.reply({ content: "❌ Masz już ticket", ephemeral: true });
    }

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: config.CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
        { id: config.OFFICER_ROLE, allow: [PermissionsBitField.Flags.ViewChannel] }
      ]
    });

    const embed = new EmbedBuilder()
      .setColor('#ff9900')
      .setTitle('🌍 Select Language');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_en').setLabel('🇬🇧 English').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('ticket_pl').setLabel('🇵🇱 Polski').setStyle(ButtonStyle.Secondary)
    );

    await channel.send({
      content: `<@${interaction.user.id}> <@&${config.OFFICER_ROLE}>`,
      embeds: [embed],
      components: [row]
    });

    interaction.reply({ content: "✅ Ticket created", ephemeral: true });
  }

  // ===== LANGUAGE EN =====
  if (interaction.customId === 'ticket_en') {
    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor('#2b2d31')
          .setTitle('Support Ticket')
          .setDescription('Send screenshot, gamepasses and stats.')
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('🔒 Close Ticket')
            .setStyle(ButtonStyle.Danger)
        )
      ]
    });
  }

  // ===== LANGUAGE PL =====
  if (interaction.customId === 'ticket_pl') {
    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor('#2b2d31')
          .setTitle('Ticket Support')
          .setDescription('Wyślij screenshot, gamepassy i statystyki.')
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('🔒 Zamknij Ticket')
            .setStyle(ButtonStyle.Danger)
        )
      ]
    });
  }

  // ===== CLOSE =====
  if (interaction.customId === 'close_ticket') {

    await interaction.reply({ content: "🔒 Zamykam ticket...", ephemeral: true });

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 2000);
  }
}

module.exports = {
  createTicketPanel,
  handleTicket
};
