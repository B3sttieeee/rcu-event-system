const { Client, GatewayIntentBits } = require('discord.js');
const ytdl = require('ytdl-core');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

const queue = {};

client.on('messageCreate', async (message) => {
  if (message.author.bot || message.channel.type === 'dm') return;

  const args = message.content.slice(1).split(/ +/);
  const command = args.shift().toLowerCase();

  switch (command) {
    case 'join':
      if (!message.member.voice.channel)
        return message.reply('Nie jesteś na kanale głosowym!');
      const connection = await message.member.voice.channel.join();
      queue[message.guild.id] = { textChannel: message.channel, voiceChannel: message.member.voice.channel, connection, songs: [] };
      message.reply(`Dołączono do kanału ${message.member.voice.channel.name}!`);
      break;
    case 'play':
      if (!args.length) return message.reply('Podaj link do utworu!');
      const songInfo = await ytdl.getInfo(args[0]);
      const song = {
        title: songInfo.title,
        url: songInfo.video_url,
      };

      if (queue[message.guild.id]) queue[message.guild.id].songs.push(song);
      else {
        queue[message.guild.id] = {
          textChannel: message.channel,
          voiceChannel: message.member.voice.channel,
          connection: null,
          songs: [song],
        };
      }

      if (!player(queue[message.guild.id])) return;
      message.reply(`Dodano do kolejki: **${song.title}**`);
      break;
    case 'leave':
      if (queue[message.guild.id]) {
        queue[message.guild.id].connection.disconnect();
        delete queue[message.guild.id];
        return message.reply('Opuściłem kanał głosowy!');
      }
      return message.reply('Nie jestem na żadnym kanale głosowym!');
    case 'skip':
      if (queue[message.guild.id]) {
        if (queue[message.guild.id].songs.length > 1) {
          play(queue[message.guild.id]);
          return message.reply('Pominięto aktualny utwór!');
        }
        queue[message.guild.id].connection.disconnect();
        delete queue[message.guild.id];
        return message.reply('Nie ma więcej utworów w kolejce.');
      }
      return message.reply('Nie jestem na żadnym kanale głosowym!');
    case 'queue':
      if (queue[message.guild.id]) {
        let queueMessage = `**Kolejka:**\n`;
        queue[message.guild.id].songs.forEach((song, index) => {
          queueMessage += `${index + 1}. ${song.title}\n`;
        });
        return message.reply(queueMessage);
      }
      return message.reply('Nie ma żadnych utworów w kolejce.');
    default:
      return;
  }
});

const player = (guildQueue) => {
  if (!guildQueue.songs.length) {
    guildQueue.voiceChannel.leave();
    delete queue[guildQueue.guild.id];
    return false;
  }

  const dispatcher = guildQueue.connection
    .play(ytdl(guildQueue.songs[0].url, { filter: 'audioonly' }))
    .on('finish', () => {
      guildQueue.songs.shift();
      player(guildQueue);
    })
    .on('error', (err) => console.error(err));

  guildQueue.textChannel.send(`Teraz odtwarzam: **${guildQueue.songs[0].title}**`);
  return true;
};

const play = (guildQueue) => {
  if (!guildQueue.connection) {
    guildQueue.connection = await guildQueue.voiceChannel.join();
  }
  player(guildQueue);
};

client.login(process.env.TOKEN).catch(console.error);
