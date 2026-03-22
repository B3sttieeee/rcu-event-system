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
// 🕒 CZAS (POLSKA)
//////////////////////////////////////////////////

function getPolishTime() {
    return new Date(new Date().toLocaleString("en-US", {
        timeZone: "Europe/Warsaw"
    }));
}

//////////////////////////////////////////////////
// 🎯 EVENTY (POPRAWIONE)
//////////////////////////////////////////////////

function getEvent(h) {
    if ([0,3,6,9,12,15,18,21].includes(h)) return "egg";
    if ([1,4,7,10,13,16,19,22].includes(h)) return "merchant";
    if ([2,5,8,11,14,17,20,23].includes(h)) return "spin";
}

function getMerchantVariant() {
    return Math.random() < 0.5 ? "boss" : "honey";
}

//////////////////////////////////////////////////
// 🎨 EMBEDY (PRO + POPRAWIONE OPISY)
//////////////////////////////////////////////////

function buildEmbed(type, variant=null) {

    if (type === "egg") {
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
            .setFooter({ text: "Event trwa 30 minut" })
            .setTimestamp();
    }

    if (type === "merchant") {

        if (variant === "boss") {
            return new EmbedBuilder()
                .setTitle("🐝┃MERCHANT BOSS")
                .setDescription(
`🎉 Eventowy Merchant

📍 Lokalizacja: Anniversary Event  

➜ Za żetony z bossów można zakupić przedmioty  
🎯 Szansa na Supreme: 125%  

⏳ Przejdź sprawdzić ofertę`
                )
                .setThumbnail(IMAGES.boss)
                .setColor(0xff0000)
                .setFooter({ text: "Event trwa 15 minut" })
                .setTimestamp();
        }

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
// 🎁 GIVEAWAY
//////////////////////////////////////////////////

let giveaway = {
    active: false,
    prize: "",
    entries: {},
    rolesBonus: {}
};

function parseTime(str) {
    const num = parseInt(str);
    if (str.endsWith("m")) return num * 60000;
    if (str.endsWith("h")) return num * 3600000;
    return 60000;
}

function getEntries(member) {
    let entries = 1;

    for (const roleId in giveaway.rolesBonus) {
        if (member.roles.cache.has(roleId)) {
            entries += giveaway.rolesBonus[roleId];
        }
    }

    return entries;
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
            .setName('giveaway')
            .setDescription('Stwórz giveaway')
            .addStringOption(o => o.setName('nagroda').setDescription('Nagroda').setRequired(true))
            .addStringOption(o => o.setName('czas').setDescription('np 10m / 1h').setRequired(true)),

        new SlashCommandBuilder()
            .setName('giveaway-role')
            .setDescription('Bonus dla roli')
            .addRoleOption(o => o.setName('rola').setDescription('Rola').setRequired(true))
            .addIntegerOption(o => o.setName('bonus').setDescription('Ile wejść').setRequired(true))

    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );
}

//////////////////////////////////////////////////
// 🚀 READY
//////////////////////////////////////////////////

client.once('clientReady', async () => {
    console.log(`✅ ${client.user.tag}`);

    await registerCommands();

    cron.schedule('* * * * *', async () => {

        try {
            const now = getPolishTime();
            if (now.getMinutes() !== 0) return;

            const type = getEvent(now.getHours());
            const variant = type === "merchant" ? getMerchantVariant() : null;

            const channel = await client.channels.fetch(CHANNEL_ID);

            await channel.send({
                content: "@everyone",
                embeds: [buildEmbed(type, variant)]
            });

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

        if (i.isButton() && i.customId === "join") {

            const entries = getEntries(i.member);
            giveaway.entries[i.user.id] = entries;

            return i.reply({
                content: `🎟️ Masz ${entries} wejść`,
                ephemeral: true
            });
        }

        if (!i.isChatInputCommand()) return;

        await i.deferReply();

        // EVENT
        if (i.commandName === "event") {
            return i.editReply({
                embeds: [buildEmbed(getEvent(getPolishTime().getHours()))]
            });
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

            const now = getPolishTime();
            const type = getEvent(now.getHours());
            const variant = type === "merchant" ? getMerchantVariant() : null;

            const channel = await client.channels.fetch(CHANNEL_ID);

            await channel.send({
                content: "@everyone",
                embeds: [buildEmbed(type, variant)]
            });

            return i.editReply({ content: "✅ Wysłano test event" });
        }

        // GIVEAWAY
        if (i.commandName === "giveaway") {

            const prize = i.options.getString("nagroda");
            const time = parseTime(i.options.getString("czas"));

            giveaway = {
                active: true,
                prize,
                entries: {},
                rolesBonus: giveaway.rolesBonus
            };

            const embed = new EmbedBuilder()
                .setTitle("🎉 GIVEAWAY")
                .setDescription(`🎁 **${prize}**\nKliknij przycisk, aby wziąć udział`)
                .setColor(0x00ffcc);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("join")
                    .setLabel("Weź udział")
                    .setStyle(ButtonStyle.Success)
            );

            const msg = await i.editReply({
                embeds: [embed],
                components: [row]
            });

            setTimeout(async () => {

                const pool = [];

                for (const [id, count] of Object.entries(giveaway.entries)) {
                    for (let i = 0; i < count; i++) pool.push(id);
                }

                if (pool.length === 0) return;

                const winner = pool[Math.floor(Math.random() * pool.length)];

                await msg.reply(`🎉 Wygrał: <@${winner}> | ${prize}`);

                giveaway.active = false;

            }, time);
        }

        // BONUS ROLE
        if (i.commandName === "giveaway-role") {

            const role = i.options.getRole("rola");
            const bonus = i.options.getInteger("bonus");

            giveaway.rolesBonus[role.id] = bonus;

            return i.editReply({
                content: `✅ ${role.name} ma +${bonus} wejść`
            });
        }

        // REFRESH
        if (i.commandName === "refresh") {
            await registerCommands();
            return i.editReply({ content: "✅ Komendy odświeżone" });
        }

    } catch (err) {
        console.log("ERROR:", err.message);
    }

});

client.login(TOKEN);
