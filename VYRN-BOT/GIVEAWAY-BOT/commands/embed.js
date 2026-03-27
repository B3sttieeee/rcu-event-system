const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Tworzy embed (formularz)')
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
      .setStyle(TextInputStyle.Short);

    const description = new TextInputBuilder()
      .setCustomId('description')
      .setLabel('Opis (emoji 🎉 OK)')
      .setStyle(TextInputStyle.Paragraph);

    const color = new TextInputBuilder()
      .setCustomId('color')
      .setLabel('Kolor HEX (#ff0000)')
      .setStyle(TextInputStyle.Short);

    const author = new TextInputBuilder()
      .setCustomId('author')
      .setLabel('Autor: nazwa | iconURL')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Np: Admin | https://...');

    const fields = new TextInputBuilder()
      .setCustomId('fields')
      .setLabel('Pola: nazwa|wartość|inline ; ...')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Nagroda|Nitro 🎁|true; Czas|24h|true');

    modal.addComponents(
      new ActionRowBuilder().addComponents(title),
      new ActionRowBuilder().addComponents(description),
      new ActionRowBuilder().addComponents(color),
      new ActionRowBuilder().addComponents(author),
      new ActionRowBuilder().addComponents(fields)
    );

    await interaction.showModal(modal);
  }
};
