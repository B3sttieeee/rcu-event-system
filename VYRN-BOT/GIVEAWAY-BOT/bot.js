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

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

mongoose.connect(process.env.MONGO_URI).catch(console.error);

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

client.once('clientReady', async () => {
  console.log(`🔥 ${client.user.tag} READY`);

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

  restore();
});

// ===== 💎 PERFECT EMBED =====
function buildEmbed(data) {
  let bonus = 'Brak';
  if (roleEntries.size > 0) {
    bonus = [...roleEntries.entries()]
      .map(([id, val]) => `<@&${id}> +${val}`)
      .join('\n');
  }

  return new EmbedBuilder()
    .setColor('#5865F2')

    // 🔥 DUŻA NAGRODA
    .setTitle(`🎉 ${data.reward}`)

    // 🧼 CZYSTY OPIS
    .setDescription(
      `Dołącz klikając przycisk poniżej\n\u200B`
    )

    // 📊 STATY (ŁADNE ODSTĘPY)
    .addFields(
      {
        name: '👥 Uczestnicy',
        value: `**${data.participants.length} osób**`,
        inline: true
      },
      {
        name: '🏆 Zwycięzcy',
        value: `**${data.winners}**`,
        inline: true
      },
      {
        name: '⏳ Koniec',
        value: `<t:${Math.floor(data.endTime / 1000)}:R>`,
        inline: true
      },

      // ODSTĘP
      {
        name: '\u200B',
        value: '\u200B'
      },

      {
        name: '🎟 Bonusowe szanse',
        value: bonus,
        inline: true
      },
      {
        name: '🔒 Wymagana rola',
        value: data.requiredRole ? `<@&${data.requiredRole}>` : 'Brak',
        inline: true
      }
    );
}

// ===== LOGIC =====
client.on('interactionCreate', async interaction => {
  try {

    if (interaction.isChatInputCommand()) {

      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Admin only', ephemeral: true });
      }

      if (interaction.commandName === 'giveaway-create') {
        const duration = ms(interaction.options.getString('time'));
        const reward = interaction.options.getString('reward');
        const winners = interaction.options.getInteger('winners');
        const role = interaction.options.getRole('role');

        const data = {
          reward,
          winners,
          endTime: Date.now() + duration,
          requiredRole: role?.id || null,
          participants: [],
          ended: false
        };

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('join').setLabel('Join').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('leave').setLabel('Leave').setStyle(ButtonStyle.Secondary)
        );

        const msg = await interaction.channel.send({
          embeds: [buildEmbed(data)],
          components: [row]
        });

        await Giveaway.create({ ...data, messageId: msg.id, channelId: msg.channel.id });

        interaction.reply({ content: '✅ Created', ephemeral: true });

        setTimeout(() => end(msg.id), duration);
      }

      if (interaction.commandName === 'giveaway-role') {
        roleEntries.set(
          interaction.options.getRole('role').id,
          interaction.options.getInteger('entries')
        );
        interaction.reply({ content: '✅ Bonus set', ephemeral: true });
      }

      if (interaction.commandName === 'giveaway-end') {
        end(interaction.options.getString('id'));
        interaction.reply({ content: '⏹ Ended', ephemeral: true });
      }

      if (interaction.commandName === 'giveaway-reroll') {
        reroll(interaction.options.getString('id'), interaction);
      }
    }

    if (interaction.isButton()) {
      const data = await Giveaway.findOne({ messageId: interaction.message.id });
      if (!data) return;

      if (data.ended) return interaction.reply({ content: '❌ Zakończony', ephemeral: true });

      if (data.requiredRole && !interaction.member.roles.cache.has(data.requiredRole)) {
        return interaction.reply({ content: '❌ Brak roli', ephemeral: true });
      }

      if (interaction.customId === 'join') {
        if (data.participants.includes(interaction.user.id)) {
          return interaction.reply({ content: '❌ Już jesteś', ephemeral: true });
        }

        data.participants.push(interaction.user.id);
        await data.save();

        interaction.message.edit({ embeds: [buildEmbed(data)] });
        interaction.reply({ content: '✅ Dołączono', ephemeral: true });
      }

      if (interaction.customId === 'leave') {
        data.participants = data.participants.filter(id => id !== interaction.user.id);
        await data.save();

        interaction.message.edit({ embeds: [buildEmbed(data)] });
        interaction.reply({ content: '❌ Opuściłeś', ephemeral: true });
      }
    }

  } catch (err) {
    console.error(err);
  }
});

// ===== END =====
async function end(id) {
  const data = await Giveaway.findOne({ messageId: id });
  if (!data || data.ended) return;

  data.ended = true;
  await data.save();

  const channel = await client.channels.fetch(data.channelId);

  if (!data.participants.length) {
    return channel.send('❌ Brak uczestników');
  }

  const winner = data.participants[Math.floor(Math.random() * data.participants.length)];

  channel.send(`🎉 Winner: <@${winner}>`);
}

// ===== REROLL =====
async function reroll(id, interaction) {
  const data = await Giveaway.findOne({ messageId: id });
  if (!data) return;

  const winner = data.participants[Math.floor(Math.random() * data.participants.length)];
  interaction.channel.send(`🔄 New winner: <@${winner}>`);
}

// ===== RESTORE =====
async function restore() {
  const all = await Giveaway.find();

  for (const g of all) {
    const left = g.endTime - Date.now();
    if (left > 0) setTimeout(() => end(g.messageId), left);
    else end(g.messageId);
  }
}

client.login(process.env.TOKEN);
