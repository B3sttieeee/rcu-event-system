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

const express = require("express");
const fs = require('fs');
const cron = require('node-cron');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const app = express();
app.use(express.json());
app.use(express.static("dashboard/public"));

const TOKEN = process.env.TOKEN;

const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1484937784283369502';

const FILE = "./dashboard/data.json";

// 📥 API
app.get("/api/data", (req, res) => {
    res.json(JSON.parse(fs.readFileSync(FILE)));
});

app.post("/api/save", (req, res) => {
    fs.writeFileSync(FILE, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
});

app.listen(3000, () => console.log("🌐 Dashboard działa"));

// 🎯 EVENT
function getEvent(h, data) {
    for (const key in data.events) {
        if (data.events[key].hours.includes(h)) {
            return { key, ...data.events[key] };
        }
    }
}

const format = h => `${h.toString().padStart(2, '0')}:00`;

// 🎨 EMBED
function makeEmbed(e, status, h) {
    return new EmbedBuilder()
        .setColor(e.color.replace("#", "0x"))
        .setTitle(`${e.name}`)
        .setDescription(`📊 **${status}**

${e.description}

⏰ Godzina: \`${format(h)}\``)
        .setImage(e.image || null)
        .setFooter({ text: "RCU • EVENT SYSTEM" })
        .setTimestamp();
}

// 🚀 READY
client.once('ready', async () => {

    console.log(`✅ ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder().setName('test').setDescription('Aktualny event'),
        new SlashCommandBuilder().setName('next').setDescription('2 następne'),
        new SlashCommandBuilder().setName('dm').setDescription('DM ON/OFF'),
        new SlashCommandBuilder().setName('check-pings').setDescription('Status pingów')
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    // ⏰ SYSTEM
    cron.schedule('* * * * *', async () => {

        const data = JSON.parse(fs.readFileSync(FILE));

        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
        const h = now.getHours();
        const m = now.getMinutes();

        const channel = await client.channels.fetch(CHANNEL_ID);

        // 🔔 5 MIN PRZED
        if (m === 55) {
            const nh = (h + 1) % 24;
            const e = getEvent(nh, data);
            if (!e || !e.role) return;

            const embed = makeEmbed(e, "ZA 5 MINUT", nh);

            channel.send({ content: `<@&${e.role}>`, embeds: [embed] });
        }

        // ⏰ START
        if (m === 0) {
            const e = getEvent(h, data);
            if (!e || !e.role) return;

            const embed = makeEmbed(e, "START", h);

            channel.send({ content: `<@&${e.role}>`, embeds: [embed] });
        }

    });

});

// ⚡ KOMENDY
client.on('interactionCreate', async i => {

    if (!i.isChatInputCommand()) return;

    const data = JSON.parse(fs.readFileSync(FILE));

    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
    let h = now.getHours();
    let m = now.getMinutes();

    // TEST
    if (i.commandName === 'test') {
        const e = getEvent(h, data);
        return i.reply({ embeds: [makeEmbed(e, "AKTYWNY", h)] });
    }

    // NEXT
    if (i.commandName === 'next') {

        if (m > 0) h = (h + 1) % 24;

        const e1 = getEvent(h, data);
        const e2 = getEvent((h + 1) % 24, data);

        return i.reply({
            embeds: [
                makeEmbed(e1, "NADCHODZI", h),
                makeEmbed(e2, "KOLEJNY", (h + 1) % 24)
            ]
        });
    }

    // CHECK
    if (i.commandName === 'check-pings') {

        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return i.reply({ content: "❌ brak permisji", ephemeral: true });

        let txt = "";

        for (const key in data.events) {
            const e = data.events[key];
            txt += `**${e.name}** → ${e.role ? `<@&${e.role}>` : "❌"}\n`;
        }

        return i.reply({
            embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle("📊 STATUS").setDescription(txt)],
            ephemeral: true
        });
    }

});

client.login(TOKEN);
