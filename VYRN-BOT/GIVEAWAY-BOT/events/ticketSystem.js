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

// ===== READY EVENT =====
module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    createPanel(client);
  }
};

// ===== HANDLER =====
module.exports.handle = async (interaction) => {

  // ===== OPEN MODAL =====
  if (interaction.isButton() && interaction.customId === 'ticket_open') {

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

  // ===== LANGUAGE SELECT =====
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

    // ===== LANGUAGE TEXT =====
    let description;

    if (lang === 'pl') {
      description = `
👋 **Cześć!**

📸 Wyślij screen swoich **statystyk / gamepassów oraz teamu**,  
abyśmy mogli rozpatrzyć Twoją aplikację do klanu.

⏳ Odpowiedź otrzymasz wkrótce.
`;
    } else {
      description = `
👋 **Hello!**

📸 Please send a screenshot of your **stats / gamepasses and team**,  
so we can review your application to the clan.

⏳ Staff will respond shortly.
`;
    }

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('🎫 Clan Application')
      .setDescription(description)
      .addFields(
        { name: '👤 User', value: `${interaction.user}`, inline: true },
        { name: '🎮 Nick', value: `**${nick}**`, inline: true },
        { name: '🌍 Language', value: lang.toUpperCase(), inline: true }
      );

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
          .setColor('#2b2d31')
          .setTitle('🎫 Ticket Created')
          .setDescription(`Your ticket has been opened: ${channel}`)
      ]
    }).catch(() => {});

    interaction.update({ content: '✅ Ticket created', components: [] });
  }

  // ===== CLOSE TICKET =====
  if (interaction.isButton() && interaction.customId === 'ticket_close') {

    // 🔥 PERMISSIONS CHECK
    if (
      !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
      !interaction.member.roles.cache.has(config.OFFICER_ROLE)
    ) {
      return interaction.reply({
        content: '❌ Only staff can close this ticket',
        ephemeral: true
      });
    }

    await interaction.reply({
      content: '🔒 Closing ticket...',
      ephemeral: true
    });

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 3000);
  }
};
