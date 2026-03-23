// ULTIMATE GIVEAWAY BOT (ONE FILE PRO MAX)
// FULL FEATURES: buttons, join/leave, live counter, anti-duplicate, reroll, end, info

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

require('dotenv').config();
const ms = require('ms');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// STORAGE
const giveaways = new Map();
const participants = new Map();
const roleEntries = new Map();

client.once('ready', async () => {
  console.log(`🔥 ${client.user.tag} READY`);

  const commands = [
    new SlashCommandBuilder()
      .setName('giveaway-create')
      .setDescription('Create giveaway')
      .addStringOption(o => o.setName('time').setRequired(true))
      .addStringOption(o => o.setName('reward').setRequired(true))
      .addIntegerOption(o => o.setName('winners').setRequired(true))
      .addRoleOption(o => o.setName('role')),

    new SlashCommandBuilder()
      .setName('giveaway-end')
      .addStringOption(o => o.setName('id').setRequired(true)),

    new SlashCommandBuilder()
      .setName('giveaway-reroll')
      .addStringOption(o => o.setName('id').setRequired(true)),

    new SlashCommandBuilder()
      .setName('giveaway-info')
      .addStringOption(o => o.setName('id').setRequired(true))

  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ Admin only', ephemeral: true });
    }

    if (interaction.commandName === 'giveaway-create') {
      const time = interaction.options.getString('time');
      const reward = interaction.options.getString('reward');
      const winnersCount = interaction.options.getInteger('winners');
      const requiredRole = interaction.options.getRole('role');

      const duration = ms(time);
      const endTime = Date.now() + duration;

      const embed = buildEmbed(reward, winnersCount, endTime, requiredRole, 0);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('join').setLabel('🎉 Join').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('leave').setLabel('❌ Leave').setStyle(ButtonStyle.Danger)
      );

      const msg = await interaction.channel.send({ embeds: [embed], components: [row] });

      giveaways.set(msg.id, { reward, winnersCount, endTime, requiredRole, channelId: interaction.channel.id });
      participants.set(msg.id, new Set());

      interaction.reply({ content: '✅ Created', ephemeral: true });

      startCounter(msg.id);
      setTimeout(() => endGiveaway(msg.id), duration);
    }

    if (interaction.commandName === 'giveaway-end') {
      endGiveaway(interaction.options.getString('id'));
      interaction.reply({ content: '⏹ Ended', ephemeral: true });
    }

    if (interaction.commandName === 'giveaway-reroll') {
      reroll(interaction.options.getString('id'), interaction);
    }

    if (interaction.commandName === 'giveaway-info') {
      const id = interaction.options.getString('id');
      const list = participants.get(id);

      if (!list) return interaction.reply({ content: '❌ Not found', ephemeral: true });

      interaction.reply({ content: `👥 Participants: ${list.size}`, ephemeral: true });
    }
  }

  // BUTTONS
  if (interaction.isButton()) {
    const data = giveaways.get(interaction.message.id);
    if (!data) return;

    const users = participants.get(interaction.message.id);

    if (interaction.customId === 'join') {
      if (data.requiredRole && !interaction.member.roles.cache.has(data.requiredRole.id)) {
        return interaction.reply({ content: '❌ Missing role', ephemeral: true });
      }

      if (users.has(interaction.user.id)) {
        return interaction.reply({ content: '❌ Already joined', ephemeral: true });
      }

      users.add(interaction.user.id);
      interaction.reply({ content: '✅ Joined!', ephemeral: true });
    }

    if (interaction.customId === 'leave') {
      if (!users.has(interaction.user.id)) {
        return interaction.reply({ content: '❌ Not in giveaway', ephemeral: true });
      }

      users.delete(interaction.user.id);
      interaction.reply({ content: '❌ Left', ephemeral: true });
    }
  }
});

function buildEmbed(reward, winners, endTime, role, count) {
  return new EmbedBuilder()
    .setTitle('🎉 GIVEAWAY 🎉')
    .addFields(
      { name: '🎁 Reward', value: reward, inline: false },
      { name: '🏆 Winners', value: String(winners), inline: true },
      { name: '👥 Participants', value: String(count), inline: true },
      { name: '⏳ Ends', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: false },
      { name: '🔒 Required Role', value: role ? `<@&${role.id}>` : 'None', inline: false }
    )
    .setColor('Random');
}

async function startCounter(id) {
  const interval = setInterval(async () => {
    const data = giveaways.get(id);
    if (!data) return clearInterval(interval);

    const channel = await client.channels.fetch(data.channelId);
    const msg = await channel.messages.fetch(id);

    const count = participants.get(id).size;

    const embed = buildEmbed(data.reward, data.winnersCount, data.endTime, data.requiredRole, count);

    msg.edit({ embeds: [embed] });
  }, 5000);
}

async function endGiveaway(id) {
  const data = giveaways.get(id);
  if (!data) return;

    const channel = await client.channels.fetch(data.channelId);
    const users = Array.from(participants.get(id));

    if (users.length === 0) return channel.send('❌ No participants');

    const winners = [];
    for (let i = 0; i < data.winnersCount; i++) {
      const rand = users[Math.floor(Math.random() * users.length)];
      if (!winners.includes(rand)) winners.push(rand);
    }

    channel.send(`🎉 Winners: ${winners.map(id => `<@${id}>`).join(', ')}`);

    giveaways.delete(id);
    participants.delete(id);
}

async function reroll(id, interaction) {
  const data = giveaways.get(id);
  if (!data) return interaction.reply({ content: '❌ Not found', ephemeral: true });

  const users = Array.from(participants.get(id));
  if (users.length === 0) return interaction.reply({ content: '❌ No users', ephemeral: true });

  const winner = users[Math.floor(Math.random() * users.length)];

  interaction.channel.send(`🔄 New winner: <@${winner}>`);
  interaction.reply({ content: '✅ Rerolled', ephemeral: true });
}

client.login(process.env.TOKEN);
