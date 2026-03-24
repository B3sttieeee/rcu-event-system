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

// ================== GIVEAWAY SCHEMA ==================
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

// ================== READY ==================
client.once('clientReady', async () => {
  console.log(`🔥 ${client.user.tag} READY`);

  const commands = [
    // GIVEAWAY
    new SlashCommandBuilder()
      .setName('giveaway-create')
      .setDescription('🎉 Create giveaway')
      .addStringOption(o => o.setName('time').setRequired(true))
      .addStringOption(o => o.setName('reward').setRequired(true))
      .addIntegerOption(o => o.setName('winners').setRequired(true))
      .addRoleOption(o => o.setName('role')),

    new SlashCommandBuilder()
      .setName('giveaway-role')
      .setDescription('🎟 Bonus entries')
      .addRoleOption(o => o.setName('role').setRequired(true))
      .addIntegerOption(o => o.setName('entries').setRequired(true)),

    new SlashCommandBuilder()
      .setName('giveaway-end')
      .setDescription('⏹ End giveaway')
      .addStringOption(o => o.setName('id').setRequired(true)),

    new SlashCommandBuilder()
      .setName('giveaway-reroll')
      .setDescription('🔄 Reroll')
      .addStringOption(o => o.setName('id').setRequired(true)),

    // TICKET PANEL (EDITABLE EMBED)
    new SlashCommandBuilder()
      .setName('ticket-panel')
      .setDescription('🎟 Create ticket panel')
      .addChannelOption(o => o.setName('channel').setRequired(true))
      .addChannelOption(o => o.setName('category').setRequired(true))
      .addRoleOption(o => o.setName('support').setRequired(true))
      .addStringOption(o => o.setName('title').setRequired(true))
      .addStringOption(o => o.setName('description').setRequired(true))
      .addStringOption(o => o.setName('image').setRequired(false))
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

  restore();
});

// ================== GIVEAWAY EMBED ==================
function buildEmbed(data) {
  let bonus = '❌ Brak bonusów';

  if (roleEntries.size > 0) {
    bonus = [...roleEntries.entries()]
      .map(([id, val]) => `<@&${id}> (+${val})`)
      .join('\n');
  }

  return new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('🎉 GIVEAWAY')
    .setDescription(`🎁 **${data.reward}**\n\nKliknij 🎉 aby dołączyć!`)
    .addFields(
      { name: '👥 Uczestnicy', value: `${data.participants.length}`, inline: true },
      { name: '🏆 Zwycięzcy', value: `${data.winners}`, inline: true },
      { name: '⏳ Koniec', value: `<t:${Math.floor(data.endTime / 1000)}:R>`, inline: true },
      { name: '🎟 Bonus', value: bonus, inline: false },
      { name: '🔒 Rola', value: data.requiredRole ? `<@&${data.requiredRole}>` : 'Brak', inline: false }
    );
}

// ================== INTERACTIONS ==================
client.on('interactionCreate', async interaction => {
  try {

    // ================== COMMANDS ==================
    if (interaction.isChatInputCommand()) {

      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Admin only', ephemeral: true });
      }

      // 🎉 CREATE GIVEAWAY
      if (interaction.commandName === 'giveaway-create') {
        const duration = ms(interaction.options.getString('time'));

        const data = {
          reward: interaction.options.getString('reward'),
          winners: interaction.options.getInteger('winners'),
          endTime: Date.now() + duration,
          requiredRole: interaction.options.getRole('role')?.id || null,
          participants: [],
          ended: false
        };

        const msg = await interaction.channel.send({
          embeds: [buildEmbed(data)],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('join').setEmoji('🎉').setStyle(ButtonStyle.Primary)
            )
          ]
        });

        await Giveaway.create({ ...data, messageId: msg.id, channelId: msg.channel.id });

        setTimeout(() => endGiveaway(msg.id), duration);

        interaction.reply({ content: '✅ Giveaway created', ephemeral: true });
      }

      // 🎟 BONUS ROLE
      if (interaction.commandName === 'giveaway-role') {
        roleEntries.set(
          interaction.options.getRole('role').id,
          interaction.options.getInteger('entries')
        );
        interaction.reply({ content: '✅ Bonus set', ephemeral: true });
      }

      // 🎟 TICKET PANEL
      if (interaction.commandName === 'ticket-panel') {

        const channel = interaction.options.getChannel('channel');
        const category = interaction.options.getChannel('category');
        const role = interaction.options.getRole('support');

        const embed = new EmbedBuilder()
          .setColor('#2b2d31')
          .setTitle(`🎟 ${interaction.options.getString('title')}`)
          .setDescription(interaction.options.getString('description'));

        const img = interaction.options.getString('image');
        if (img) embed.setImage(img);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`ticket_${category.id}_${role.id}`)
            .setLabel('🔥 Open Ticket')
            .setStyle(ButtonStyle.Primary)
        );

        await channel.send({ embeds: [embed], components: [row] });

        interaction.reply({ content: '✅ Panel wysłany', ephemeral: true });
      }
    }

    // ================== BUTTONS ==================
    if (interaction.isButton()) {

      // 🎉 JOIN GIVEAWAY
      if (interaction.customId === 'join') {
        const data = await Giveaway.findOne({ messageId: interaction.message.id });
        if (!data || data.ended) return;

        if (!data.participants.includes(interaction.user.id)) {
          data.participants.push(interaction.user.id);
          await data.save();
          interaction.reply({ content: '🎉 Joined!', ephemeral: true });
        } else {
          interaction.reply({ content: '❌ Already joined', ephemeral: true });
        }
      }

      // 🎟 OPEN TICKET
      if (interaction.customId.startsWith('ticket_')) {

        const [, categoryId, roleId] = interaction.customId.split('_');

        const ticket = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: ChannelType.GuildText,
          parent: categoryId,
          permissionOverwrites: [
            { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
            { id: roleId, allow: [PermissionsBitField.Flags.ViewChannel] }
          ]
        });

        const embed = new EmbedBuilder()
          .setColor('#ff9900')
          .setTitle('🎟 Ticket')
          .setDescription(`👤 ${interaction.user}\n\nProszę podać wszystkie wymagane informacje.`);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('close').setLabel('🔒 Close').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('claim').setLabel('🧑‍💼 Claim').setStyle(ButtonStyle.Success)
        );

        ticket.send({
          content: `<@${interaction.user.id}> <@&${roleId}>`,
          embeds: [embed],
          components: [row]
        });

        interaction.reply({ content: '✅ Ticket created', ephemeral: true });
      }

      // 🔒 CLOSE
      if (interaction.customId === 'close') {
        interaction.channel.delete();
      }

      // 🧑‍💼 CLAIM
      if (interaction.customId === 'claim') {
        interaction.reply(`🧑‍💼 Claimed by ${interaction.user}`);
      }
    }

  } catch (err) {
    console.error(err);
  }
});

// ================== END GIVEAWAY ==================
async function endGiveaway(id) {
  const data = await Giveaway.findOne({ messageId: id });
  if (!data || data.ended) return;

  data.ended = true;
  await data.save();

  const channel = await client.channels.fetch(data.channelId);

  if (!data.participants.length) {
    return channel.send('❌ Brak uczestników');
  }

  const winner = data.participants[Math.floor(Math.random() * data.participants.length)];

  // PUBLIC
  channel.send(`🎉 Winner: <@${winner}>`);

  // PRIVATE CHANNEL
  const winChannel = await channel.guild.channels.create({
    name: `🎉-${data.reward}`,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      { id: channel.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: winner, allow: [PermissionsBitField.Flags.ViewChannel] }
    ]
  });

  winChannel.send(`🎉 Gratulacje <@${winner}>!\nNagroda: ${data.reward}`);
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
