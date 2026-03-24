const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder
} = require('discord.js');

const config = require('../config');

// ===== PANEL =====
async function createPanel(client) {
  const channel = await client.channels.fetch(config.PANEL_CHANNEL).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('🎫 Clan TICKET')
    .setDescription(`
📌 **Join Clan ticket is used to review your application.**

📋 **Requirements:**
• Good Gamepasses  
• 1.5N+ Rebirth  
• 3-5H Active  
• 15M Eggs  
`)
    .setImage(config.IMAGE);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_open')
      .setLabel('🔥 Open Ticket')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

// ===== EXPORT EVENT =====
module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    createPanel(client);
  }
};

// ===== INTERACTIONS =====
module.exports.handle = async (interaction) => {

  // ===== OPEN MODAL =====
  if (interaction.customId === 'ticket_open') {

    const modal = new ModalBuilder()
      .setCustomId('ticket_modal')
      .setTitle('🎫 Ticket Setup');

    const nick = new TextInputBuilder()
      .setCustomId('nick')
      .setLabel('Your in-game nickname')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(nick);

    modal.addComponents(row);

    return interaction.showModal(modal);
  }

  // ===== MODAL SUBMIT =====
  if (interaction.isModalSubmit() && interaction.customId === 'ticket_modal') {

    const nick = interaction.fields.getTextInputValue('nick');

    const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket_lang')
      .setPlaceholder('Select language')
      .addOptions([
        { label: '🇵🇱 Polish Ticket', value: 'pl' },
        { label: '🇬🇧 English Ticket', value: 'en' }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.reply({
      content: `Nick: **${nick}**`,
      components: [row],
      ephemeral: true
    });
  }

  // ===== LANGUAGE PICK =====
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_lang') {

    const lang = interaction.values[0];
    const nick = interaction.message.content.split('**')[1];

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
      .setColor('#2b2d31')
      .setTitle('🎫 Ticket Opened')
      .setDescription(`
👤 User: ${interaction.user}
🎮 Nick: **${nick}**
🌍 Language: ${lang.toUpperCase()}
`);

    const closeBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('🔒 Close Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `<@${interaction.user.id}> <@&${config.OFFICER_ROLE}>`,
      embeds: [embed],
      components: [closeBtn]
    });

    // DM USER
    interaction.user.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('🎫 Ticket Created')
          .setDescription(`Your ticket has been opened: ${channel}`)
      ]
    }).catch(() => {});

    interaction.update({ content: '✅ Ticket created', components: [] });
  }

  // ===== CLOSE =====
  if (interaction.customId === 'ticket_close') {

    await interaction.reply({ content: '🔒 Closing...', ephemeral: true });

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 3000);
  }
};
