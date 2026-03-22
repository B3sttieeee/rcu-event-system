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

const FILE = './data.json';

// 📦 DATA
let data = { dm: {} };

if (fs.existsSync(FILE)) {
    const loaded = JSON.parse(fs.readFileSync(FILE));
    data.dm = loaded.dm || {};
}

function save() {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// 📌 ROLE ID
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
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
}

// 🎯 EVENT SYSTEM (POPRAWNY)
function getEvent(h) {
    if ([0,3,6,9,12,15,18,21].includes(h)) return "egg";
    if ([1,4,7,10,13,16,19,22].includes(h)) return "merchant";
    return "spin";
}

// ⏭️ NEXT EVENT (NAPRAWIONY)
function getNextEvents(h) {
    let list = [];

    for (let i = 1; i <= 24; i++) {
        const hour = (h + i) % 24;
        list.push({
            type: getEvent(hour),
            hour: hour
        });

        if (list.length === 2) break;
    }

    return list;
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

// 🔄 COMMANDS
async function registerCommands() {
    const commands = [
        new SlashCommandBuilder().setName('event').setDescription('Aktualny event'),
        new SlashCommandBuilder().setName('next-events').setDescription('Następne eventy'),
        new SlashCommandBuilder().setName('get-role').setDescription('Panel ról'),
        new SlashCommandBuilder().setName('set-dm').setDescription('Ustaw DM')
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );

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

        // 🔔 reminder 5 min
        if (m === 55) {
            const next = getNextEvents(h)[0];
            const role = ROLES[next.type];

            await channel.send(`⏰ Za 5 minut event <@&${role}>`);
        }

        if (m !== 0) return;

        const type = getEvent(h);
        const role = ROLES[type];

        // 🐝 MERCHANT (2 EMBEDY 1 PING)
        if (type === "merchant") {

            await channel.send(`<@&${role}>`);

            const boss = new EmbedBuilder()
                .setTitle("🔥 **BOSS MERCHANT**")
                .setDescription(
`**Eventowy merchant na mapie Anniversary Event**

➡️ Sprawdź ofertę!
⏳ Dostępny przez 15 minut`
                )
                .setThumbnail(IMAGES.boss);

            const honey = new EmbedBuilder()
                .setTitle("🍯 **HONEY MERCHANT**")
                .setDescription(
`**Eventowy merchant**

➡️ Sprawdź ofertę!
⏳ Dostępny przez 15 minut`
                )
                .setThumbnail(IMAGES.honey);

            await channel.send({ embeds: [boss] });
            await channel.send({ embeds: [honey] });

            return;
        }

        // 🥚 / 🎰
        const embed = new EmbedBuilder()
            .setTitle(
                type === "egg"
                ? "🥚 **RNG EGG**"
                : "🎰 **DEV SPIN**"
            )
            .setDescription(
                type === "egg"
                ? `**Otwieraj jajko i zdobywaj punkty Tier!**`
                : `**Kręć kołem i zdobywaj nagrody!**`
            )
            .setThumbnail(type === "egg" ? IMAGES.egg : IMAGES.spin);

        await channel.send({
            content: `<@&${role}>`,
            embeds: [embed]
        });

        sendDM(type, embed);
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

            const list = getNextEvents(h);

            return i.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("📅 **NASTĘPNE EVENTY**")
                        .setDescription(
`➡️ ${list[0].type} o ${list[0].hour}:00
➡️ ${list[1].type} o ${list[1].hour}:00`
                        )
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
                content: "📩 Wybierz powiadomienia:",
                components: [new ActionRowBuilder().addComponents(menu)],
                ephemeral: true
            });
        }
    }

    // SELECT MENU
    if (i.isStringSelectMenu()) {

        if (i.customId === "roles") {

            for (const val of i.values) {

                const roleId = ROLES[val];
                const has = i.member.roles.cache.has(roleId);

                if (has) await i.member.roles.remove(roleId);
                else await i.member.roles.add(roleId);
            }

            return i.update({
                content: "✅ Role zaktualizowane",
                components: []
            });
        }

        if (i.customId === "dm") {

            data.dm[i.user.id] = i.values;
            save();

            return i.update({
                content: "✅ DM zapisane",
                components: []
            });
        }
    }
});

client.login(TOKEN);
