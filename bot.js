const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require('discord.js');

const fs = require('fs');
const cron = require('node-cron');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1484937784283369502';

// ROLE
const ROLES = {
    egg: "1476000993119568105",
    merchant: "1476000993660502139",
    spin: "1484911421903999127"
};

// OBRAZY
const IMAGES = {
    egg: "https://imgur.com/pY2xNUL.png",
    boss: "https://imgur.com/VU9KdMS.png",
    honey: "https://imgur.com/SsvlJ5a.png",
    spin: "https://imgur.com/LeXDgiJ.png"
};

let data = {
    dm: {},
    giveaways: {},
    bonusRoles: {} // roleId: multiplier
};

function save() {
    fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));
}

// 🔥 CZAS PL (NAPRAWIONY NA SZTYWNO)
function getPolishTime() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 1)); // UTC+1 (PL)
}

// EVENT
function getEvent(h) {
    if ([0,3,6,9,12,15,18,21].includes(h)) return "egg";
    if ([1,4,7,10,13,16,19,22].includes(h)) return "merchant";
    if ([2,5,8,11,14,17,20,23].includes(h)) return "spin";
}

// NEXT EVENTS (NAPRAWIONE 100%)
function getNextEvents() {

    const now = getPolishTime();
    let list = [];

    for (let h = 0; h < 24; h++) {

        let date = new Date(now);
        date.setHours(h,0,0,0);

        if (date <= now) date.setDate(date.getDate()+1);

        list.push({
            type: getEvent(h),
            time: date.getTime()
        });
    }

    list.sort((a,b)=>a.time-b.time);
    return list.slice(0,2);
}

// EMBEDY
function embedEgg() {
    return new EmbedBuilder()
        .setTitle("🥚 **RNG EGG**")
        .setDescription(
`**Otwieraj jajka i zdobywaj punkty Tieru!**

• Lepsze pety = więcej punktów  
• Lepszy Tier = lepsze nagrody`
        )
        .setThumbnail(IMAGES.egg)
        .setColor(0xffcc00);
}

function embedHoney() {
    return new EmbedBuilder()
        .setTitle("🐝 **HONEY MERCHANT**")
        .setDescription(
`Za miód kupisz przedmioty  
Szansa Supreme: **110%**

⏳ Znajdziesz na mapie Bee World  
⏳ Znika po 15 minutach`
        )
        .setThumbnail(IMAGES.honey)
        .setColor(0xff9900);
}

function embedBoss() {
    return new EmbedBuilder()
        .setTitle("🔴 **BOSS MERCHANT**")
        .setDescription(
`Eventowy merchant  
Na mapie Anniversary Event  

Szansa Supreme: **125%**

⏳ Znika po 15 minutach`
        )
        .setThumbnail(IMAGES.boss)
        .setColor(0xff0000);
}

function embedSpin() {
    return new EmbedBuilder()
        .setTitle("🎰 **DEV SPIN**")
        .setDescription(
`Kręć kołem aby zdobyć nagrody  

Szansa Supreme: **??%**`
        )
        .setThumbnail(IMAGES.spin)
        .setColor(0x00ccff);
}

// READY
client.once('clientReady', async () => {

    console.log("✅ BOT ONLINE");

    const commands = [
        new SlashCommandBuilder().setName('event').setDescription('Aktualny event'),
        new SlashCommandBuilder().setName('next-events').setDescription('Następne eventy'),
        new SlashCommandBuilder().setName('get-role').setDescription('Panel ról'),
        new SlashCommandBuilder().setName('set-dm').setDescription('DM powiadomienia'),

        new SlashCommandBuilder()
            .setName('giveaway')
            .setDescription('Start giveaway')
            .addStringOption(o=>o.setName('nagroda').setDescription('Nagroda').setRequired(true))
            .addStringOption(o=>o.setName('czas').setDescription('np 1h').setRequired(true)),

        new SlashCommandBuilder()
            .setName('giveaway-role')
            .setDescription('Ustaw bonus wejść')
            .addRoleOption(o=>o.setName('rola').setRequired(true))
            .addIntegerOption(o=>o.setName('ile').setRequired(true))

    ].map(c=>c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    console.log("✅ Komendy OK");

    // CRON
    cron.schedule('* * * * *', async () => {

        const now = getPolishTime();
        const h = now.getHours();
        const m = now.getMinutes();

        const type = getEvent(h);

        const channel = await client.channels.fetch(CHANNEL_ID);

        // 5 MIN BEFORE
        if (m === 55) {
            channel.send(`⏰ Za 5 minut: **${type.toUpperCase()}** <@&${ROLES[type]}>`);
        }

        // START
        if (m === 0) {

            if (type === "merchant") {
                channel.send({
                    content: `<@&${ROLES.merchant}>`,
                    embeds: [embedHoney(), embedBoss()]
                });
            } else if (type === "egg") {
                channel.send({
                    content: `<@&${ROLES.egg}>`,
                    embeds: [embedEgg()]
                });
            } else {
                channel.send({
                    content: `<@&${ROLES.spin}>`,
                    embeds: [embedSpin()]
                });
            }

        }

    });

});

// INTERACTIONS
client.on('interactionCreate', async i => {

    if (i.isChatInputCommand()) {

        const now = getPolishTime();
        const h = now.getHours();

        if (i.commandName === 'event') {

            const type = getEvent(h);

            if (type === "merchant") {
                return i.reply({ embeds: [embedHoney(), embedBoss()] });
            }

            if (type === "egg") return i.reply({ embeds: [embedEgg()] });
            if (type === "spin") return i.reply({ embeds: [embedSpin()] });
        }

        if (i.commandName === 'next-events') {

            const next = getNextEvents();

            return i.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("📅 **NASTĘPNE EVENTY**")
                        .setDescription(
`🔥 **${next[0].type.toUpperCase()}**
<t:${Math.floor(next[0].time/1000)}:F>

🔥 **${next[1].type.toUpperCase()}**
<t:${Math.floor(next[1].time/1000)}:F>`
                        )
                        .setColor(0x00ffcc)
                ]
            });
        }

        if (i.commandName === 'giveaway-role') {

            const role = i.options.getRole('rola');
            const ile = i.options.getInteger('ile');

            data.bonusRoles[role.id] = ile;
            save();

            return i.reply(`✅ ${role} ma teraz x${ile} wejść`);
        }

    }

});

client.login(TOKEN);
