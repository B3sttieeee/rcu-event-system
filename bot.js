const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const cron = require('node-cron');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const TOKEN = process.env.TOKEN;

const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1484937784283369502';

//////////////////////////////////////////////////
// 🖼️ OBRAZKI
//////////////////////////////////////////////////

const IMAGES = {
    egg: "https://imgur.com/pY2xNUL.png",
    boss: "https://imgur.com/VU9KdMS.png",
    honey: "https://imgur.com/SsvlJ5a.png",
    spin: "https://imgur.com/LeXDgiJ.png"
};

//////////////////////////////////////////////////
// 🎯 ROLE (USTAWIASZ KOMENDĄ)
//////////////////////////////////////////////////

let roles = {
    egg: null,
    merchant: null,
    spin: null
};

//////////////////////////////////////////////////
// 🕒 CZAS
//////////////////////////////////////////////////

function getPolishTime() {
    return new Date(new Date().toLocaleString("en-US", {
        timeZone: "Europe/Warsaw"
    }));
}

//////////////////////////////////////////////////
// 🎯 EVENTY
//////////////////////////////////////////////////

function getEvent(h) {
    if ([0,3,6,9,12,15,18,21].includes(h)) return "egg";
    if ([1,4,7,10,13,16,19,22].includes(h)) return "merchant";
    if ([2,5,8,11,14,17,20,23].includes(h)) return "spin";
}

//////////////////////////////////////////////////
// 🎨 EMBEDY
//////////////////////////////////////////////////

function embedEgg() {
    return new EmbedBuilder()
        .setTitle("🥚┃RNG EGG")
        .setDescription(
`🎲 Otwieraj jajka i zdobywaj pety

➜ Punkty do Tieru  
➜ Lepszy Tier = lepsze bonusy  

📍 Sprawdź swoje postępy`
        )
        .setThumbnail(IMAGES.egg)
        .setColor(0x00ffcc)
        .setFooter({ text: "Event trwa 15 minut" })
        .setTimestamp();
}

function embedBoss() {
    return new EmbedBuilder()
        .setTitle("🐝┃MERCHANT BOSS")
        .setDescription(
`🎉 Eventowy Merchant

📍 Anniversary Event  

➜ Za żetony z bossów można zakupić przedmioty  
🎯 Szansa na Supreme: 125%  

⏳ Przejdź sprawdzić ofertę`
        )
        .setThumbnail(IMAGES.boss)
        .setColor(0xff0000)
        .setFooter({ text: "Event trwa 15 minut" })
        .setTimestamp();
}

function embedHoney() {
    return new EmbedBuilder()
        .setTitle("🍯┃HONEY MERCHANT")
        .setDescription(
`🍯 Merchant z miodem

📍 Bee World  

➜ Za miód można zakupić przedmioty  
🎯 Szansa na Supreme: 110%  

⏳ Przejdź sprawdzić ofertę`
        )
        .setThumbnail(IMAGES.honey)
        .setColor(0xffcc00)
        .setFooter({ text: "Event trwa 15 minut" })
        .setTimestamp();
}

function embedSpin() {
    return new EmbedBuilder()
        .setTitle("🎰┃DEV SPIN")
        .setDescription(
`🎰 Zakręć kołem i zdobądź nagrody

🎯 Szansa na Supreme: ??%  

🍀 Spróbuj swojego szczęścia`
        )
        .setThumbnail(IMAGES.spin)
        .setColor(0x9b59b6)
        .setFooter({ text: "Event trwa 15 minut" })
        .setTimestamp();
}

//////////////////////////////////////////////////
// 🔄 KOMENDY
//////////////////////////////////////////////////

async function registerCommands() {

    const commands = [

        new SlashCommandBuilder()
            .setName('event')
            .setDescription('Aktualny event'),

        new SlashCommandBuilder()
            .setName('next-events')
            .setDescription('Następne eventy'),

        new SlashCommandBuilder()
            .setName('test-event')
            .setDescription('Test event'),

        new SlashCommandBuilder()
            .setName('refresh')
            .setDescription('Odśwież komendy'),

        new SlashCommandBuilder()
            .setName('set-role')
            .setDescription('Ustaw rolę dla eventu')
            .addStringOption(o =>
                o.setName('event')
                 .setDescription('Typ eventu')
                 .setRequired(true)
                 .addChoices(
                    { name: 'RNG EGG', value: 'egg' },
                    { name: 'MERCHANT', value: 'merchant' },
                    { name: 'DEV SPIN', value: 'spin' }
                 )
            )
            .addRoleOption(o =>
                o.setName('rola')
                 .setDescription('Rola')
                 .setRequired(true)
            )

    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );

    console.log("✅ Komendy OK");
}

//////////////////////////////////////////////////
// 🚀 READY + CRON
//////////////////////////////////////////////////

client.once('clientReady', async () => {

    console.log(`✅ ${client.user.tag}`);
    await registerCommands();

    cron.schedule('* * * * *', async () => {

        try {
            const now = getPolishTime();
            if (now.getMinutes() !== 0) return;

            const type = getEvent(now.getHours());
            const role = roles[type];

            if (!role) return;

            const channel = await client.channels.fetch(CHANNEL_ID);

            if (type === "merchant") {
                await channel.send({
                    content: `<@&${role}>`,
                    embeds: [embedBoss(), embedHoney()]
                });
            } else if (type === "egg") {
                await channel.send({
                    content: `<@&${role}>`,
                    embeds: [embedEgg()]
                });
            } else {
                await channel.send({
                    content: `<@&${role}>`,
                    embeds: [embedSpin()]
                });
            }

        } catch (e) {
            console.log("CRON ERROR:", e.message);
        }

    });

});

//////////////////////////////////////////////////
// ⚡ INTERAKCJE
//////////////////////////////////////////////////

client.on('interactionCreate', async i => {

    try {

        if (!i.isChatInputCommand()) return;

        await i.deferReply();

        // SET ROLE
        if (i.commandName === "set-role") {

            const type = i.options.getString("event");
            const role = i.options.getRole("rola");

            roles[type] = role.id;

            return i.editReply({
                content: `✅ Ustawiono rolę dla ${type}`
            });
        }

        // EVENT
        if (i.commandName === "event") {

            const type = getEvent(getPolishTime().getHours());

            if (type === "merchant") {
                return i.editReply({
                    embeds: [embedBoss(), embedHoney()]
                });
            }

            if (type === "egg") {
                return i.editReply({ embeds: [embedEgg()] });
            }

            return i.editReply({ embeds: [embedSpin()] });
        }

        // NEXT EVENTS
        if (i.commandName === "next-events") {

            const now = getPolishTime();
            const h = now.getHours();

            function format(offset) {
                const d = new Date(now);
                d.setHours((h + offset) % 24);
                d.setMinutes(0);
                return `${String(d.getHours()).padStart(2,"0")}:00 ${d.toLocaleDateString("pl-PL")}`;
            }

            return i.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("📊┃EVENTY")
                        .setDescription(
`🔥 TERAZ  
➜ ${getEvent(h)}

⏰ NASTĘPNE  
➜ ${format(1)} → ${getEvent((h+1)%24)}  
➜ ${format(2)} → ${getEvent((h+2)%24)}`
                        )
                        .setColor(0x5865F2)
                ]
            });
        }

        // TEST EVENT
        if (i.commandName === "test-event") {

            const type = getEvent(getPolishTime().getHours());
            const role = roles[type];

            const channel = await client.channels.fetch(CHANNEL_ID);

            if (type === "merchant") {
                await channel.send({
                    content: `<@&${role}>`,
                    embeds: [embedBoss(), embedHoney()]
                });
            } else if (type === "egg") {
                await channel.send({
                    content: `<@&${role}>`,
                    embeds: [embedEgg()]
                });
            } else {
                await channel.send({
                    content: `<@&${role}>`,
                    embeds: [embedSpin()]
                });
            }

            return i.editReply({ content: "✅ Wysłano test" });
        }

        // REFRESH
        if (i.commandName === "refresh") {
            await registerCommands();
            return i.editReply({ content: "✅ Odświeżono komendy" });
        }

    } catch (err) {
        console.log("ERROR:", err.message);
    }

});

client.login(TOKEN);
