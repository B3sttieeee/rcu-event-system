const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType
} = require('discord.js');

const mongoose = require('mongoose');
require('dotenv').config();
const ms = require('ms');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// ===== MONGO =====
mongoose.connect(process.env.MONGO_URI);

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
});

// ===== SCHEMA =====
const giveawaySchema = new mongoose.Schema({
  messageId: String,
  channelId: String,
  reward: String,
  winners: Number,
  endTime: Number,
  requiredRole: String,
  participants: [String]
});

const Giveaway = mongoose.model('Giveaway', giveawaySchema);

// ===== ROLE BONUS =====
const roleEntries = new Map();

// ===== READY =====
client.once('clientReady', async () => {
  console.log(`🔥 ${client.user.tag} READY`);

  const commands = [
    new SlashCommandBuilder()
      .setName('giveaway-create')
      .setDescription('Create giveaway')
      .addStringOption(o =>
        o.setName('time').setDescription('np 1m, 1h').setRequired(true))
      .addStringOption(o =>
        o.setName('reward').setDescription('Nagroda').setRequired(true))
      .addIntegerOption(o =>
        o.setName('winners').setDescription('Ilość zwycięzców').setRequired(true))
      .addRoleOption(o =>
        o.setName('role').setDescription('Wymagana rola')),

    new SlashCommandBuilder()
      .setName('giveaway-role')
      .setDescription('Set bonus entries')
      .addRoleOption(o =>
        o.setName('role').setDescription('Rola').setRequired(true))
      .addIntegerOption(o =>
        o.setName('entries').setDescription('Ile wejść').setRequired(true)),

    new SlashCommandBuilder()
      .setName('giveaway-end')
      .setDescription('End giveaway')
      .addStringOption(o =>
        o.setName('id').setDescription('ID wiadomości').setRequired(true)),

    new SlashCommandBuilder()
      .setName('giveaway-reroll')
      .setDescription('Reroll giveaway')
      .addStringOption(o =>
        o.setName('id').setDescription('ID wiadomości').setRequired(true))
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

  restoreGiveaways();
});

// ===== EMBED BUILDER =====
function buildEmbed(data) {
  let bonus = 'Brak';
  if (roleEntries.size > 0) {
    bonus = [...roleEntries.entries()]
      .map(([id, val]) => `• <@&${id}> → **+${val} entries**`)
      .join('\n');
  }

  return new EmbedBuilder()
    .setTitle('🎉 **GIVEAWAY** 🎉')
    .setDescription(`**🎁 Nagroda:**\n> ${data.reward}`)
    .addFields(
      { name: '🏆 **Winners**', value: `\`${data.winners}\``, inline: true },
      { name: '👥 **Participants**', value: `\`${data.participants.length}\``, inline: true },
      { name: '⏳ **Ends**', value: `<t:${Math.floor(data.endTime / 1000)}:R>`, inline: false },
      { name: '🔒 **Required Role**', value: data.requiredRole ? `<@&${data.requiredRole}>` : '`Brak`' },
      { name: '🎟 **Bonus Roles**', value: bonus }
    )
    .setColor('#ff4d6d')
    .setFooter({ text: 'Kliknij przycisk poniżej aby wziąć udział!' });
}

// ===== INTERACTIONS =====
client.on('interactionCreate', async interaction => {

  if (interaction.isChatInputCommand()) {

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ Admin only', ephemeral: true });
    }

    if (interaction.commandName === 'giveaway-create') {
      const time = interaction.options.getString('time');
      const reward = interaction.options.getString('reward');
      const winners = interaction.options.getInteger('winners');
      const role = interaction.options.getRole('role');

      const duration = ms(time);
      const endTime = Date.now() + duration;

      const data = {
        reward,
        winners,
        endTime,
        requiredRole: role ? role.id : null,
        participants: []
      };

      const embed = buildEmbed(data);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('join').setLabel('🎉 Join').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('leave').setLabel('❌ Leave').setStyle(ButtonStyle.Danger)
      );

      const msg = await interaction.channel.send({ embeds: [embed], components: [row] });

      await Giveaway.create({
        ...data,
        messageId: msg.id,
        channelId: msg.channel.id
      });

      interaction.reply({ content: '✅ Giveaway created', ephemeral: true });

      setTimeout(() => endGiveaway(msg.id), duration);
    }

    if (interaction.commandName === 'giveaway-role') {
      const role = interaction.options.getRole('role');
      const entries = interaction.options.getInteger('entries');

      roleEntries.set(role.id, entries);

      interaction.reply({ content: '✅ Role bonus set', ephemeral: true });
    }

    if (interaction.commandName === 'giveaway-end') {
      endGiveaway(interaction.options.getString('id'));
      interaction.reply({ content: '⏹ Ended', ephemeral: true });
    }

    if (interaction.commandName === 'giveaway-reroll') {
      reroll(interaction.options.getString('id'), interaction);
    }
  }

  if (interaction.isButton()) {
    const data = await Giveaway.findOne({ messageId: interaction.message.id });
    if (!data) return;

    if (data.requiredRole && !interaction.member.roles.cache.has(data.requiredRole)) {
      return interaction.reply({ content: '❌ Missing role', ephemeral: true });
    }

    if (interaction.customId === 'join') {
      if (data.participants.includes(interaction.user.id)) {
        return interaction.reply({ content: '❌ Already joined', ephemeral: true });
      }

      data.participants.push(interaction.user.id);
      await data.save();

      updateMessage(interaction.message, data);

      interaction.reply({ content: '✅ Joined', ephemeral: true });
    }

    if (interaction.customId === 'leave') {
      data.participants = data.participants.filter(id => id !== interaction.user.id);
      await data.save();

      updateMessage(interaction.message, data);

      interaction.reply({ content: '❌ Left', ephemeral: true });
    }
  }
});

// ===== UPDATE EMBED =====
async function updateMessage(msg, data) {
  const embed = buildEmbed(data);
  msg.edit({ embeds: [embed] });
}

// ===== END =====
async function endGiveaway(id) {
  const data = await Giveaway.findOne({ messageId: id });
  if (!data) return;

  const channel = await client.channels.fetch(data.channelId);

  const users = data.participants;
  if (users.length === 0) return channel.send('❌ Brak uczestników');

  let pool = [];

  for (const userId of users) {
    const member = await channel.guild.members.fetch(userId);

    let weight = 1;
    member.roles.cache.forEach(r => {
      if (roleEntries.has(r.id)) weight += roleEntries.get(r.id);
    });

    for (let i = 0; i < weight; i++) pool.push(userId);
  }

  const winners = [];
  while (winners.length < data.winners && pool.length > 0) {
    const rand = pool[Math.floor(Math.random() * pool.length)];
    if (!winners.includes(rand)) winners.push(rand);
  }

  const msg = await channel.messages.fetch(id);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ended').setLabel('ENDED').setDisabled(true).setStyle(ButtonStyle.Secondary)
  );

  msg.edit({ components: [row] });

  channel.send(`🎉 **Winners:** ${winners.map(id => `<@${id}>`).join(', ')}`);

  // ===== CREATE PRIVATE CHANNEL =====
  const winnerChannel = await channel.guild.channels.create({
    name: `🎉-winner-${Date.now()}`,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      { id: channel.guild.roles.everyone.id, deny: ['ViewChannel'] },
      ...winners.map(id => ({
        id,
        allow: ['ViewChannel', 'SendMessages']
      }))
    ]
  });

  winnerChannel.send(`🎉 Gratulacje ${winners.map(id => `<@${id}>`).join(', ')}!\nOdbierz nagrodę tutaj.`);

  await Giveaway.deleteOne({ messageId: id });
}

// ===== REROLL =====
async function reroll(id, interaction) {
  const data = await Giveaway.findOne({ messageId: id });
  if (!data) return interaction.reply({ content: '❌ Not found', ephemeral: true });

  const users = data.participants;
  const winner = users[Math.floor(Math.random() * users.length)];

  interaction.channel.send(`🔄 New winner: <@${winner}>`);
  interaction.reply({ content: '✅ Rerolled', ephemeral: true });
}

// ===== RESTORE =====
async function restoreGiveaways() {
  const all = await Giveaway.find();

  for (const g of all) {
    const remaining = g.endTime - Date.now();

    if (remaining > 0) {
      setTimeout(() => endGiveaway(g.messageId), remaining);
    } else {
      endGiveaway(g.messageId);
    }
  }
}

client.login(process.env.TOKEN);
