const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionsBitField
} = require('discord.js');

const fs = require('fs');
const cron = require('node-cron');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;

// 🔧 TWOJE ID (ZOSTAWIAMY)
const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1484937784283369502';

const FILE = './data.json';

// 📁 DATA
let data = {
    roles: {
        egg: null,
        merchant: null,
        spin: null
    },
    dm: []
};

if (fs.existsSync(FILE)) {
    data = JSON.parse(fs.readFileSync(FILE));
}

const save = () => {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
};

// 🎯 EVENT SYSTEM
function getEvent(hour) {
    if ([0,3,6,9,12,15,18,21].includes(hour)) return { type: "egg", name: "RNG EGG" };
    if ([1,4,7,10,13,16,19,22].includes(hour)) return { type: "merchant", name: "MERCHANT" };
    return { type: "spin", name: "DEVS SPIN" };
}

const format = h => `${h.toString().padStart(2, '0')}:00`;

// 🎨 EMBEDY
const embedEgg = (status, h) =>
    new EmbedBuilder()
        .setColor(0x00ffc8)
        .setTitle("🥚 RNG EGG")
        .setDescription(`📊 **${status}**\n\nZbierasz punkty i rozwijasz Tier.\n\n⏰ \`${format(h)}\``)
        .setTimestamp();

const embedBoss = (status, h) =>
    new EmbedBuilder()
        .setColor(0xff8800)
        .setTitle("👹 BOSS MERCHANT")
        .setDescription(`📊 **${status}**\n\nKupujesz itemy za tokeny.\n\n⏰ \`${format(h)}\``)
        .setTimestamp();

const embedHoney = (status, h) =>
    new EmbedBuilder()
        .setColor(0xffcc00)
        .setTitle("🐝 HONEY MERCHANT")
        .setDescription(`📊 **${status}**\n\nKupujesz itemy za miód.\n\n⏰ \`${format(h)}\``)
        .setTimestamp();

const embedSpin = (status, h) =>
    new EmbedBuilder()
        .setColor(0xff0055)
        .setTitle("🎰 DEVS SPIN")
        .setDescription(`📊 **${status}**\n\nKoło losowania.\n\n⏰ \`${format(h)}\``)
        .setTimestamp();

// 📩 DM
async function sendDM(embeds) {
    for (const id of data.dm) {
        try {
            const user = await client.users.fetch(id);
            await user.send({ embeds });
        } catch {}
    }
}

// 🚀 READY
client.once('ready', async () => {
    console.log(`✅ ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder().setName('event').setDescription('Aktualny event'),
        new SlashCommandBuilder().setName('next-event').setDescription('Następne eventy'),
        new SlashCommandBuilder().setName('check-pings').setDescription('Status pingów'),
        new SlashCommandBuilder()
            .setName('roles-add')
            .setDescription('Ustaw role')
            .addStringOption(o =>
                o.setName('typ')
                    .setDescription('egg / merchant / spin')
                    .setRequired(true))
            .addRoleOption(o =>
                o.setName('rola')
                    .setDescription('rola do pingu')
                    .setRequired(true)),
        new SlashCommandBuilder().setName('set-dm').setDescription('DM ON/OFF')
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    console.log("✅ Commands ready");

    // ⏱ CRON
    cron.schedule('* * * * *', async () => {
        const channel = await client.channels.fetch(CHANNEL_ID);

        const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
        const h = now.getHours();
        const m = now.getMinutes();

        // 🔔 5 MIN PRZED
        if (m === 55) {
            const nextH = (h + 1) % 24;
            const e = getEvent(nextH);
            const role = data.roles[e.type];
            if (!role) return;

            let embeds = [];
            if (e.type === "merchant") embeds = [embedBoss("ZA 5 MINUT", nextH), embedHoney("ZA 5 MINUT", nextH)];
            else if (e.type === "egg") embeds = [embedEgg("ZA 5 MINUT", nextH)];
            else embeds = [embedSpin("ZA 5 MINUT", nextH)];

            channel.send({ content: `<@&${role}>`, embeds });
            sendDM(embeds);
        }

        // ⏰ START
        if (m === 0) {
            const e = getEvent(h);
            const role = data.roles[e.type];
            if (!role) return;

            let embeds = [];
            if (e.type === "merchant") embeds = [embedBoss("START", h), embedHoney("START", h)];
            else if (e.type === "egg") embeds = [embedEgg("START", h)];
            else embeds = [embedSpin("START", h)];

            channel.send({ content: `<@&${role}>`, embeds });
            sendDM(embeds);
        }
    });
});

// ⚡ KOMENDY
client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand()) return;

    const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
    let h = now.getHours();
    let m = now.getMinutes();

    // EVENT
    if (i.commandName === 'event') {
        const e = getEvent(h);

        if (e.type === "merchant")
            return i.reply({ embeds: [embedBoss("AKTYWNY", h), embedHoney("AKTYWNY", h)] });

        if (e.type === "egg")
            return i.reply({ embeds: [embedEgg("AKTYWNY", h)] });

        return i.reply({ embeds: [embedSpin("AKTYWNY", h)] });
    }

    // NEXT
    if (i.commandName === 'next-event') {
        if (m > 0) h = (h + 1) % 24;

        const e1 = getEvent(h);
        const e2 = getEvent((h + 1) % 24);

        let embeds = [];

        const add = (e, txt, hour) => {
            if (e.type === "merchant") embeds.push(embedBoss(txt, hour), embedHoney(txt, hour));
            else if (e.type === "egg") embeds.push(embedEgg(txt, hour));
            else embeds.push(embedSpin(txt, hour));
        };

        add(e1, "NADCHODZI", h);
        add(e2, "KOLEJNY", (h + 1) % 24);

        i.reply({ embeds });
    }

    // CHECK
    if (i.commandName === 'check-pings') {
        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return i.reply({ content: "❌ brak permisji", ephemeral: true });

        return i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle("📊 STATUS PINGÓW")
                    .setDescription(
`🥚 RNG: ${data.roles.egg ? `<@&${data.roles.egg}>` : "❌"}
🐝 MERCHANT: ${data.roles.merchant ? `<@&${data.roles.merchant}>` : "❌"}
🎰 SPIN: ${data.roles.spin ? `<@&${data.roles.spin}>` : "❌"}

📡 Kanał: <#${CHANNEL_ID}>`
                    )
            ],
            ephemeral: true
        });
    }

    // ROLES
    if (i.commandName === 'roles-add') {
        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return i.reply({ content: "❌ brak permisji", ephemeral: true });

        const type = i.options.getString('typ');
        const role = i.options.getRole('rola');

        if (!['egg', 'merchant', 'spin'].includes(type))
            return i.reply({ content: "❌ wpisz: egg / merchant / spin", ephemeral: true });

        data.roles[type] = role.id;
        save();

        i.reply({ content: `✅ ustawiono ${type} → ${role}`, ephemeral: true });
    }

    // DM
    if (i.commandName === 'set-dm') {
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
});

client.login(TOKEN);
