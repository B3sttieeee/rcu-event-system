const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField
} = require('discord.js');

const cron = require('node-cron');
const fs = require('fs');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;

const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1484937784283369502';

// ✅ WAŻNE — JEDEN PLIK Z DASHBOARD
const FILE = './dashboard/data.json';

// 📁 LOAD DATA
let data = {
    events: {},
    roles: { jajko: null, merchant: null, spin: null },
    dm: []
};

function loadData() {
    if (fs.existsSync(FILE)) {
        data = JSON.parse(fs.readFileSync(FILE));
    }
}

function save() {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// ⏰ FORMAT
const format = h => `${h.toString().padStart(2, '0')}:00`;

// 🎯 GET EVENT (z dashboard)
function getEventByHour(h) {
    loadData();

    for (const key of Object.keys(data.events)) {
        const ev = data.events[key];
        if (!ev.hours) continue;

        const hours = ev.hours.split(',').map(x => parseInt(x.trim()));
        if (hours.includes(h)) {
            return { ...ev, key };
        }
    }

    return null;
}

// 🎨 EMBED
function createEmbed(event, status, h) {
    if (!event) return null;

    return new EmbedBuilder()
        .setColor(event.color || '#5865F2')
        .setTitle(`🎯 ${event.name}`)
        .setDescription(
`📊 **${status}**

${event.description || "Brak opisu"}

⏰ Godzina: \`${format(h)}\``
        )
        .setImage(event.image || null)
        .setFooter({ text: "RCU • EVENT SYSTEM" })
        .setTimestamp();
}

// 📩 DM
async function sendDM(embed) {
    for (const id of data.dm || []) {
        try {
            const user = await client.users.fetch(id);
            await user.send({ embeds: [embed] });
        } catch {}
    }
}

// 🚀 READY
client.once('ready', async () => {

    console.log(`✅ ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder().setName('test').setDescription('Aktualny event'),
        new SlashCommandBuilder().setName('next').setDescription('Następne eventy'),
        new SlashCommandBuilder().setName('dm').setDescription('Toggle DM'),
        new SlashCommandBuilder().setName('check-pings').setDescription('Status pingów')
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    console.log("✅ Commands ready");

    // 🔁 CRON
    cron.schedule('* * * * *', async () => {

        const channel = await client.channels.fetch(CHANNEL_ID);

        const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
        const h = now.getHours();
        const m = now.getMinutes();

        // 🔔 5 MIN PRZED
        if (m === 55) {
            const nextH = (h + 1) % 24;
            const event = getEventByHour(nextH);
            if (!event) return;

            const role = event.roleId;
            if (!role) return;

            const embed = createEmbed(event, "🔔 ZA 5 MINUT", nextH);

            channel.send({
                content: `<@&${role}>`,
                embeds: [embed]
            });

            sendDM(embed);
        }

        // ⏰ START
        if (m === 0) {
            const event = getEventByHour(h);
            if (!event) return;

            const role = event.roleId;
            if (!role) return;

            const embed = createEmbed(event, "⏰ START EVENTU", h);

            channel.send({
                content: `<@&${role}>`,
                embeds: [embed]
            });

            sendDM(embed);
        }

    });
});

// ⚡ INTERAKCJE
client.on('interactionCreate', async i => {

    if (i.isChatInputCommand()) {

        loadData();

        const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
        let h = now.getHours();
        let m = now.getMinutes();

        // 🧪 TEST
        if (i.commandName === 'test') {
            const event = getEventByHour(h);
            if (!event) return i.reply("Brak eventu");

            return i.reply({
                embeds: [createEmbed(event, "AKTYWNY", h)]
            });
        }

        // ⏭ NEXT
        if (i.commandName === 'next') {

            if (m > 0) h = (h + 1) % 24;

            const e1 = getEventByHour(h);
            const e2 = getEventByHour((h + 1) % 24);

            const embeds = [];

            if (e1) embeds.push(createEmbed(e1, "NADCHODZI", h));
            if (e2) embeds.push(createEmbed(e2, "KOLEJNY", (h + 1) % 24));

            return i.reply({ embeds });
        }

        // 📊 CHECK
        if (i.commandName === 'check-pings') {

            if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
                return i.reply({ content: "❌ brak permisji", ephemeral: true });

            const list = Object.values(data.events).map(ev =>
`${ev.name}: ${ev.roleId ? `<@&${ev.roleId}>` : "❌ brak roli"}`
            ).join('\n');

            return i.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setTitle("📊 STATUS PINGÓW")
                        .setDescription(list + `\n\n📡 Kanał: <#${CHANNEL_ID}>`)
                        .setTimestamp()
                ],
                ephemeral: true
            });
        }

        // 📩 DM
        if (i.commandName === 'dm') {
            const id = i.user.id;

            if (data.dm.includes(id)) {
                data.dm = data.dm.filter(x => x !== id);
                save();
                return i.reply({ content: "❌ DM OFF", ephemeral: true });
            } else {
                data.dm.push(id);
                save();
                return i.reply({ content: "✅ DM ON", ephemeral: true });
            }
        }
    }
});

client.login(TOKEN);
