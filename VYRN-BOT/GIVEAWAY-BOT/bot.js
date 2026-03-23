// PRO MAX GIVEAWAY BOT (SINGLE FILE, ADVANCED)
// Features:
// - Buttons (join/leave)
// - Weighted entries (roles)
// - MongoDB persistence
// - Disable buttons after end
// - Auto reroll system
// - Claim timeout
// - Clean embeds

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

// ===== DB =====
mongoose.connect(process.env.MONGO_URI);

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

const roleEntries = new Map();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', async () => {
  console.log(`🔥 ${client.user.tag} PRO MAX READY`);

  const commands = [
    new SlashCommandBuilder()
      .setName('giveaway-create')
      .addStringOption(o => o.setName('time').setRequired(true))
      .addStringOption(o => o.setName('reward').setRequired(true))
      .addIntegerOption(o => o.setName('winners').setRequired(true))
      .addRoleOption(o => o.setName('role')),

    new SlashCommandBuilder()
      .setName('giveaway-role')
      .addRoleOption(o => o.setName('role').setRequired(true))
      .addIntegerOption(o => o.setName('entries').setRequired(true)),

    new SlashCommandBuilder()
      .setName('giveaway-end')
      .addStringOption(o => o.setName('id').setRequired(true)),

    new SlashCommandBuilder()
      .setName('giveaway-reroll')
      .addStringOption(o => o.setName('id').setRequired(true))

  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

  restoreGiveaways();
});

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

      interaction.reply({ content: '✅ Created', ephemeral: true });

      setTimeout(() => endGiveaway(msg.id), duration);
    }

    if (interaction.commandName === 'giveaway-role') {
      const role = interaction.options.getRole('role');
      const entries = interaction.options.getInteger('entries');

      roleEntries.set(role.id, entries);
      interaction.reply({ content: '✅ Role updated', ephemeral: true });
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

      interaction.reply({ content: '✅ Joined', ephemeral: true });
    }

    if (interaction.customId === 'leave') {
      data.participants = data.participants.filter(id => id !== interaction.user.id);
      await data.save();

      interaction.reply({ content: '❌ Left', ephemeral: true });
    }
  }
});

function buildEmbed(reward, winners, endTime, role, count) {
  return new EmbedBuilder()
    .setTitle('🎉 GIVEAWAY 🎉')
    .setDescription(`🎁 **${reward}**\n🏆 Winners: ${winners}`)
    .addFields(
      { name: '👥 Participants', value: String(count), inline: true },
      { name: '⏳ Ends', value: `<t:${Math.floor(endTime/1000)}:R>`, inline: true },
      { name: '🔒 Role', value: role ? `<@&${role.id}>` : 'None', inline: false }
    )
    .setColor('Random');
}

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

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ended').setLabel('Ended').setStyle(ButtonStyle.Secondary).setDisabled(true)
  );

  const msg = await channel.messages.fetch(id);
  msg.edit({ components: [row] });

  channel.send(`🎉 Winners: ${winners.map(id => `<@${id}>`).join(', ')}`);

  setTimeout(() => autoReroll(channel, users, winners), 86400000);

  await Giveaway.deleteOne({ messageId: id });
}

async function reroll(id, interaction) {
  const data = await Giveaway.findOne({ messageId: id });
  if (!data) return interaction.reply({ content: '❌ Not found', ephemeral: true });

  const users = data.participants;
  const winner = users[Math.floor(Math.random() * users.length)];

  interaction.channel.send(`🔄 New winner: <@${winner}>`);
  interaction.reply({ content: '✅ Rerolled', ephemeral: true });
}

function autoReroll(channel, users, oldWinners) {
  const remaining = users.filter(u => !oldWinners.includes(u));
  if (remaining.length === 0) return;

  const newWinner = remaining[Math.floor(Math.random() * remaining.length)];
  channel.send(`⏰ Auto reroll winner: <@${newWinner}>`);
}

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
