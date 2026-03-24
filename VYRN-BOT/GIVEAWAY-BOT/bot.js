// ================== IMPORTS ==================
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

// ================== CLIENT ==================
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================== DB ==================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Mongo connected"))
  .catch(console.error);

// ================== SCHEMA ==================
const giveawaySchema = new mongoose.Schema({
  messageId: String,
  channelId: String,
  reward: String,
  winners: Number,
  endTime: Number,
  requiredRole: String,
  participants: [String],
  ended: Boolean
});

const Giveaway = mongoose.model('Giveaway', giveawaySchema);

// ================== MEMORY ==================
const roleEntries = new Map();
const intervals = new Map();

// ================== READY ==================
client.once('clientReady', async () => {
  console.log(`🔥 ${client.user.tag} READY`);

  const commands = [
    new SlashCommandBuilder()
      .setName('giveaway-create')
      .setDescription('Create giveaway')
      .addStringOption(o => o.setName('time').setDescription('1m / 1h').setRequired(true))
      .addStringOption(o => o.setName('reward').setDescription('Reward').setRequired(true))
      .addIntegerOption(o => o.setName('winners').setDescription('Winners').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Required role')),

    new SlashCommandBuilder()
      .setName('giveaway-role')
      .setDescription('Set bonus entries')
      .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true))
      .addIntegerOption(o => o.setName('entries').setDescription('Entries').setRequired(true)),

    new SlashCommandBuilder()
      .setName('giveaway-end')
      .setDescription('End giveaway')
      .addStringOption(o => o.setName('id').setDescription('Message ID').setRequired(true)),

    new SlashCommandBuilder()
      .setName('giveaway-reroll')
      .setDescription('Reroll winner')
      .addStringOption(o => o.setName('id').setDescription('Message ID').setRequired(true)),

    new SlashCommandBuilder()
      .setName('giveaway-list')
      .setDescription('List giveaways')
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

  restore();
});

// ================== EMBED ==================
function buildEmbed(data) {
  let extra = 'No extra entries';

  if (roleEntries.size > 0) {
    extra = [...roleEntries.entries()]
      .map(([id, val]) => `<@&${id}> • ${val} entries`)
      .join('\n');
  }

  return new EmbedBuilder()
    .setColor('#2b2d31')
    .setDescription(
`**${data.reward}**

Click 🎉 to enter
Winners: **${data.winners}**
Participants: **${data.participants.length}**
Ends: <t:${Math.floor(data.endTime / 1000)}:R>

**Extra Entries:**
${extra}

**Required Role:**
${data.requiredRole ? `<@&${data.requiredRole}>` : 'None'}`
    );
}

// ================== LIVE UPDATE ==================
function startLiveUpdate(message, data) {
  const interval = setInterval(async () => {
    const updated = await Giveaway.findOne({ messageId: data.messageId });
    if (!updated || updated.ended) {
      clearInterval(interval);
      return;
    }

    message.edit({ embeds: [buildEmbed(updated)] }).catch(() => {});
  }, 5000);

  intervals.set(data.messageId, interval);
}

// ================== INTERACTIONS ==================
client.on('interactionCreate', async interaction => {
  try {

    if (interaction.isChatInputCommand()) {

      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Admin only', ephemeral: true });
      }

      if (interaction.commandName === 'giveaway-create') {
        const duration = ms(interaction.options.getString('time'));
        if (!duration) return interaction.reply({ content: '❌ Bad time', ephemeral: true });

        const data = {
          reward: interaction.options.getString('reward'),
          winners: interaction.options.getInteger('winners'),
          endTime: Date.now() + duration,
          requiredRole: interaction.options.getRole('role')?.id || null,
          participants: [],
          ended: false
        };

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('join').setEmoji('🎉').setStyle(ButtonStyle.Primary)
        );

        const msg = await interaction.channel.send({
          embeds: [buildEmbed(data)],
          components: [row]
        });

        await Giveaway.create({ ...data, messageId: msg.id, channelId: msg.channel.id });

        startLiveUpdate(msg, { ...data, messageId: msg.id });

        setTimeout(() => endGiveaway(msg.id), duration);

        interaction.reply({ content: '✅ Created', ephemeral: true });
      }

      if (interaction.commandName === 'giveaway-role') {
        roleEntries.set(
          interaction.options.getRole('role').id,
          interaction.options.getInteger('entries')
        );
        interaction.reply({ content: '✅ Bonus set', ephemeral: true });
      }

      if (interaction.commandName === 'giveaway-end') {
        endGiveaway(interaction.options.getString('id'));
        interaction.reply({ content: '⏹ Ended', ephemeral: true });
      }

      if (interaction.commandName === 'giveaway-reroll') {
        reroll(interaction.options.getString('id'), interaction);
      }

      if (interaction.commandName === 'giveaway-list') {
        const all = await Giveaway.find();
        interaction.reply({
          content: all.map(g => `🎁 ${g.reward} | ID: ${g.messageId}`).join('\n') || 'Brak',
          ephemeral: true
        });
      }
    }

    if (interaction.isButton()) {
      const data = await Giveaway.findOne({ messageId: interaction.message.id });
      if (!data || data.ended) return;

      if (data.requiredRole && !interaction.member.roles.cache.has(data.requiredRole)) {
        return interaction.reply({ content: '❌ Missing role', ephemeral: true });
      }

      if (!data.participants.includes(interaction.user.id)) {
        data.participants.push(interaction.user.id);
        await data.save();
        interaction.reply({ content: '🎉 Joined!', ephemeral: true });
      } else {
        interaction.reply({ content: '❌ Already joined', ephemeral: true });
      }
    }

  } catch (err) {
    console.error(err);
  }
});

// ================== END ==================
async function endGiveaway(id) {
  const data = await Giveaway.findOne({ messageId: id });
  if (!data || data.ended) return;

  data.ended = true;
  await data.save();

  const channel = await client.channels.fetch(data.channelId);

  if (!data.participants.length) {
    return channel.send('❌ No participants');
  }

  const winner = data.participants[Math.floor(Math.random() * data.participants.length)];

  // 🔥 CHANNEL NAME = REWARD
  const cleanName = data.reward.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 20);

  const winChannel = await channel.guild.channels.create({
    name: `win-${cleanName}`,
    type: ChannelType.GuildText
  });

  winChannel.send(`🎉 Winner: <@${winner}> | Prize: ${data.reward}`);
}

// ================== REROLL ==================
async function reroll(id, interaction) {
  const data = await Giveaway.findOne({ messageId: id });
  if (!data) return;

  const winner = data.participants[Math.floor(Math.random() * data.participants.length)];
  interaction.channel.send(`🔄 New winner: <@${winner}>`);
}

// ================== RESTORE ==================
async function restore() {
  const all = await Giveaway.find();

  for (const g of all) {
    const left = g.endTime - Date.now();

    if (left > 0) setTimeout(() => endGiveaway(g.messageId), left);
    else endGiveaway(g.messageId);
  }
}

// ================== LOGIN ==================
client.login(process.env.TOKEN);
