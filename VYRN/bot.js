// bot.js - wersja ES Modules (import)

import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  VoiceConnectionStatus 
} from '@discordjs/voice';
import ytdl from 'ytdl-core';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const queue = new Map(); // guildId => queue

client.once('ready', () => {
  console.log(`✅ Zalogowano jako ${client.user.tag}!`);
});

const play = async (guild, song) => {
  const guildQueue = queue.get(guild.id);
  if (!song) {
    guildQueue?.connection?.destroy();
    queue.delete(guild.id);
    guildQueue?.textChannel?.send('🎵 Kolejka się skończyła. Opuściłem kanał głosowy.');
    return;
  }

  try {
    const stream = ytdl(song.url, {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25,
    });

    const resource = createAudioResource(stream, { inlineVolume: true });
    guildQueue.player.play(resource);

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🎶 Teraz odtwarzam')
      .setDescription(`**${song.title}**`)
      .setURL(song.url);

    guildQueue.textChannel.send({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    guildQueue.textChannel.send('❌ Błąd podczas odtwarzania utworu.');
  }
};

// ========================
// Komendy
// ========================
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  const guildQueue = queue.get(message.guild.id);

  switch (command) {
    case 'join':
    case 'j':
      if (!message.member.voice.channel) 
        return message.reply('❌ Musisz być na kanale głosowym!');

      const connection = joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      const player = createAudioPlayer();

      connection.subscribe(player);

      queue.set(message.guild.id, {
        textChannel: message.channel,
        voiceChannel: message.member.voice.channel,
        connection,
        player,
        songs: [],
      });

      message.reply(`✅ Dołączono do **${message.member.voice.channel.name}**!`);
      break;

    case 'play':
    case 'p':
      if (!args.length) return message.reply('❌ Podaj link YouTube!');

      const url = args[0];
      if (!ytdl.validateURL(url)) 
        return message.reply('❌ Podaj poprawny link YouTube!');

      try {
        const songInfo = await ytdl.getInfo(url);
        const song = {
          title: songInfo.videoDetails.title,
          url: songInfo.videoDetails.video_url,
        };

        if (!guildQueue) {
          if (!message.member.voice.channel) 
            return message.reply('❌ Musisz być na kanale głosowym!');

          const connection = joinVoiceChannel({
            channelId: message.member.voice.channel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
          });

          const player = createAudioPlayer();

          const newQueue = {
            textChannel: message.channel,
            voiceChannel: message.member.voice.channel,
            connection,
            player,
            songs: [song],
          };

          queue.set(message.guild.id, newQueue);
          connection.subscribe(player);

          player.on(AudioPlayerStatus.Idle, () => {
            const q = queue.get(message.guild.id);
            if (q) {
              q.songs.shift();
              play(message.guild, q.songs[0]);
            }
          });

          play(message.guild, song);
        } else {
          guildQueue.songs.push(song);
          message.reply(`✅ Dodano do kolejki: **${song.title}**`);
        }
      } catch (error) {
        console.error(error);
        message.reply('❌ Nie udało się dodać utworu.');
      }
      break;

    case 'skip':
    case 's':
      if (!guildQueue?.songs?.length) 
        return message.reply('❌ Nie ma nic w kolejce!');

      guildQueue.songs.shift();
      play(message.guild, guildQueue.songs[0]);
      message.reply('⏭ Pominięto utwór!');
      break;

    case 'queue':
    case 'q':
      if (!guildQueue?.songs?.length) 
        return message.reply('❌ Kolejka jest pusta.');

      let queueMsg = '**📜 Kolejka:**\n';
      guildQueue.songs.forEach((song, i) => {
        queueMsg += `${i + 1}. ${song.title}\n`;
      });
      message.reply(queueMsg);
      break;

    case 'leave':
    case 'l':
      if (guildQueue) {
        guildQueue.connection.destroy();
        queue.delete(message.guild.id);
        message.reply('👋 Opuściłem kanał głosowy.');
      } else {
        message.reply('❌ Nie jestem na żadnym kanale głosowym.');
      }
      break;
  }
});

client.login(process.env.TOKEN).catch(console.error);
