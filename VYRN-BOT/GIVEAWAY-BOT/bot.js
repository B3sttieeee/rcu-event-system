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

// ===== CLIENT =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== MONGO =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error(err));

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

// ===== ROLE BONUS =====
const roleEntries = new Map();

// ===== READY =====
client.once('clientReady', async () => {
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
      .setName('giveaway-role')
      .setDescription('Set bonus entries')
      .addRoleOption(o => o.setName('role').setRequired(true))
      .addIntegerOption(o => o.setName('entries').setRequired(true))
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

  restore();
});

// ===== EMBED (GIVEAWAYBOT STYLE) =====
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

// ===== INTERACTIONS =====
client.on('interactionCreate', async interaction => {
  try {

    // ===== COMMANDS =====
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
        if (!duration) {
          return interaction.reply({ content: '❌ Invalid time', ephemeral: true });
        }

        const data = {
          reward,
          winners,
          endTime: Date.now() + duration,
          requiredRole: role?.id || null,
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
        const role = interaction.options.getRole('role');
        const entries = interaction.options.getInteger('entries');

        roleEntries.set(role.id, entries);

        interaction.reply({ content: '✅ Bonus entries set', ephemeral: true });
      }
    }

    // ===== BUTTON =====
    if (interaction.isButton()) {
      const data = await Giveaway.findOne({ messageId: interaction.message.id });
      if (!data) return;

      if (data.ended) {
        return interaction.reply({ content: '❌ Giveaway ended', ephemeral: true });
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

// ===== END GIVEAWAY =====
async function endGiveaway(id) {
  const data = await Giveaway.findOne({ messageId: id });
  if (!data || data.ended) return;

  data.ended = true;
  await data.save();

  const channel = await client.channels.fetch(data.channelId);

  if (data.participants.length === 0) {
    return channel.send('❌ No participants');
  }

  const winner = data.participants[Math.floor(Math.random() * data.participants.length)];

  channel.send(`🎉 Winner: <@${winner}>`);
}

// ===== RESTORE =====
async function restore() {
  const giveaways = await Giveaway.find();

  for (const g of giveaways) {
    const remaining = g.endTime - Date.now();

    if (remaining > 0) {
      setTimeout(() => endGiveaway(g.messageId), remaining);
    } else {
      endGiveaway(g.messageId);
    }
  }
}

// ===== LOGIN =====
client.login(process.env.TOKEN);
