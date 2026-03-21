const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionsBitField,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const fs = require('fs');
const cron = require('node-cron');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;

const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1484937784283369502';

//////////////////////////////////////////////////
// 🎯 EVENT SYSTEM
//////////////////////////////////////////////////

function getEvent(h) {
    if ([0,3,6,9,12,15,18,21].includes(h)) return "🥚 RNG EGG";
    if ([1,4,7,10,13,16,19,22].includes(h)) return "🐝 MERCHANT";
    return "🎰 DEV SPIN";
}

//////////////////////////////////////////////////
// 🖼️ EMBED
//////////////////////////////////////////////////

function buildEmbed(name) {
    return new EmbedBuilder()
        .setTitle(name)
        .setDescription("📢 Event wystartował!")
        .setColor(0x5865F2)
        .setTimestamp();
}

//////////////////////////////////////////////////
// 🎁 GIVEAWAY
//////////////////////////////////////////////////

let giveaway = {
    active: false,
    entries: {},
    prize: ""
};

function parseTime(str) {
    const num = parseInt(str);
    if (str.endsWith("m")) return num * 60000;
    if (str.endsWith("h")) return num * 3600000;
    return 60000;
}

//////////////////////////////////////////////////
// 🔄 KOMENDY
//////////////////////////////////////////////////

async function registerCommands() {

    const commands = [

        new SlashCommandBuilder()
            .setName('event')
            .setDescription('Pokazuje aktualny event'),

        new SlashCommandBuilder()
            .setName('next-events')
            .setDescription('Pokazuje następne eventy'),

        new SlashCommandBuilder()
            .setName('test-event')
            .setDescription('Testowy event'),

        new SlashCommandBuilder()
            .setName('refresh')
            .setDescription('Odśwież komendy'),

        new SlashCommandBuilder()
            .setName('giveaway')
            .setDescription('Stwórz giveaway')
            .addStringOption(option =>
                option.setName('nagroda')
                    .setDescription('Nagroda giveaway')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('czas')
                    .setDescription('Czas np 10m / 1h')
                    .setRequired(true)
            )

    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );

    console.log("✅ Komendy zarejestrowane");
}

//////////////////////////////////////////////////
// 🚀 READY
//////////////////////////////////////////////////

client.once('clientReady', async () => {
    console.log(`✅ ${client.user.tag}`);
    await registerCommands();

    cron.schedule('* * * * *', async () => {

        const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
        if (now.getMinutes() !== 0) return;

        const event = getEvent(now.getHours());

        const channel = await client.channels.fetch(CHANNEL_ID);

        await channel.send({
            content: "@everyone",
            embeds: [buildEmbed(event)]
        });

    });
});

//////////////////////////////////////////////////
// ⚡ INTERAKCJE
//////////////////////////////////////////////////

client.on('interactionCreate', async i => {

    if (i.isButton()) {

        if (i.customId === "join") {

            giveaway.entries[i.user.id] = true;

            return i.reply({
                content: "✅ Dołączyłeś do giveaway!",
                ephemeral: true
            });
        }
    }

    if (!i.isChatInputCommand()) return;

    // EVENT
    if (i.commandName === 'event') {
        const event = getEvent(new Date().getHours());

        return i.reply({
            embeds: [buildEmbed(event)]
        });
    }

    // NEXT EVENTS
    if (i.commandName === 'next-events') {
        const h = new Date().getHours();

        return i.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("📊 Eventy")
                    .setDescription(
`🔥 Teraz → ${getEvent(h)}
⏰ Następny → ${getEvent((h+1)%24)}
⏰ Kolejny → ${getEvent((h+2)%24)}`
                    )
                    .setColor(0x5865F2)
            ]
        });
    }

    // TEST EVENT
    if (i.commandName === 'test-event') {
        const event = getEvent(new Date().getHours());

        const channel = await client.channels.fetch(CHANNEL_ID);

        await channel.send({
            content: "@everyone",
            embeds: [buildEmbed(event)]
        });

        return i.reply({ content: "✅ Wysłano test", ephemeral: true });
    }

    // GIVEAWAY
    if (i.commandName === 'giveaway') {

        const prize = i.options.getString('nagroda');
        const time = parseTime(i.options.getString('czas'));

        giveaway = {
            active: true,
            entries: {},
            prize
        };

        const embed = new EmbedBuilder()
            .setTitle("🎉 GIVEAWAY")
            .setDescription(`Nagroda: **${prize}**`)
            .setColor(0x00ffcc);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("join")
                .setLabel("Weź udział")
                .setStyle(ButtonStyle.Success)
        );

        const msg = await i.reply({
            embeds: [embed],
            components: [row],
            fetchReply: true
        });

        setTimeout(async () => {

            const users = Object.keys(giveaway.entries);
            if (users.length === 0) return;

            const winner = users[Math.floor(Math.random() * users.length)];

            await msg.reply(`🎉 Wygrał: <@${winner}> | ${prize}`);

            giveaway.active = false;

        }, time);
    }

    // REFRESH
    if (i.commandName === 'refresh') {
        await registerCommands();
        return i.reply({ content: "✅ Odświeżono", ephemeral: true });
    }

});

client.login(TOKEN);
