const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionsBitField
} = require('discord.js');

const express = require('express');
const cron = require('node-cron');
const fs = require('fs');

const app = express();
app.use(express.json());

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;

const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1484937784283369502';

// 📁 DATA
const FILE = './dashboard/data.json';

let data = { events: {}, dm: [] };

function loadData() {
    if (fs.existsSync(FILE)) {
        data = JSON.parse(fs.readFileSync(FILE));
    }
}

// 🌐 STRONA (ŻEBY RAILWAY NIE CRASHOWAŁ)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/dashboard/public/index.html');
});

app.use(express.static('dashboard/public'));

// API SAVE
app.post('/save', (req, res) => {
    fs.writeFileSync(FILE, JSON.stringify(req.body, null, 2));
    res.sendStatus(200);
});

// 🚀 START SERWERA
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("🌐 Dashboard działa"));


// 🎯 EVENT
function getEventByHour(h) {
    loadData();

    for (const key of Object.keys(data.events)) {
        const ev = data.events[key];
        const hours = ev.hours.split(',').map(x => parseInt(x));

        if (hours.includes(h)) return ev;
    }
    return null;
}

// ⏰ FORMAT
const format = h => `${h.toString().padStart(2, '0')}:00`;

// 🎨 EMBED
function createEmbed(event, status, h) {
    return new EmbedBuilder()
        .setColor(event.color || '#5865F2')
        .setTitle(event.name || "EVENT")
        .setDescription(
`📊 **${status}**

${event.description || ""}

⏰ ${format(h)}`
        )
        .setImage(event.image || null)
        .setTimestamp();
}

// 🤖 READY
client.once('ready', async () => {

    console.log(`✅ ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder().setName('test').setDescription('Test event'),
        new SlashCommandBuilder().setName('next').setDescription('Next events'),
        new SlashCommandBuilder().setName('check-pings').setDescription('Status')
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    console.log("✅ Commands ready");

    // ⏰ CRON
    cron.schedule('* * * * *', async () => {

        const channel = await client.channels.fetch(CHANNEL_ID);

        const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
        const h = now.getHours();
        const m = now.getMinutes();

        // 🔔 5 MIN PRZED
        if (m === 55) {
            const e = getEventByHour((h + 1) % 24);
            if (!e || !e.roleId) return;

            channel.send({
                content: `<@&${e.roleId}>`,
                embeds: [createEmbed(e, "ZA 5 MINUT", (h + 1) % 24)]
            });
        }

        // ⏰ START
        if (m === 0) {
            const e = getEventByHour(h);
            if (!e || !e.roleId) return;

            channel.send({
                content: `<@&${e.roleId}>`,
                embeds: [createEmbed(e, "START", h)]
            });
        }

    });
});

// ⚡ KOMENDY
client.on('interactionCreate', async i => {

    if (!i.isChatInputCommand()) return;

    loadData();

    const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
    let h = now.getHours();
    let m = now.getMinutes();

    // TEST
    if (i.commandName === 'test') {
        const e = getEventByHour(h);
        if (!e) return i.reply("Brak eventu");

        return i.reply({
            embeds: [createEmbed(e, "AKTYWNY", h)]
        });
    }

    // NEXT
    if (i.commandName === 'next') {

        if (m > 0) h = (h + 1) % 24;

        const e1 = getEventByHour(h);
        const e2 = getEventByHour((h + 1) % 24);

        return i.reply({
            embeds: [
                e1 ? createEmbed(e1, "NADCHODZI", h) : null,
                e2 ? createEmbed(e2, "KOLEJNY", (h + 1) % 24) : null
            ].filter(Boolean)
        });
    }

    // CHECK
    if (i.commandName === 'check-pings') {

        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return i.reply({ content: "❌ brak permisji", ephemeral: true });

        const list = Object.values(data.events).map(e =>
`${e.name}: ${e.roleId ? `<@&${e.roleId}>` : "❌ brak roli"}`
        ).join('\n');

        return i.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("STATUS PINGÓW")
                    .setDescription(list)
            ],
            ephemeral: true
        });
    }

});

client.login(TOKEN);
