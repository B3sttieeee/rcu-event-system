const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Warn = require('../models/Warn');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn user')
    .addUserOption(o => o.setName('user').setRequired(true))
    .addStringOption(o => o.setName('reason').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    let data = await Warn.findOne({
      userId: user.id,
      guildId: interaction.guild.id
    });

    if (!data) {
      data = await Warn.create({
        userId: user.id,
        guildId: interaction.guild.id,
        warns: []
      });
    }

    data.warns.push({
      reason,
      date: Date.now()
    });

    await data.save();

    interaction.reply(`⚠️ ${user.tag} warned (${data.warns.length})`);
  }
};
