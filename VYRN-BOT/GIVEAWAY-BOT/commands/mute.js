const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute user')
    .addUserOption(o => o.setName('user').setRequired(true))
    .addStringOption(o => o.setName('time').setRequired(true))
    .addStringOption(o => o.setName('reason').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const time = interaction.options.getString('time');
    const reason = interaction.options.getString('reason') || "No reason";

    const duration = ms(time);
    if (!duration) return interaction.reply("❌ Invalid time");

    await member.timeout(duration, reason);

    interaction.reply(`🔇 ${member.user.tag} muted for ${time}`);
  }
};
