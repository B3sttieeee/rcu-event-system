const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

module.exports = {
  name: 'interactionCreate',

  async execute(interaction, client) {

    // =========================
    // 📩 MODAL SUBMIT
    // =========================
    if (interaction.isModalSubmit()) {

      if (!interaction.customId.startsWith('embedModal_')) return;

      const channelId = interaction.customId.split('_')[1];
      const channel = interaction.guild.channels.cache.get(channelId);

      let title = interaction.fields.getTextInputValue('title');
      let description = interaction.fields.getTextInputValue('description');
      let color = interaction.fields.getTextInputValue('color') || '#2b2d31';
      let authorRaw = interaction.fields.getTextInputValue('author');
      let image = interaction.fields.getTextInputValue('image');

      if (description === ".") description = "";

      const embed = new EmbedBuilder().setColor(color);

      if (title) embed.setTitle(title);
      if (description) embed.setDescription(description);

      if (authorRaw) {
        const [name, iconURL] = authorRaw.split('|');
        embed.setAuthor({
          name: name?.trim(),
          iconURL: iconURL?.trim() || undefined
        });
      }

      if (image) embed.setImage(image);

      // 🔥 BUTTONY
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`sendEmbed_${channelId}`)
          .setLabel('📨 Wyślij')
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`editEmbed_${channelId}`)
          .setLabel('✏️ Edytuj')
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({
        content: '👀 Podgląd embeda:',
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
    }

    // =========================
    // 🔘 BUTTONY
    // =========================
    if (interaction.isButton()) {

      // WYŚLIJ
      if (interaction.customId.startsWith('sendEmbed_')) {

        const channelId = interaction.customId.split('_')[1];
        const channel = interaction.guild.channels.cache.get(channelId);

        const embed = interaction.message.embeds[0];

        await channel.send({ embeds: [embed] });

        return interaction.update({
          content: '✅ Wysłano!',
          components: [],
          embeds: []
        });
      }

      // EDYTUJ (otwiera modal od nowa)
      if (interaction.customId.startsWith('editEmbed_')) {

        const channelId = interaction.customId.split('_')[1];
        const oldEmbed = interaction.message.embeds[0];

        const modal = new ModalBuilder()
          .setCustomId(`embedModal_${channelId}`)
          .setTitle('✏️ Edytuj embed');

        const title = new TextInputBuilder()
          .setCustomId('title')
          .setLabel('Tytuł')
          .setStyle(TextInputStyle.Short)
          .setValue(oldEmbed.title || '');

        const description = new TextInputBuilder()
          .setCustomId('description')
          .setLabel('Opis')
          .setStyle(TextInputStyle.Paragraph)
          .setValue(oldEmbed.description || '.');

        const color = new TextInputBuilder()
          .setCustomId('color')
          .setLabel('Kolor HEX')
          .setStyle(TextInputStyle.Short)
          .setValue(oldEmbed.hexColor || '#2b2d31');

        const author = new TextInputBuilder()
          .setCustomId('author')
          .setLabel('Autor (nazwa|iconURL)')
          .setStyle(TextInputStyle.Short);

        const image = new TextInputBuilder()
          .setCustomId('image')
          .setLabel('Obraz URL')
          .setStyle(TextInputStyle.Short);

        modal.addComponents(
          new ActionRowBuilder().addComponents(title),
          new ActionRowBuilder().addComponents(description),
          new ActionRowBuilder().addComponents(color),
          new ActionRowBuilder().addComponents(author),
          new ActionRowBuilder().addComponents(image)
        );

        return interaction.showModal(modal);
      }
    }
  }
};
