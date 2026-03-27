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
    .setDescription('Tworzy embed (zaawansowany)')
    .addChannelOption(opt =>
      opt.setName('kanal')
        .setDescription('Gdzie wysłać embed')
        .setRequired(false)
    ),

  async execute(interaction) {

    const channel = interaction.options.getChannel('kanal');

    const modal = new ModalBuilder()
      .setCustomId(`embedModal_${channel?.id || interaction.channel.id}`)
      .setTitle('Embed Builder');

    const title = new TextInputBuilder()
      .setCustomId('title')
      .setLabel('Tytuł')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const description = new TextInputBuilder()
      .setCustomId('description')
      .setLabel('Opis (emoji 🎉 działają)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    const color = new TextInputBuilder()
      .setCustomId('color')
      .setLabel('Kolor HEX (#ff0000)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const author = new TextInputBuilder()
      .setCustomId('author')
      .setLabel('Autor (nazwa | iconURL)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const fields = new TextInputBuilder()
      .setCustomId('fields')
      .setLabel('Pola: nazwa|wartość|inline (oddziel ; )')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setPlaceholder('Np: Nagroda|Nitro 🎁|true; Czas|24h|true');

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
