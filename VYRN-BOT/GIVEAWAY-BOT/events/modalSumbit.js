const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {

    if (!interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith('embedModal_')) return;

    const channelId = interaction.customId.split('_')[1];
    const channel = interaction.guild.channels.cache.get(channelId);

    const title = interaction.fields.getTextInputValue('title');
    const description = interaction.fields.getTextInputValue('description');
    const color = interaction.fields.getTextInputValue('color') || '#2b2d31';
    const authorRaw = interaction.fields.getTextInputValue('author');
    const fieldsRaw = interaction.fields.getTextInputValue('fields');

    const embed = new EmbedBuilder().setColor(color);

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);

    // AUTHOR
    if (authorRaw) {
      const [name, iconURL] = authorRaw.split('|');
      embed.setAuthor({
        name: name?.trim(),
        iconURL: iconURL?.trim() || null
      });
    }

    // FIELDS
    if (fieldsRaw) {
      const fields = fieldsRaw.split(';');

      for (let field of fields) {
        const [name, value, inline] = field.split('|');

        if (!name || !value) continue;

        embed.addFields({
          name: name.trim(),
          value: value.trim(),
          inline: inline?.trim() === 'true'
        });
      }
    }

    await interaction.reply({
      content: '✅ Embed wysłany!',
      ephemeral: true
    });

    await channel.send({ embeds: [embed] });
  }
};
