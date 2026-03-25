const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const ms = require('ms');
const Giveaway = require('../models/Giveaway');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Create giveaway')
    .addStringOption(o =>
      o.setName('time').setDescription('1m / 1h').setRequired(true))
    .addStringOption(o =>
      o.setName('reward').setDescription('Reward').setRequired(true))
    .addIntegerOption(o =>
      o.setName('winners').setDescription('Winners').setRequired(true))
    .addRoleOption(o =>
      o.setName('bonus_role').setDescription('Bonus role'))
    .addRoleOption(o =>
      o.setName('required_role').setDescription('Required role')),

  async execute(interaction) {

    const time = interaction.options.getString('time');
    const reward = interaction.options.getString('reward');
    const winners = interaction.options.getInteger('winners');
    const bonusRole = interaction.options.getRole('bonus_role');
    const requiredRole = interaction.options.getRole('required_role');

    const duration = ms(time);
    if (!duration) return interaction.reply({ content: '❌ Invalid time', ephemeral: true });

    const data = {
      reward,
      winners,
      endTime: Date.now() + duration,
      participants: [],
      bonusRole: bonusRole?.id || null,
      requiredRole: requiredRole?.id || null
    };

    const embed = buildEmbed(data);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('gw_join').setLabel('Join').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('gw_leave').setLabel('Leave').setStyle(ButtonStyle.Secondary)
    );

    const msg = await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });

    await Giveaway.create({
      ...data,
      messageId: msg.id,
      channelId: msg.channel.id,
      guildId: interaction.guild.id
    });

    setTimeout(() => endGiveaway(msg.id), duration);

    interaction.reply({ content: '✅ Giveaway created', ephemeral: true });
  }
};

function buildEmbed(data) {
  return new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('🎉 Giveaway')
    .setDescription(`🎁 **${data.reward}**\n\nKliknij **Join**, aby wziąć udział`)
    .addFields(
      { name: '👥 Uczestnicy', value: `${data.participants.length}`, inline: true },
      { name: '🏆 Zwycięzcy', value: `${data.winners}`, inline: true },
      { name: '⏳ Koniec', value: `<t:${Math.floor(data.endTime / 1000)}:R>`, inline: true },
      { name: '🎟 Bonus', value: data.bonusRole ? `<@&${data.bonusRole}>` : 'Brak', inline: true },
      { name: '🔒 Rola', value: data.requiredRole ? `<@&${data.requiredRole}>` : 'Brak', inline: true }
    );
}

async function endGiveaway(id) {
  const data = await Giveaway.findOne({ messageId: id });
  if (!data || data.ended) return;

  data.ended = true;
  await data.save();

  const channel = await global.client.channels.fetch(data.channelId);

  if (!data.participants.length) {
    return channel.send('❌ No participants');
  }

  const winner = data.participants[Math.floor(Math.random() * data.participants.length)];

  channel.send(`🎉 Winner: <@${winner}>`);
}
