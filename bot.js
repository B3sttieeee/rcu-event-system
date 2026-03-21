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

const fs = require('fs');
const cron = require('node-cron');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;

const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1484937784283369502';

const FILE = './data.json';

// 📁 DATA
let data = {
    roles: { egg: null, merchant: null, spin: null },
    hours: {
        egg: [0,3,6,9,12,15,18,21],
        merchant: [1,4,7,10,13,16,19,22],
        spin: [2,5,8,11,14,17,20,23]
    },
    embed: {
        egg: { title: "🥚 RNG EGG", desc: "Zbierasz punkty", color: 0x00ffc8, image: "" },
        merchant: { title: "🐝 MERCHANT", desc: "Kupujesz itemy", color: 0xffaa00, image: "" },
        spin: { title: "🎰 SPIN", desc: "Koło losowania", color: 0xff0055, image: "" }
    },
    dm: []
};

if (fs.existsSync(FILE)) data = JSON.parse(fs.readFileSync(FILE));
const save = () => fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

// 🎯 EVENT
function getEvent(h) {
    if (data.hours.egg.includes(h)) return "egg";
    if (data.hours.merchant.includes(h)) return "merchant";
    return "spin";
}

// 🎨 EMBED BUILDER
function buildEmbed(type, status, h) {
    const e = data.embed[type];

    const embed = new EmbedBuilder()
        .setColor(e.color)
        .setTitle(e.title)
        .setDescription(`📊 **${status}**\n\n${e.desc}\n\n⏰ ${h}:00`)
        .setTimestamp();

    if (e.image) embed.setImage(e.image);

    return embed;
}

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
        new SlashCommandBuilder().setName('next-event').setDescription('Następne'),
        new SlashCommandBuilder().setName('check-pings').setDescription('Status'),

        new SlashCommandBuilder()
            .setName('roles-add')
            .setDescription('Ustaw role')
            .addStringOption(o => o.setName('typ').setRequired(true).addChoices(
                {name:"egg",value:"egg"},
                {name:"merchant",value:"merchant"},
                {name:"spin",value:"spin"}
            ))
            .addRoleOption(o => o.setName('rola').setRequired(true)),

        new SlashCommandBuilder()
            .setName('set-hours')
            .setDescription('Ustaw godziny')
            .addStringOption(o => o.setName('typ').setRequired(true))
            .addStringOption(o => o.setName('godziny').setRequired(true)),

        new SlashCommandBuilder()
            .setName('set-embed')
            .setDescription('Custom embed')
            .addStringOption(o => o.setName('typ').setRequired(true))
            .addStringOption(o => o.setName('title'))
            .addStringOption(o => o.setName('desc'))
            .addStringOption(o => o.setName('image')),

        new SlashCommandBuilder().setName('set-dm').setDescription('DM ON/OFF'),
        new SlashCommandBuilder().setName('panel').setDescription('Panel')
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    // ⏱ CRON
    cron.schedule('* * * * *', async () => {
        const channel = await client.channels.fetch(CHANNEL_ID);

        const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
        const h = now.getHours();
        const m = now.getMinutes();

        // 5 min before
        if (m === 55) {
            const nh = (h + 1) % 24;
            const type = getEvent(nh);
            const role = data.roles[type];
            if (!role) return;

            const embed = buildEmbed(type, "ZA 5 MINUT", nh);
            channel.send({ content: `<@&${role}>`, embeds: [embed] });
            sendDM([embed]);
        }

        // start
        if (m === 0) {
            const type = getEvent(h);
            const role = data.roles[type];
            if (!role) return;

            const embed = buildEmbed(type, "START", h);
            channel.send({ content: `<@&${role}>`, embeds: [embed] });
            sendDM([embed]);
        }
    });
});

// ⚡ KOMENDY
client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand() && !i.isButton()) return;

    // PANEL
    if (i.commandName === 'panel') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('status').setLabel('Status').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('dm').setLabel('DM').setStyle(ButtonStyle.Success)
        );

        return i.reply({ content: "Panel", components: [row], ephemeral: true });
    }

    // BUTTONY
    if (i.isButton()) {
        if (i.customId === 'status') {
            return i.reply({ content: "Use /check-pings", ephemeral: true });
        }

        if (i.customId === 'dm') {
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

    if (!i.isChatInputCommand()) return;

    // EVENT
    if (i.commandName === 'event') {
        const now = new Date();
        const h = now.getHours();
        const type = getEvent(h);

        return i.reply({ embeds: [buildEmbed(type, "AKTYWNY", h)] });
    }

    // NEXT
    if (i.commandName === 'next-event') {
        const now = new Date();
        let h = now.getHours() + 1;

        const e1 = getEvent(h % 24);
        const e2 = getEvent((h + 1) % 24);

        return i.reply({
            embeds: [
                buildEmbed(e1, "NADCHODZI", h % 24),
                buildEmbed(e2, "KOLEJNY", (h + 1) % 24)
            ]
        });
    }

    // CHECK
    if (i.commandName === 'check-pings') {
        return i.reply({
            content:
`🥚 ${data.roles.egg ? `<@&${data.roles.egg}>` : "❌"}
🐝 ${data.roles.merchant ? `<@&${data.roles.merchant}>` : "❌"}
🎰 ${data.roles.spin ? `<@&${data.roles.spin}>` : "❌"}`,
            ephemeral: true
        });
    }

    // ROLES
    if (i.commandName === 'roles-add') {
        const type = i.options.getString('typ');
        const role = i.options.getRole('rola');

        data.roles[type] = role.id;
        save();

        return i.reply({ content: "✅ ustawiono", ephemeral: true });
    }

    // HOURS
    if (i.commandName === 'set-hours') {
        const type = i.options.getString('typ');
        const hours = i.options.getString('godziny')
            .split(',')
            .map(x => parseInt(x.trim()));

        data.hours[type] = hours;
        save();

        return i.reply({ content: "✅ godziny zapisane", ephemeral: true });
    }

    // EMBED
    if (i.commandName === 'set-embed') {
        const type = i.options.getString('typ');
        const title = i.options.getString('title');
        const desc = i.options.getString('desc');
        const image = i.options.getString('image');

        if (title) data.embed[type].title = title;
        if (desc) data.embed[type].desc = desc;
        if (image) data.embed[type].image = image;

        save();

        return i.reply({ content: "✅ embed zapisany", ephemeral: true });
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
