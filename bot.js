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

const FILE = './data.json';

//////////////////////////////////////////////////
// 📦 DATA
//////////////////////////////////////////////////

let data = {
    roles: { egg: null, merchant: null, spin: null },
    dm: {},
    giveaway: {
        active: false,
        prize: null,
        entries: {},
        rolesBonus: {}
    }
};

function loadData() {
    if (fs.existsSync(FILE)) {
        data = JSON.parse(fs.readFileSync(FILE));
    }
}
function save() {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}
loadData();

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

//////////////////////////////////////////////////
// 🖼️ EMBEDY
//////////////////////////////////////////////////

const IMAGES = {
    egg: "https://imgur.com/pY2xNUL.png",
    merchant_boss: "https://imgur.com/VU9KdMS.png",
    merchant_honey: "https://imgur.com/SsvlJ5a.png",
    spin: "https://imgur.com/LeXDgiJ.png"
};

function buildEmbed(type, variant=null) {

    if (type === "egg") {
        return new EmbedBuilder()
            .setTitle("🥚 RNG EGG")
            .setDescription(
`🎲 Otwieraj jajka

➜ Zdobywaj pety  
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

➜ Żetony z bossów → itemy  

🎯 Supreme (125%)`
                )
                .setThumbnail(IMAGES.merchant_boss)
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
            .setThumbnail(IMAGES.merchant_honey)
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
// 🎁 GIVEAWAY
//////////////////////////////////////////////////

function parseTime(str) {
    const num = parseInt(str);
    if (str.endsWith("m")) return num * 60000;
    if (str.endsWith("h")) return num * 3600000;
    return num;
}

function getEntries(member) {
    let entries = 1;

    for (const roleId in data.giveaway.rolesBonus || {}) {
        if (member.roles.cache.has(roleId)) {
            entries += data.giveaway.rolesBonus[roleId];
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
            .setDescription('Aktualny + następne eventy'),

        new SlashCommandBuilder()
            .setName('set-dm')
            .setDescription('Ustaw DM'),

        new SlashCommandBuilder()
            .setName('roles-picker')
            .setDescription('Ustaw role'),

        new SlashCommandBuilder()
            .setName('giveaway')
            .setDescription('Stwórz giveaway')
            .addStringOption(o =>
                o.setName('nagroda')
                 .setDescription('Nagroda')
                 .setRequired(true)
            )
            .addStringOption(o =>
                o.setName('czas')
                 .setDescription('np 10m / 1h')
                 .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName('test-event')
            .setDescription('Test event'),

        new SlashCommandBuilder()
            .setName('refresh')
            .setDescription('Odśwież komendy')

    ].map(c => c.toJSON());

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
        const h = now.getHours();
        const m = now.getMinutes();

        if (m !== 0) return;

        const type = getEvent(h);
        const role = data.roles[type];
        if (!role) return;

        const variant = type === "merchant" ? getMerchantVariant() : null;
        const embed = buildEmbed(type, variant);

        const channel = await client.channels.fetch(CHANNEL_ID);

        await channel.send({
            content: `<@&${role}>`,
            embeds: [embed]
        });
    });
});

//////////////////////////////////////////////////
// ⚡ INTERAKCJE
//////////////////////////////////////////////////

client.on('interactionCreate', async i => {

    // 🎁 JOIN
    if (i.isButton() && i.customId === "join") {

        if (!data.giveaway.active)
            return i.reply({ content: "❌ brak giveaway", ephemeral: true });

        const entries = getEntries(i.member);

        data.giveaway.entries[i.user.id] = entries;
        save();

        return i.reply({
            content: `🎟️ Masz ${entries} wejść`,
            ephemeral: true
        });
    }

    if (!i.isChatInputCommand()) return;

    // 🎁 GIVEAWAY
    if (i.commandName === "giveaway") {

        const prize = i.options.getString("nagroda");
        const time = parseTime(i.options.getString("czas"));

        data.giveaway = {
            active: true,
            prize,
            entries: {},
            rolesBonus: data.giveaway.rolesBonus || {}
        };

        save();

        const embed = new EmbedBuilder()
            .setTitle("🎉 GIVEAWAY")
            .setDescription(`Nagroda: **${prize}**\nKliknij aby dołączyć`)
            .setColor(0x00ffcc);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("join")
                .setLabel("Weź udział")
                .setStyle(ButtonStyle.Success)
        );

        const msg = await i.reply({ embeds: [embed], components: [row], fetchReply: true });

        setTimeout(async () => {

            const users = Object.entries(data.giveaway.entries);
            if (users.length === 0) return;

            const pool = [];

            users.forEach(([id, count]) => {
                for (let i = 0; i < count; i++) pool.push(id);
            });

            const winner = pool[Math.floor(Math.random() * pool.length)];

            msg.reply(`🎉 Wygrał: <@${winner}> | ${prize}`);

            data.giveaway.active = false;
            save();

        }, time);
    }

    // 📊 NEXT EVENTS
    if (i.commandName === "next-events") {

        const now = new Date();
        const h = now.getHours();

        return i.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("📊 Eventy")
                    .setDescription(
`🔥 TERAZ → ${getEvent(h)}
⏰ Następny → ${getEvent((h+1)%24)}
⏰ Kolejny → ${getEvent((h+2)%24)}`
                    )
                    .setColor(0x5865F2)
            ]
        });
    }

    // 🔄 REFRESH
    if (i.commandName === "refresh") {
        await registerCommands();
        return i.reply({ content: "✅ Odświeżono", ephemeral: true });
    }

});

client.login(TOKEN);
