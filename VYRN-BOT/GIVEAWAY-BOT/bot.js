```js
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

// ===== IMPORTY =====
const config = require('./config');
const Giveaway = require('./models/Giveaway');
const Panel = require('./models/Panel');

// ===== CLIENT =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== DB =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Mongo connected"))
  .catch(err => console.log(err));

// ===== READY =====
client.once('clientReady', async () => {
  console.log(`🔥 ${client.user.tag} READY`);

  const commands = [
    new SlashCommandBuilder()
      .setName('giveaway-create')
      .setDescription('Create giveaway')
      .addStringOption(o =>
        o.setName('time')
          .setDescription('Time e.g. 1m / 1h')
          .setRequired(true))
      .addStringOption(o =>
        o.setName('reward')
          .setDescription('Reward')
          .setRequired(true))
      .addIntegerOption(o =>
        o.setName('winners')
          .setDescription('Number of winners')
          .setRequired(true))
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

  createPanel();
  restoreGiveaways();
});

// ===== PANEL =====
async function createPanel() {
  const channel = await client.channels.fetch(config.PANEL_CHANNEL).catch(() => null);
  if (!channel) return;

  let data = await Panel.findOne({ guildId: channel.guild.id });

  const embed = new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('🎟 Clan TICKET')
    .setDescription(`
📌 **The Join Clan ticket is used to review your application and verify your account before you become a member.**

📋 **Requirement:**
• Good Gamepasses for Eggs!!
• 1.5N+ Rebirth
• Min 3-5H Active
• Min 15M Eggs
`)
    .setImage(config.IMAGE);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('open_ticket')
      .setLabel('🔥 Open Ticket')
      .setStyle(ButtonStyle.Primary)
  );

  try {
    const msg = await channel.messages.fetch(data?.messageId);
    await msg.edit({ embeds: [embed], components: [row] });
  } catch {
    const msg = await channel.send({ embeds: [embed], components: [row] });

    if (!data) {
      await Panel.create({
        guildId: channel.guild.id,
        messageId: msg.id
      });
    } else {
      data.messageId = msg.id;
      await data.save();
    }
  }
}

// ===== GIVEAWAY EMBED =====
function giveawayEmbed(data) {
  return new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('🎉 GIVEAWAY')
    .setDescription(`🎁 **${data.reward}**\nKliknij 🎉 aby dołączyć`)
    .addFields(
      { name: '👥 Uczestnicy', value: `${data.participants.length}`, inline: true },
      { name: '🏆 Zwycięzcy', value: `${data.winners}`, inline: true },
      { name: '⏳ Koniec', value: `<t:${Math.floor(data.endTime / 1000)}:R>`, inline: true }
    );
}

// ===== EVENTS =====
client.on('interactionCreate', async interaction => {
  try {

    // ===== SLASH COMMAND =====
    if (interaction.isChatInputCommand()) {

      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Admin only', ephemeral: true });
      }

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
          embeds: [giveawayEmbed(data)],
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
    }

    // ===== BUTTONS =====
    if (interaction.isButton()) {

      // JOIN GIVEAWAY
      if (interaction.customId === 'join') {
        const data = await Giveaway.findOne({ messageId: interaction.message.id });
        if (!data || data.ended) return;

        if (!data.participants.includes(interaction.user.id)) {
          data.participants.push(interaction.user.id);
          await data.save();

          // update embed
          await interaction.message.edit({
            embeds: [giveawayEmbed(data)]
          });

          interaction.reply({ content: '🎉 Joined!', ephemeral: true });
        } else {
          interaction.reply({ content: '❌ Already joined', ephemeral: true });
        }
      }

      // OPEN TICKET
      if (interaction.customId === 'open_ticket') {

        const existing = interaction.guild.channels.cache.find(
          c => c.name === `ticket-${interaction.user.username}`
        );

        if (existing) {
          return interaction.reply({ content: "❌ Masz już ticket", ephemeral: true });
        }

        const ticket = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: ChannelType.GuildText,
          parent: config.CATEGORY_ID,
          permissionOverwrites: [
            { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
            { id: config.OFFICER_ROLE, allow: [PermissionsBitField.Flags.ViewChannel] }
          ]
        });

        const embed = new EmbedBuilder()
          .setColor('#ff9900')
          .setTitle('🌍 Select Language');

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('en').setLabel('🇬🇧 English').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('pl').setLabel('🇵🇱 Polski').setStyle(ButtonStyle.Secondary)
        );

        await ticket.send({
          content: `<@${interaction.user.id}> <@&${config.OFFICER_ROLE}>`,
          embeds: [embed],
          components: [row]
        });

        interaction.reply({ content: '✅ Ticket created', ephemeral: true });
      }

      // LANGUAGE EN
      if (interaction.customId === 'en') {
        await interaction.update({
          embeds: [new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('VYRN')
            .setDescription(`Hello,\nSend screenshot, gamepasses and stats.`)
          ],
          components: []
        });
      }

      // LANGUAGE PL
      if (interaction.customId === 'pl') {
        await interaction.update({
          embeds: [new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('VYRN')
            .setDescription(`Cześć,\nWyślij screenshot, gamepassy i statystyki.`)
          ],
          components: []
        });
      }
    }

  } catch (err) {
    console.log("❌ ERROR:", err);
  }
});

// ===== END GIVEAWAY =====
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

// ===== RESTORE =====
async function restoreGiveaways() {
  const all = await Giveaway.find();

  for (const g of all) {
    const left = g.endTime - Date.now();
    if (left > 0) setTimeout(() => endGiveaway(g.messageId), left);
    else endGiveaway(g.messageId);
  }
}

// ===== ANTI CRASH =====
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// ===== LOGIN =====
client.login(process.env.TOKEN);
```
