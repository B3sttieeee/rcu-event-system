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
  SlashCommandBuilder
} = require('discord.js');

const mongoose = require('mongoose');
require('dotenv').config();
const ms = require('ms');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// ===== Mongo =====
mongoose.connect(process.env.MONGO_URI);

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
});

mongoose.connection.on('error', err => {
  console.error('❌ Mongo error:', err);
});

// ===== Schema =====
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

// ===== Role bonus =====
const roleEntries = new Map();

// ===== READY =====
client.once('ready', async () => {
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

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  restoreGiveaways();
});

// ===== INTERACTIONS =====
client.on('interactionCreate', async interaction => {

  // ===== SLASH =====
  if (interaction.isChatInputCommand()) {

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ Admin only', ephemeral: true });
    }

    // CREATE
    if (interaction.commandName === 'giveaway-create') {
      const time = interaction.options.getString('time');
      const reward = interaction.options.getString('reward');
      const winners = interaction.options.getInteger('winners');
      const role = interaction.options.getRole('role');

      const duration = ms(time);
      if (!duration) return interaction.reply({ content: '❌ Zły czas', ephemeral: true });

      const endTime = Date.now() + duration;

      const embed = buildEmbed(reward, winners, endTime, role, 0);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('join').setLabel('🎉 Join').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('leave').setLabel('❌ Leave').setStyle(ButtonStyle.Danger)
      );

      const msg = await interaction.channel.send({ embeds: [embed], components: [row] });

      await Giveaway.create({
        messageId: msg.id,
        channelId: msg.channel.id,
        reward,
        winners,
        endTime,
        requiredRole: role ? role.id : null,
        participants: []
      });

      interaction.reply({ content: '✅ Giveaway created', ephemeral: true });

      setTimeout(() => endGiveaway(msg.id), duration);
    }

    // ROLE BONUS
    if (interaction.commandName === 'giveaway-role') {
      const role = interaction.options.getRole('role');
      const entries = interaction.options.getInteger('entries');

      roleEntries.set(role.id, entries);

      interaction.reply({ content: '✅ Role updated', ephemeral: true });
    }

    // END
    if (interaction.commandName === 'giveaway-end') {
      endGiveaway(interaction.options.getString('id'));
      interaction.reply({ content: '⏹ Ended', ephemeral: true });
    }

    // REROLL
    if (interaction.commandName === 'giveaway-reroll') {
      reroll(interaction.options.getString('id'), interaction);
    }
  }

  // ===== BUTTONS =====
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

      interaction.reply({ content: '✅ Joined', ephemeral: true });
    }

    if (interaction.customId === 'leave') {
      data.participants = data.participants.filter(id => id !== interaction.user.id);
      await data.save();

      interaction.reply({ content: '❌ Left', ephemeral: true });
    }
  }
});

// ===== EMBED =====
function buildEmbed(reward, winners, endTime, role, count) {
  return new EmbedBuilder()
    .setTitle('🎉 GIVEAWAY 🎉')
    .setDescription(`🎁 **${reward}**`)
    .addFields(
      { name: '🏆 Winners', value: String(winners), inline: true },
      { name: '👥 Participants', value: String(count), inline: true },
      { name: '⏳ Ends', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: false },
      { name: '🔒 Role', value: role ? `<@&${role.id}>` : 'None', inline: false }
    )
    .setColor('Random');
}

// ===== END =====
async function endGiveaway(id) {
  const data = await Giveaway.findOne({ messageId: id });
  if (!data) return;

  const channel = await client.channels.fetch(data.channelId);
  const users = data.participants;

  if (users.length === 0) return channel.send('❌ No participants');

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
    new ButtonBuilder().setCustomId('ended').setLabel('Ended').setStyle(ButtonStyle.Secondary).setDisabled(true)
  );

  msg.edit({ components: [row] });

  channel.send(`🎉 Winners: ${winners.map(id => `<@${id}>`).join(', ')}`);

  await Giveaway.deleteOne({ messageId: id });
}

// ===== REROLL =====
async function reroll(id, interaction) {
  const data = await Giveaway.findOne({ messageId: id });
  if (!data) return interaction.reply({ content: '❌ Not found', ephemeral: true });

  const users = data.participants;
  if (users.length === 0) return interaction.reply({ content: '❌ No users', ephemeral: true });

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
