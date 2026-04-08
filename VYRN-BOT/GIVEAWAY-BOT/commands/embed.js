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
    .setDescription('📦 Tworzy lub edytuje embed')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('kanal')
        .setDescription('Kanał docelowy')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const targetChannel = interaction.options.getChannel('kanal') || interaction.channel;

      // Pobieramy embed z wiadomości, jeśli kliknięto "Edytuj"
      let oldEmbed = null;
      if (interaction.message && interaction.message.embeds.length > 0) {
        oldEmbed = interaction.message.embeds[0];
      }

      const modal = new ModalBuilder()
        .setCustomId(`embedModal_${targetChannel.id}`)
        .setTitle('📦 Embed Builder');

      // TITLE
      const titleInput = new TextInputBuilder()
        .setCustomId('title')
        .setLabel('Tytuł')
        .setStyle(TextInputStyle.Short)
        .setValue(oldEmbed?.title || "")
        .setRequired(false);

      // DESCRIPTION
      const descriptionInput = new TextInputBuilder()
        .setCustomId('description')
        .setLabel('Opis embeda')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(oldEmbed?.description || "")
        .setRequired(false)
        .setPlaceholder('Wpisz "." jeśli nie chcesz opisu');

      // COLOR
      const colorInput = new TextInputBuilder()
        .setCustomId('color')
        .setLabel('Kolor HEX (#ff0000)')
        .setStyle(TextInputStyle.Short)
        .setValue(oldEmbed?.hexColor ? `#${oldEmbed.hexColor}` : "#2b2d31")
        .setRequired(false);

      // AUTHOR
      let authorValue = "";
      if (oldEmbed?.author) {
        authorValue = oldEmbed.author.iconURL 
          ? `${oldEmbed.author.name} | ${oldEmbed.author.iconURL}`
          : oldEmbed.author.name;
      }
      const authorInput = new TextInputBuilder()
        .setCustomId('author')
        .setLabel('Autor (nazwa | icon URL)')
        .setStyle(TextInputStyle.Short)
        .setValue(authorValue)
        .setRequired(false)
        .setPlaceholder('Admin | https://i.imgur.com/...');

      // IMAGE / GIF
      const imageInput = new TextInputBuilder()
        .setCustomId('image')
        .setLabel('URL obrazka lub GIF')
        .setStyle(TextInputStyle.Short)
        .setValue(oldEmbed?.image?.url || "")
        .setRequired(false)
        .setPlaceholder('https://i.imgur.com/...gif');

      modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(descriptionInput),
        new ActionRowBuilder().addComponents(colorInput),
        new ActionRowBuilder().addComponents(authorInput),
        new ActionRowBuilder().addComponents(imageInput)
      );

      await interaction.showModal(modal);

    } catch (err) {
      console.error("❌ Błąd w komendzie /embed:", err);
      await interaction.reply({
        content: "❌ Wystąpił błąd podczas otwierania formularza.",
        ephemeral: true
      });
    }
  }
};
