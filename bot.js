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
    StringSelectMenuBuilder,
    PermissionsBitField
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

// 📦 DATA
let data = {
    dm: {},
    giveawayRoles: {}
};

if (fs.existsSync(FILE)) {
    data = JSON.parse(fs.readFileSync(FILE));
}

function save() {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// 📌 STAŁE ROLE
const ROLES = {
    egg: "1476000993119568105",
    merchant: "1476000993660502139",
    spin: "1484911421903999127"
};

// 🖼️ OBRAZY
const IMAGES = {
    egg: "https://imgur.com/pY2xNUL.png",
    boss: "https://imgur.com/VU9KdMS.png",
    honey: "https://imgur.com/SsvlJ5a.png",
    spin: "https://imgur.com/LeXDgiJ.png"
};

// ⏰ CZAS (NAPRAWIONY)
function getTime() {
    const now = new Date();
    const warsaw = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
    return warsaw;
}

// 🎯 EVENT
function getEvent(h) {
    if ([0,3,6,9,12,15,18,21].includes(h)) return "egg";
    if ([1,4,7,10,13,16,19,22].includes(h)) return "merchant";
    return "spin";
}

// ⏭️ następny event (NAPRAWIONY)
function getNextEvent(currentHour) {
    for (let i = 1; i <= 24; i++) {
        const h = (currentHour + i) % 24;
        const type = getEvent(h);
        return { hour: h, type };
    }
}

// 📩 DM
async function sendDM(type, embed) {
    for (const userId in data.dm) {
        if (!data.dm[userId]?.includes(type)) continue;
        try {
            const user = await client.users.fetch(userId);
            await user.send({ embeds: [embed] });
        } catch {}
    }
}

// 🎉 GIVEAWAY
let giveaways = new Map();

function parseTime(str) {
    const num = parseInt(str);
    if (str.endsWith("s")) return num * 1000;
    if (str.endsWith("m")) return num * 60000;
    if (str.endsWith("h")) return num * 3600000;
    if (str.endsWith("d")) return num * 86400000;
    return 60000;
}

// 🔄 COMMANDS
async function registerCommands() {
    const commands = [
        new SlashCommandBuilder().setName('event').setDescription('Aktualny event'),
        new SlashCommandBuilder().setName('next-events').setDescription('Następne eventy'),

        new SlashCommandBuilder().setName('get-role').setDescription('Panel ról'),

        new SlashCommandBuilder().setName('set-dm').setDescription('Ustaw powiadomienia DM'),

        new SlashCommandBuilder()
            .setName('giveaway')
            .setDescription('Stwórz giveaway')
            .addStringOption(o=>o.setName('nagroda').setDescription('Nagroda').setRequired(true))
            .addStringOption(o=>o.setName('czas').setDescription('Czas np 1h').setRequired(true))
            .addIntegerOption(o=>o.setName('wygrani').setDescription('Ilu wygranych').setRequired(true)),

        new SlashCommandBuilder()
            .setName('giveaway-role')
            .setDescription('Dodaj mnożnik roli')
            .addRoleOption(o=>o.setName('rola').setDescription('Rola').setRequired(true))
            .addIntegerOption(o=>o.setName('ilosc').setDescription('Ile wejść').setRequired(true))
    ].map(c=>c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    console.log("✅ Komendy załadowane");
}

// 🚀 READY
client.once('clientReady', async () => {
    console.log("✅ BOT ONLINE");
    await registerCommands();

    cron.schedule('* * * * *', async () => {
        const now = getTime();
        const h = now.getHours();
        const m = now.getMinutes();

        const channel = await client.channels.fetch(CHANNEL_ID);
        const type = getEvent(h);

        // 🔔 reminder 5 min
        if (m === 55) {
            const next = getNextEvent(h);
            const role = ROLES[next.type];
            channel.send(`⏰ Za 5 minut event <@&${role}>`);
        }

        // 🎯 start
        if (m !== 0) return;

        const role = ROLES[type];

        if (type === "merchant") {
            await channel.send(`<@&${role}>`);

            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("🔥 **BOSS MERCHANT**")
                        .setDescription("**Eventowy merchant na mapie Anniversary Event**\n\n➡️ Sprawdź ofertę!\n⏳ Dostępny 15 minut")
                        .setThumbnail(IMAGES.boss)
                ]
            });

            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("🍯 **HONEY MERCHANT**")
                        .setDescription("**Eventowy merchant**\n\n➡️ Sprawdź ofertę!\n⏳ Dostępny 15 minut")
                        .setThumbnail(IMAGES.honey)
                ]
            });

        } else {

            const embed = new EmbedBuilder()
                .setTitle(
                    type === "egg" ? "🥚 **RNG EGG**" :
                    "🎰 **DEV SPIN**"
                )
                .setDescription(
                    type === "egg"
                    ? "**Otwieraj jajka i zdobywaj tier!**"
                    : "**Kręć kołem i zdobywaj nagrody!**"
                )
                .setThumbnail(type === "egg" ? IMAGES.egg : IMAGES.spin);

            await channel.send({
                content: `<@&${role}>`,
                embeds: [embed]
            });

            sendDM(type, embed);
        }
    });
});

// ⚡ INTERACTIONS
client.on('interactionCreate', async i => {

    if (i.isChatInputCommand()) {

        const now = getTime();
        const h = now.getHours();

        // EVENT
        if (i.commandName === 'event') {
            const type = getEvent(h);

            return i.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("📊 **AKTUALNY EVENT**")
                        .setDescription(`🔥 **${type.toUpperCase()}**`)
                ]
            });
        }

        // NEXT EVENTS
        if (i.commandName === 'next-events') {
            const next = getNextEvent(h);

            return i.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("📅 **NASTĘPNE EVENTY**")
                        .setDescription(`➡️ ${next.type} o ${next.hour}:00`)
                ]
            });
        }

        // ROLE PANEL
        if (i.commandName === 'get-role') {

            const menu = new StringSelectMenuBuilder()
                .setCustomId('roles')
                .setMinValues(1)
                .setMaxValues(3)
                .addOptions([
                    { label: 'RNG EGG', value: 'egg' },
                    { label: 'MERCHANT', value: 'merchant' },
                    { label: 'DEV SPIN', value: 'spin' }
                ]);

            return i.reply({
                content: "🎯 Wybierz role:",
                components: [new ActionRowBuilder().addComponents(menu)],
                ephemeral: true
            });
        }

        // DM
        if (i.commandName === 'set-dm') {

            const menu = new StringSelectMenuBuilder()
                .setCustomId('dm')
                .setMinValues(1)
                .setMaxValues(3)
                .addOptions([
                    { label: 'RNG EGG', value: 'egg' },
                    { label: 'MERCHANT', value: 'merchant' },
                    { label: 'DEV SPIN', value: 'spin' }
                ]);

            return i.reply({
                content: "📩 Wybierz DM:",
                components: [new ActionRowBuilder().addComponents(menu)],
                ephemeral: true
            });
        }

        // GIVEAWAY
        if (i.commandName === 'giveaway') {

            const reward = i.options.getString('nagroda');
            const time = i.options.getString('czas');
            const winners = i.options.getInteger('wygrani');

            const ms = parseTime(time);
            const end = Date.now() + ms;

            const embed = new EmbedBuilder()
                .setTitle(`🎁 ${reward}`)
                .setDescription(`Kliknij 🎉 aby wziąć udział!\n\n🏆 Wygrani: ${winners}\n⏳ Koniec: <t:${Math.floor(end/1000)}:R>`);

            const msg = await i.reply({ embeds: [embed], fetchReply: true });

            await msg.react("🎉");

            giveaways.set(msg.id, {
                end,
                winners
            });
        }

        // GIVEAWAY ROLE BONUS
        if (i.commandName === 'giveaway-role') {

            const role = i.options.getRole('rola');
            const amount = i.options.getInteger('ilosc');

            data.giveawayRoles[role.id] = amount;
            save();

            return i.reply({
                content: `✅ ${role} = ${amount} wejść`,
                ephemeral: true
            });
        }
    }

    // ROLE PICKER
    if (i.isStringSelectMenu()) {

        if (i.customId === "roles") {
            for (const val of i.values) {
                const roleId = ROLES[val];
                const has = i.member.roles.cache.has(roleId);

                if (has) await i.member.roles.remove(roleId);
                else await i.member.roles.add(roleId);
            }

            return i.update({ content: "✅ Zaktualizowano role", components: [] });
        }

        if (i.customId === "dm") {
            data.dm[i.user.id] = i.values;
            save();

            return i.update({ content: "✅ DM zapisane", components: [] });
        }
    }

});

client.login(TOKEN);
