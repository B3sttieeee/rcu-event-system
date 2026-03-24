const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a user (timeout)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to mute')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('time')
        .setDescription('Time (e.g. 10m, 1h)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for mute')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const time = interaction.options.getString('time');
    const reason = interaction.options.getString('reason') || 'No reason';

    if (!member) {
      return interaction.reply({ content: '❌ User not found', ephemeral: true });
    }

    const duration = ms(time);
    if (!duration) {
      return interaction.reply({ content: '❌ Invalid time format', ephemeral: true });
    }

    try {
      await member.timeout(duration, reason);

      await interaction.reply({
        content: `🔇 ${member.user.tag} muted for ${time}\nReason: ${reason}`
      });

    } catch (err) {
      console.log(err);
      await interaction.reply({
        content: '❌ Cannot mute this user',
        ephemeral: true
      });
    }
  }
};
