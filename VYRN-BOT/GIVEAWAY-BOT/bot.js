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

require('dotenv').config();
const mongoose = require('mongoose');
const ms = require('ms');

// ================= CLIENT =================
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================= CONFIG =================
const OFFICER_ROLE = "1475572271446884535";
const TICKET_GIF = "https://media.discordapp.net/attachments/1475993508535074816/1476584792048013312/Fallen-Knight-in-Burning-Forest.gif";

// ================= DB =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Mongo connected"))
  .catch(err => console.log("❌ Mongo error:", err));

// ================= SCHEMA =================
const giveawaySchema = new mongoose.Schema({
  messageId: String,
  channelId: String,
  reward: String,
  winners: Number,
  endTime: Number,
  participants: [String],
  ended: Boolean
});

const Giveaway = mongoose.model('Giveaway', giveawaySchema);

// ================= READY =================
client.once('clientReady', async () => {
  console.log(`🔥 ${client.user.tag} READY`);

  const commands = [
    new SlashCommandBuilder()
      .setName('giveaway-create')
      .setDescription('Create giveaway')
      .addStringOption(o => o.setName('time').setDescription('1m / 1h').setRequired(true))
      .addStringOption(o => o.setName('reward').setDescription('Reward').setRequired(true))
      .addIntegerOption(o => o.setName('winners').setDescription('Winners').setRequired(true)),

    new SlashCommandBuilder()
      .setName('ticket-panel')
      .setDescription('Create ticket panel')
      .addChannelOption(o => o.setName('channel').setDescription('Where panel').setRequired(true))
      .addChannelOption(o => o.setName('category').setDescription('Category').setRequired(true))
      .addStringOption(o => o.setName('title').setDescription('Title').setRequired(true))
      .addStringOption(o => o.setName('description').setDescription('Description').setRequired(true))
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

  restore();
});

// ================= EMBED =================
function createGiveawayEmbed(data) {
  return new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('🎉 GIVEAWAY')
    .setDescription(`🎁 **${data.reward}**\nKliknij 🎉 aby dołączyć!`)
    .addFields(
      { name: '👥 Uczestnicy', value: `${data.participants.length}`, inline: true },
      { name: '🏆 Zwycięzcy', value: `${data.winners}`, inline: true },
      { name: '⏳ Koniec', value: `<t:${Math.floor(data.endTime / 1000)}:R>`, inline: true }
    );
}

// ================= EVENTS =================
client.on('interactionCreate', async interaction => {
  try {

    // ===== COMMANDS =====
    if (interaction.isChatInputCommand()) {

      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Admin only', ephemeral: true });
      }

      // ===== GIVEAWAY =====
      if (interaction.commandName === 'giveaway-create') {

        const time = interaction.options.getString('time');
        const reward = interaction.options.getString('reward');
        const winners = interaction.options.getInteger('winners');

        if (!time || !reward || !winners) {
          return interaction.reply({ content: '❌ Missing data', ephemeral: true });
        }

        const duration = ms(time);
        if (!duration) {
          return interaction.reply({ content: '❌ Invalid time', ephemeral: true });
        }

        const data = {
          reward,
          winners,
          endTime: Date.now() + duration,
          participants: [],
          ended: false
        };

        const msg = await interaction.channel.send({
          embeds: [createGiveawayEmbed(data)],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('join')
                .setEmoji('🎉')
                .setStyle(ButtonStyle.Primary)
            )
          ]
        });

        await Giveaway.create({
          ...data,
          messageId: msg.id,
          channelId: msg.channel.id
        });

        setTimeout(() => endGiveaway(msg.id), duration);

        interaction.reply({ content: '✅ Giveaway created', ephemeral: true });
      }

      // ===== TICKET PANEL =====
      if (interaction.commandName === 'ticket-panel') {

        const channel = interaction.options.getChannel('channel');
        const category = interaction.options.getChannel('category');
        const title = interaction.options.getString('title');
        const desc = interaction.options.getString('description');

        if (!channel || !category || !title || !desc) {
          return interaction.reply({ content: '❌ Missing data', ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setColor('#2b2d31')
          .setTitle(`🎟 ${title}`)
          .setDescription(desc)
          .setImage(TICKET_GIF);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`ticket_${category.id}`)
            .setLabel('🔥 Open Ticket')
            .setStyle(ButtonStyle.Primary)
        );

        await channel.send({
          embeds: [embed],
          components: [row]
        });

        interaction.reply({ content: '✅ Panel created', ephemeral: true });
      }
    }

    // ===== BUTTONS =====
    if (interaction.isButton()) {

      // JOIN
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

      // OPEN TICKET
      if (interaction.customId.startsWith('ticket_')) {

        const categoryId = interaction.customId.split('_')[1];

        const ticket = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: ChannelType.GuildText,
          parent: categoryId,
          permissionOverwrites: [
            { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
            { id: OFFICER_ROLE, allow: [PermissionsBitField.Flags.ViewChannel] }
          ]
        });

        const embed = new EmbedBuilder()
          .setColor('#ff9900')
          .setTitle('🎟 Ticket')
          .setDescription(`👤 ${interaction.user}\nPodaj informacje.`)
          .setImage(TICKET_GIF);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('close').setLabel('🔒 Close').setStyle(ButtonStyle.Danger)
        );

        await ticket.send({
          content: `<@${interaction.user.id}> <@&${OFFICER_ROLE}>`,
          embeds: [embed],
          components: [row]
        });

        interaction.reply({ content: '✅ Ticket created', ephemeral: true });
      }

      if (interaction.customId === 'close') {
        interaction.channel.delete();
      }
    }

  } catch (err) {
    console.log("❌ ERROR:", err);
  }
});

// ================= END GIVEAWAY =================
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

  channel.send(`🎉 Winner: <@${winner}>`);
}

// ================= RESTORE =================
async function restore() {
  const all = await Giveaway.find();

  for (const g of all) {
    const left = g.endTime - Date.now();
    if (left > 0) setTimeout(() => endGiveaway(g.messageId), left);
    else endGiveaway(g.messageId);
  }
}

// ================= LOGIN =================
client.login(process.env.TOKEN);
