const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField,
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');

const ms = require('ms');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// pamięć (możesz później zmienić na DB)
const giveaways = new Map();
const roleEntries = new Map();

client.once('ready', async () => {
  console.log(`✅ Zalogowano jako ${client.user.tag}`);

  // REJESTRACJA KOMEND
  const commands = [
    new SlashCommandBuilder()
      .setName('giveaway-create')
      .setDescription('Stwórz giveaway')
      .addStringOption(o => o.setName('time').setDescription('np 1m, 1h').setRequired(true))
      .addStringOption(o => o.setName('reward').setDescription('Nagroda').setRequired(true))
      .addIntegerOption(o => o.setName('winners').setDescription('Ilość zwycięzców').setRequired(true))
      .addStringOption(o => o.setName('image').setDescription('Link do obrazka'))
      .addRoleOption(o => o.setName('role').setDescription('Wymagana rola')),

    new SlashCommandBuilder()
      .setName('giveaway-role')
      .setDescription('Ustaw dodatkowe wejścia dla roli')
      .addRoleOption(o => o.setName('role').setDescription('Rola').setRequired(true))
      .addIntegerOption(o => o.setName('entries').setDescription('Ile dodatkowych wejść').setRequired(true))
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    console.log('⏳ Rejestruję komendy...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('✅ Komendy gotowe!');
  } catch (err) {
    console.error(err);
  }
});

// OBSŁUGA KOMEND
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // CREATE GIVEAWAY
  if (interaction.commandName === 'giveaway-create') {
    const time = interaction.options.getString('time');
    const reward = interaction.options.getString('reward');
    const winnersCount = interaction.options.getInteger('winners');
    const image = interaction.options.getString('image');
    const requiredRole = interaction.options.getRole('role');

    const duration = ms(time);
    if (!duration) {
      return interaction.reply({ content: '❌ Zły czas!', ephemeral: true });
    }

    const endTime = Date.now() + duration;

    // pokazanie ról z bonusami
    let rolesBonusText = 'Brak';
    if (roleEntries.size > 0) {
      rolesBonusText = '';
      roleEntries.forEach((val, key) => {
        rolesBonusText += `<@&${key}> → +${val} wejść\n`;
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🎉 GIVEAWAY 🎉')
      .setDescription(
        `🎁 Nagroda: **${reward}**\n` +
        `🏆 Zwycięzcy: **${winnersCount}**\n` +
        `⏳ Koniec: <t:${Math.floor(endTime / 1000)}:R>\n` +
        `🔒 Wymagana rola: ${requiredRole ? requiredRole : 'Brak'}\n\n` +
        `🎟 Bonusowe wejścia:\n${rolesBonusText}\n\n` +
        `Kliknij 🎉 aby wziąć udział!`
      )
      .setImage(image || null)
      .setColor('Random');

    const msg = await interaction.channel.send({ embeds: [embed] });
    await msg.react('🎉');

    giveaways.set(msg.id, {
      endTime,
      reward,
      winnersCount,
      requiredRole,
      channelId: interaction.channel.id
    });

    interaction.reply({ content: '✅ Giveaway utworzony!', ephemeral: true });

    setTimeout(() => endGiveaway(msg), duration);
  }

  // ROLE BONUS
  if (interaction.commandName === 'giveaway-role') {
    const role = interaction.options.getRole('role');
    const entries = interaction.options.getInteger('entries');

    roleEntries.set(role.id, entries);

    interaction.reply({
      content: `✅ ${role} ma teraz +${entries} wejść`,
      ephemeral: true
    });
  }
});

// LOSOWANIE
async function endGiveaway(message) {
  const giveaway = giveaways.get(message.id);
  if (!giveaway) return;

  const channel = await client.channels.fetch(giveaway.channelId);
  const msg = await channel.messages.fetch(message.id);

  const reaction = msg.reactions.cache.get('🎉');
  if (!reaction) return channel.send('❌ Brak uczestników');

  const users = await reaction.users.fetch();
  const valid = users.filter(u => !u.bot);

  let entries = [];

  for (const user of valid.values()) {
    const member = await channel.guild.members.fetch(user.id);

    // sprawdzanie roli wymaganej
    if (giveaway.requiredRole &&
        !member.roles.cache.has(giveaway.requiredRole.id)) continue;

    let extra = 1;

    member.roles.cache.forEach(role => {
      if (roleEntries.has(role.id)) {
        extra += roleEntries.get(role.id);
      }
    });

    for (let i = 0; i < extra; i++) {
      entries.push(user.id);
    }
  }

  if (entries.length === 0) {
    return channel.send('❌ Nikt nie spełnił wymagań');
  }

  const winners = [];

  for (let i = 0; i < giveaway.winnersCount; i++) {
    const id = entries[Math.floor(Math.random() * entries.length)];
    winners.push(`<@${id}>`);
  }

  // kanał zwycięzców
  const winChannel = await channel.guild.channels.create({
    name: 'giveaway-winners',
    permissionOverwrites: [
      {
        id: channel.guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      }
    ]
  });

  await winChannel.send(`🎉 Zwycięzcy: ${winners.join(', ')}\nNagroda: ${giveaway.reward}`);
  channel.send(`🎉 Giveaway zakończony! ${winners.join(', ')}`);

  giveaways.delete(message.id);
}

client.login(process.env.TOKEN);
