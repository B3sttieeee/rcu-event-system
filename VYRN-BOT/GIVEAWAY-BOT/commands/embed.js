const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('📦 Tworzy embed (formularz)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('kanal')
        .setDescription('Kanał docelowy')
        .setRequired(false)
    ),

  async execute(interaction) {

    const channel = interaction.options.getChannel('kanal');

    const modal = new ModalBuilder()
      .setCustomId(`embedModal_${channel?.id || interaction.channel.id}`)
      .setTitle('📦 Embed Builder');

    const title = new TextInputBuilder()
      .setCustomId('title')
      .setLabel('Tytuł')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const description = new TextInputBuilder()
      .setCustomId('description')
      .setLabel('Opis (emoji 🎉)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true) // 🔥 HACK (musi być 1 required)
      .setPlaceholder('Wpisz "." jeśli nie chcesz opisu');

    const color = new TextInputBuilder()
      .setCustomId('color')
      .setLabel('Kolor HEX (#ff0000)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const author = new TextInputBuilder()
      .setCustomId('author')
      .setLabel('Autor: nazwa | iconURL')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setPlaceholder('Admin | https://...');

    const image = new TextInputBuilder()
      .setCustomId('image')
      .setLabel('GIF / obraz URL')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setPlaceholder('https://i.imgur.com/...gif');

    modal.addComponents(
      new ActionRowBuilder().addComponents(title),
      new ActionRowBuilder().addComponents(description),
      new ActionRowBuilder().addComponents(color),
      new ActionRowBuilder().addComponents(author),
      new ActionRowBuilder().addComponents(image)
    );

    await interaction.showModal(modal);
  }
};
