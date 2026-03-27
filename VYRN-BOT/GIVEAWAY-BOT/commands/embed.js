const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Tworzy embed przez formularz'),

  async execute(interaction) {

    // Tworzenie modala (formularza)
    const modal = new ModalBuilder()
      .setCustomId('embedModal')
      .setTitle('Tworzenie embedu');

    // POLA
    const titleInput = new TextInputBuilder()
      .setCustomId('title')
      .setLabel('Tytuł')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const descriptionInput = new TextInputBuilder()
      .setCustomId('description')
      .setLabel('Opis (możesz używać emoji 🎉)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    const colorInput = new TextInputBuilder()
      .setCustomId('color')
      .setLabel('Kolor HEX (#ff0000)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const imageInput = new TextInputBuilder()
      .setCustomId('image')
      .setLabel('URL obrazka')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const footerInput = new TextInputBuilder()
      .setCustomId('footer')
      .setLabel('Footer')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    // ROWS (max 5!)
    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descriptionInput),
      new ActionRowBuilder().addComponents(colorInput),
      new ActionRowBuilder().addComponents(imageInput),
      new ActionRowBuilder().addComponents(footerInput)
    );

    await interaction.showModal(modal);
  }
};
