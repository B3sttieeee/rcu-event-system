const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'interactionCreate',

  async execute(interaction, client) {

    if (!interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith('embedModal_')) return;

    const channelId = interaction.customId.split('_')[1];
    const channel = interaction.guild.channels.cache.get(channelId);

    if (!channel) {
      return interaction.reply({
        content: '❌ Nie znaleziono kanału!',
        ephemeral: true
      });
    }

    let title = interaction.fields.getTextInputValue('title');
    let description = interaction.fields.getTextInputValue('description');
    let color = interaction.fields.getTextInputValue('color') || '#2b2d31';
    let authorRaw = interaction.fields.getTextInputValue('author');
    let image = interaction.fields.getTextInputValue('image');

    // 🔥 usuwa "." hack
    if (description === ".") description = "";

    const embed = new EmbedBuilder().setColor(color);

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);

    // AUTHOR
    if (authorRaw) {
      const [name, iconURL] = authorRaw.split('|');

      embed.setAuthor({
        name: name?.trim(),
        iconURL: iconURL?.trim() || undefined
      });
    }

    // 🔥 GIF FIX (Tenor itp.)
    if (image) {
      let fixedImage = image;

      if (image.includes("tenor.com")) {
        fixedImage = image.replace("https://tenor.com/view/", "https://media.tenor.com/") + ".gif";
      }

      embed.setImage(fixedImage);
    }

    await interaction.reply({
      content: '✅ Embed wysłany!',
      ephemeral: true
    });

    await channel.send({
      embeds: [embed]
    });
  }
};
