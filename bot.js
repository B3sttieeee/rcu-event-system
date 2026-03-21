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
// 🎯 EVENT SYSTEM
//////////////////////////////////////////////////

function getEvent(h) {
    if ([0,3,6,9,12,15,18,21].includes(h)) return "egg";
    if ([1,4,7,10,13,16,19,22].includes(h)) return "merchant";
    return "spin";
}

function getMerchantVariant() {
    return Math.random() < 0.5 ? "boss" : "honey";
}

function buildEmbed(type, variant=null) {

    if (type === "egg") {
        return new EmbedBuilder()
            .setTitle("🥚 RNG EGG")
            .setDescription(
`🎲 Otwieraj Jajka

➜ Drop petów  
➜ Punkty do Tieru  
➜ Lepszy Tier = lepsze bonusy`
            )
            .setThumbnail(IMAGES.egg)
            .setColor(0x00ffcc)
            .setTimestamp();
    }

    if (type === "merchant") {

        if (variant === "boss") {
            return new EmbedBuilder()
                .setTitle("🐝 MERCHANT BOSS")
                .setDescription(
`🔥 Boss Merchant

➜ Żetony → itemy  

🎯 Supreme (125%)`
                )
                .setThumbnail(IMAGES.boss)
                .setColor(0xff0000)
                .setTimestamp();
        }

        return new EmbedBuilder()
            .setTitle("🍯 HONEY MERCHANT")
            .setDescription(
`🍯 Honey Merchant

➜ Miód → przedmioty  

🎯 Supreme (110%)`
            )
            .setThumbnail(IMAGES.honey)
            .setColor(0xffcc00)
            .setTimestamp();
    }

    return new EmbedBuilder()
        .setTitle("🎰 DEV SPIN")
        .setDescription(
`🎰 Kręć kołem

➜ Zdobądź nagrody  
🎯 Supreme (??%)`
        )
        .setThumbnail(IMAGES.spin)
        .setColor(0x9b59b6)
        .setTimestamp();
}

//////////////////////////////////////////////////
// 🎁 GIVEAWAY PRO
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
            .setDescription('Refresh komend'),

        new SlashCommandBuilder()
            .setName('giveaway')
            .setDescription('Stwórz giveaway')
            .addStringOption(o =>
                o.setName('nagroda').setDescription('Nagroda').setRequired(true)
            )
            .addStringOption(o =>
                o.setName('czas').setDescription('np 10m / 1h').setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName('giveaway-role')
            .setDescription('Dodaj bonus dla roli')
            .addRoleOption(o =>
                o.setName('rola').setDescription('Rola').setRequired(true)
            )
            .addIntegerOption(o =>
                o.setName('bonus').setDescription('Ile wejść').setRequired(true)
            )

    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
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

        const type = getEvent(now.getHours());
        const variant = type === "merchant" ? getMerchantVariant() : null;

        const channel = await client.channels.fetch(CHANNEL_ID);

        channel.send({
            content: "@everyone",
            embeds: [buildEmbed(type, variant)]
        });

    });
});

//////////////////////////////////////////////////
// ⚡ INTERAKCJE
//////////////////////////////////////////////////

client.on('interactionCreate', async i => {

    // JOIN
    if (i.isButton() && i.customId === "join") {

        const entries = getEntries(i.member);

        giveaway.entries[i.user.id] = entries;

        return i.reply({
            content: `🎟️ Masz ${entries} wejść`,
            ephemeral: true
        });
    }

    if (!i.isChatInputCommand()) return;

    // EVENT
    if (i.commandName === "event") {
        return i.reply({
            embeds: [buildEmbed(getEvent(new Date().getHours()))]
        });
    }

    // NEXT EVENTS
    if (i.commandName === "next-events") {
        const h = new Date().getHours();

        return i.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("📊 System Eventów")
                    .setDescription(
`🔥 TERAZ → ${getEvent(h)}

⏰ ${((h+1)%24)}:00 → ${getEvent((h+1)%24)}
⏰ ${((h+2)%24)}:00 → ${getEvent((h+2)%24)}`
                    )
                    .setColor(0x5865F2)
            ]
        });
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

        const bonusText = Object.entries(giveaway.rolesBonus)
            .map(([role, bonus]) => `<@&${role}> → +${bonus}`)
            .join("\n") || "Brak bonusów";

        const embed = new EmbedBuilder()
            .setTitle("🎉 GIVEAWAY")
            .setDescription(
`🎁 **${prize}**

Kliknij przycisk aby wziąć udział!

🎯 Bonusy:
${bonusText}`
            )
            .setColor(0x00ffcc);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("join")
                .setLabel("Weź udział")
                .setStyle(ButtonStyle.Success)
        );

        const msg = await i.reply({ embeds: [embed], components: [row], fetchReply: true });

        setTimeout(async () => {

            const pool = [];

            for (const [id, count] of Object.entries(giveaway.entries)) {
                for (let i = 0; i < count; i++) pool.push(id);
            }

            if (pool.length === 0) return;

            const winner = pool[Math.floor(Math.random() * pool.length)];

            msg.reply(`🎉 Wygrał: <@${winner}> | ${prize}`);

            giveaway.active = false;

        }, time);
    }

    // BONUS ROLE
    if (i.commandName === "giveaway-role") {

        const role = i.options.getRole("rola");
        const bonus = i.options.getInteger("bonus");

        giveaway.rolesBonus[role.id] = bonus;

        return i.reply({
            content: `✅ ${role.name} ma teraz +${bonus} wejść`,
            ephemeral: true
        });
    }

    // TEST
    if (i.commandName === "test-event") {

        const type = getEvent(new Date().getHours());
        const variant = type === "merchant" ? getMerchantVariant() : null;

        const channel = await client.channels.fetch(CHANNEL_ID);

        await channel.send({
            content: "@everyone",
            embeds: [buildEmbed(type, variant)]
        });

        return i.reply({ content: "✅ wysłano test", ephemeral: true });
    }

    // REFRESH
    if (i.commandName === "refresh") {
        await registerCommands();
        return i.reply({ content: "✅ odświeżono", ephemeral: true });
    }

});

client.login(TOKEN);
