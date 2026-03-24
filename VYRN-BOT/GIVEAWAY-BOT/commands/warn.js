const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Warn = require('../models/Warn');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to warn')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for warn')
        .setRequired(true))
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
      reason: reason,
      date: Date.now()
    });

    await data.save();

    await interaction.reply({
      content: `⚠️ ${user.tag} has been warned\nReason: ${reason}\nTotal warns: ${data.warns.length}`
    });
  }
};
