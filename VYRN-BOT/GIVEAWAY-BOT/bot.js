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
  intents: [GatewayIntentBits.Guilds]
});

// ===== MONGO =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(console.error);

// ===== SCHEMA =====
const giveawaySchema = new mongoose.Schema({
  messageId: String,
  channelId: String,
  reward: String,
  winners: Number,
  endTime: Number,
  requiredRole: String,
  participants: [String],
  ended: { type: Boolean, default: false }
});

const Giveaway = mongoose.model('Giveaway', giveawaySchema);
const roleEntries = new Map();

// ===== READY =====
client.once('clientReady', async () => {
  console.log(`🔥 ${client.user.tag} READY`);

  const commands = [
    new SlashCommandBuilder()
      .setName('giveaway-create')
      .setDescription('Create a giveaway')
      .addStringOption(o =>
        o.setName('time')
          .setDescription('Time e.g. 1m, 1h')
          .setRequired(true))
      .addStringOption(o =>
        o.setName('reward')
          .setDescription('Reward name')
          .setRequired(true))
      .addIntegerOption(o =>
        o.setName('winners')
          .setDescription('Number of winners')
          .setRequired(true))
      .addRoleOption(o =>
        o.setName('role')
          .setDescription('Required role')),

    new SlashCommandBuilder()
      .setName('giveaway-role')
      .setDescription('Set bonus entries')
      .addRoleOption(o =>
        o.setName('role')
          .setDescription('Role')
          .setRequired(true))
      .addIntegerOption(o =>
        o.setName('entries')
          .setDescription('Bonus entries')
          .setRequired(true))
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log("✅ Commands loaded");

  restore();
});

// ===== EMBED =====
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
Ends: <t:${Math.floor(data.endTime / 1000)}:R>

**Extra Entries:**
${extra}

**Required Role:**
${data.requiredRole ? `<@&${data.requiredRole}>` : 'None'}`
    );
}

// ===== INTERACTION =====
client.on('interactionCreate', async interaction => {
  try {

    if (interaction.isChatInputCommand()) {

      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Admin only', ephemeral: true });
      }

      if (interaction.commandName === 'giveaway-create') {

        const duration = ms(interaction.options.getString('time'));
        if (!duration) {
          return interaction.reply({ content: '❌ Invalid time', ephemeral: true });
        }

        const data = {
          reward: interaction.options.getString('reward'),
          winners: interaction.options.getInteger('winners'),
          endTime: Date.now() + duration,
          requiredRole: interaction.options.getRole('role')?.id || null,
          participants: [],
          ended: false
        };

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('join')
            .setEmoji('🎉')
            .setStyle(ButtonStyle.Primary)
        );

        const msg = await interaction.channel.send({
          embeds: [buildEmbed(data)],
          components: [row]
        });

        await Giveaway.create({
          ...data,
          messageId: msg.id,
          channelId: msg.channel.id
        });

        interaction.reply({ content: '✅ Giveaway created', ephemeral: true });

        setTimeout(() => endGiveaway(msg.id), duration);
      }

      if (interaction.commandName === 'giveaway-role') {
        roleEntries.set(
          interaction.options.getRole('role').id,
          interaction.options.getInteger('entries')
        );

        interaction.reply({ content: '✅ Bonus set', ephemeral: true });
      }
    }

    if (interaction.isButton()) {
      const data = await Giveaway.findOne({ messageId: interaction.message.id });
      if (!data) return;

      if (data.ended) {
        return interaction.reply({ content: '❌ Ended', ephemeral: true });
      }

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

// ===== END =====
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

  channel.send(`🎉 Winner: <@${winner}>`);
}

// ===== RESTORE =====
async function restore() {
  const all = await Giveaway.find();

  for (const g of all) {
    const left = g.endTime - Date.now();

    if (left > 0) setTimeout(() => endGiveaway(g.messageId), left);
    else endGiveaway(g.messageId);
  }
}

client.login(process.env.TOKEN);
