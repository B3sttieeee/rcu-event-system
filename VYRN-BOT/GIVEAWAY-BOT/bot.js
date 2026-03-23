// Discord Giveaway Bot using discord.js v14
// IMPORTANT: Railway FIX
// Make sure you also have package.json in repo root:
/*
{
  "name": "giveaway-bot",
  "version": "1.0.0",
  "main": "bot.js",
  "scripts": {
    "start": "node bot.js"
  },
  "dependencies": {
    "discord.js": "^14.14.1",
    "ms": "^2.1.3",
    "dotenv": "^16.0.0"
  }
}
*/

// Also add .env file locally (Railway -> Variables):
// TOKEN=your_bot_token_here

// If Railway still fails, set START COMMAND to:
// npm start

// =========================
// Features:
// - /giveaway-create
// - /giveaway-role (extra entries)
// - countdown timer
// - role requirement
// - winner channel creation

const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
const ms = require('ms');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// In-memory storage (replace with DB for production)
const giveaways = new Map();
const roleEntries = new Map();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'giveaway-create') {
    const time = interaction.options.getString('time');
    const reward = interaction.options.getString('reward');
    const winnersCount = interaction.options.getInteger('winners');
    const image = interaction.options.getString('image');
    const requiredRole = interaction.options.getRole('role');

    const duration = ms(time);
    if (!duration) return interaction.reply({ content: 'Invalid time!', ephemeral: true });

    const endTime = Date.now() + duration;

    const embed = new EmbedBuilder()
      .setTitle('🎉 GIVEAWAY 🎉')
      .setDescription(`Reward: **${reward}**\nWinners: **${winnersCount}**\nEnds: <t:${Math.floor(endTime / 1000)}:R>\nRequired Role: ${requiredRole ? requiredRole : 'None'}\n\nClick 🎉 to enter!`)
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

    interaction.reply({ content: 'Giveaway created!', ephemeral: true });

    setTimeout(() => endGiveaway(msg), duration);
  }

  if (interaction.commandName === 'giveaway-role') {
    const role = interaction.options.getRole('role');
    const entries = interaction.options.getInteger('entries');

    roleEntries.set(role.id, entries);

    interaction.reply({ content: `Role ${role.name} now gives ${entries} extra entries!`, ephemeral: true });
  }
});

async function endGiveaway(message) {
  const giveaway = giveaways.get(message.id);
  if (!giveaway) return;

  const channel = await client.channels.fetch(giveaway.channelId);
  const msg = await channel.messages.fetch(message.id);

  const reactions = msg.reactions.cache.get('🎉');
  if (!reactions) return channel.send('No participants.');

  const users = await reactions.users.fetch();
  const validUsers = users.filter(u => !u.bot);

  let entries = [];

  for (const user of validUsers.values()) {
    const member = await channel.guild.members.fetch(user.id);

    if (giveaway.requiredRole && !member.roles.cache.has(giveaway.requiredRole.id)) continue;

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

  if (entries.length === 0) return channel.send('No valid entries.');

  const winners = [];

  for (let i = 0; i < giveaway.winnersCount; i++) {
    const winnerId = entries[Math.floor(Math.random() * entries.length)];
    winners.push(`<@${winnerId}>`);
  }

  // Create winner channel
  const winnerChannel = await channel.guild.channels.create({
    name: 'giveaway-winners',
    permissionOverwrites: [
      {
        id: channel.guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      }
    ]
  });

  await winnerChannel.send(`🎉 Winners: ${winners.join(', ')}\nReward: ${giveaway.reward}`);

  channel.send(`🎉 Giveaway ended! Winners: ${winners.join(', ')}`);

  giveaways.delete(message.id);
}

client.login(process.env.TOKEN);

// SLASH COMMANDS SETUP (run separately if needed)
// /giveaway-create time:string reward:string winners:number image:string role:role
// /giveaway-role role:role entries:number
