const Giveaway = require('../models/Giveaway');

module.exports = {
  name: 'interactionCreate',

  async execute(interaction) {

    if (!interaction.isButton()) return;

    if (!['gw_join', 'gw_leave'].includes(interaction.customId)) return;

    const data = await Giveaway.findOne({ messageId: interaction.message.id });
    if (!data || data.ended) return;

    const userId = interaction.user.id;

    // REQUIRED ROLE
    if (data.requiredRole && !interaction.member.roles.cache.has(data.requiredRole)) {
      return interaction.reply({
        content: '❌ You need required role',
        ephemeral: true
      });
    }

    if (interaction.customId === 'gw_join') {

      if (data.participants.includes(userId)) {
        return interaction.reply({ content: '❌ Already joined', ephemeral: true });
      }

      data.participants.push(userId);
    }

    if (interaction.customId === 'gw_leave') {
      data.participants = data.participants.filter(id => id !== userId);
    }

    await data.save();

    interaction.reply({ content: '✅ Updated', ephemeral: true });
  }
};
