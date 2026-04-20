require('dotenv').config(); // Load environment variables from .env file
const { Client, GatewayIntentBits } = require('discord.js');
const { ERELA } = require('erela.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const erela = new ERELA(client, {
    deleteCommandOnCooldown: 3,
    defaultVolume: 50,
    leaveOnEmpty: true,
    leaveOnQueueEnd: false,
    leaveOnStopCommand: false,
    messageDeleteDelay: 1000,
});

// Read the bot token from environment variables (do NOT commit .env to GitHub!)
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
    console.error('Error: Bot token is missing. Create a .env file with TOKEN=your_token_here');
    process.exit(1);
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    erela.setHandler(client);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ping') {
        await interaction.reply('Pong! 🏓');
    }
    else if (commandName === 'play') {
        // Example: Play a song from YouTube
        const query = interaction.options.getString('query', true);
        try {
            const result = await erela.player.searchTrack(query, interaction.channel, { requestedBy: interaction.user });
            if (result) {
                await interaction.reply(`Now playing: **${result.title}** by ${result.author}. 🎵`);
            } else {
                await interaction.reply('No results found. Try a different search term! 🔍');
            }
        } catch (error) {
            console.error(error);
            await interaction.reply('An error occurred while processing your request. 😞');
        }
    }
    // Add more commands here as needed
});

// Register slash commands (you'll need to replace this with your actual command registration logic)
client.login(TOKEN);
