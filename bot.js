process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
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

// ================= API =================

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/dashboard/public/index.html");
});

app.get("/api/data", (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(FILE));
        res.json(data);
    } catch {
        res.json({ events: {} });
    }
});

app.post("/api/save", (req, res) => {
    fs.writeFileSync(FILE, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
});

// 🔥 WAŻNE (Railway)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("🌐 Dashboard działa na porcie", PORT));

// ================= EVENT =================

function getEvent(h, data) {
    for (const key in data.events) {
        if (data.events[key].hours.includes(h)) {
            return { key, ...data.events[key] };
        }
    }
    return null;
}

const format = h => `${h.toString().padStart(2, '0')}:00`;

// ================= EMBED =================

function makeEmbed(e, status, h) {
    return new EmbedBuilder()
        .setColor(parseInt(e.color.replace("#", ""), 16))
        .setTitle(`${e.name}`)
        .setDescription(`📊 **${status}**

${e.description}

⏰ Godzina: \`${format(h)}\``)
        .setImage(e.image || null)
        .setFooter({ text: "RCU • EVENT SYSTEM" })
        .setTimestamp();
}

// ================= READY =================

client.once('ready', async () => {

    console.log(`✅ ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder().setName('test').setDescription('Aktualny event'),
        new SlashCommandBuilder().setName('next').setDescription('2 następne eventy'),
        new SlashCommandBuilder().setName('check-pings').setDescription('Status pingów')
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    console.log("✅ Komendy gotowe");

    // ================= CRON =================

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

            const embed = makeEmbed(e, "🔔 ZA 5 MINUT", nh);

            await channel.send({
                content: `<@&${e.role}>`,
                embeds: [embed]
            });
        }

        // ⏰ START
        if (m === 0) {
            const e = getEvent(h, data);

            if (!e || !e.role) return;

            const embed = makeEmbed(e, "⏰ START EVENTU", h);

            await channel.send({
                content: `<@&${e.role}>`,
                embeds: [embed]
            });
        }

    });

});

// ================= COMMANDS =================

client.on('interactionCreate', async i => {

    if (!i.isChatInputCommand()) return;

    const data = JSON.parse(fs.readFileSync(FILE));

    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
    let h = now.getHours();
    let m = now.getMinutes();

    // TEST
    if (i.commandName === 'test') {
        const e = getEvent(h, data);
        if (!e) return i.reply("Brak eventu");

        return i.reply({
            embeds: [makeEmbed(e, "🧪 AKTUALNY EVENT", h)]
        });
    }

    // NEXT
    if (i.commandName === 'next') {

        if (m > 0) h = (h + 1) % 24;

        const e1 = getEvent(h, data);
        const e2 = getEvent((h + 1) % 24, data);

        return i.reply({
            embeds: [
                makeEmbed(e1, "⏭️ NADCHODZI", h),
                makeEmbed(e2, "🔮 KOLEJNY", (h + 1) % 24)
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
            txt += `**${e.name}** → ${e.role ? `<@&${e.role}>` : "❌ brak roli"}\n`;
        }

        return i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle("📊 STATUS PINGÓW")
                    .setDescription(txt)
            ],
            ephemeral: true
        });
    }

});

// ================= START =================

client.login(TOKEN);
