const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionsBitField
} = require('discord.js');

const cron = require('node-cron');
const fs = require('fs');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;

// 🔥 TWOJE ID (ZOSTAWIAMY)
const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1484937784283369502';

const FILE = './data.json';

// 📦 DATA
let data = {
    roles: {
        jajko: null,
        merchant: null,
        spin: null
    },
    dm: []
};

if (fs.existsSync(FILE)) {
    data = JSON.parse(fs.readFileSync(FILE));
}

const save = () => fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

// 🎯 EVENT SYSTEM
function getEvent(hour) {
    if ([0,3,6,9,12,15,18,21].includes(hour)) return { type: "egg", key: "jajko", name: "RNG EGG" };
    if ([1,4,7,10,13,16,19,22].includes(hour)) return { type: "merchant", key: "merchant", name: "MERCHANT" };
    return { type: "spin", key: "spin", name: "DEVS SPIN" };
}

const format = h => `${h.toString().padStart(2, '0')}:00`;

// 💎 EMBED
function createEmbed(status, hour, event) {
    return new EmbedBuilder()
        .setColor(
            event.type === "egg" ? 0x00ffc8 :
            event.type === "merchant" ? 0xff8800 :
            0xff0055
        )
        .setTitle(`🎯 ${event.name}`)
        .setDescription(`📊 **${status}**\n⏰ \`${format(hour)}\``)
        .setFooter({ text: "RCU EVENT SYSTEM" })
        .setTimestamp();
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
        new SlashCommandBuilder()
            .setName('event')
            .setDescription('Aktualny event'),

        new SlashCommandBuilder()
            .setName('next-event')
            .setDescription('Następne eventy'),

        new SlashCommandBuilder()
            .setName('check-pings')
            .setDescription('Status pingów'),

        new SlashCommandBuilder()
            .setName('roles-add')
            .setDescription('Ustaw role do pingów')
            .addStringOption(opt =>
                opt.setName('typ')
                    .setDescription('Typ eventu')
                    .setRequired(true)
                    .addChoices(
                        { name: 'RNG', value: 'jajko' },
                        { name: 'MERCHANT', value: 'merchant' },
                        { name: 'SPIN', value: 'spin' }
                    )
            )
            .addRoleOption(opt =>
                opt.setName('rola')
                    .setDescription('Rola')
                    .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName('set-dm')
            .setDescription('Włącz / wyłącz DM')
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    console.log("✅ Commands ready");

    // ⏰ CRON (CO MINUTE)
    cron.schedule('* * * * *', async () => {
        const channel = await client.channels.fetch(CHANNEL_ID);

        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
        const h = now.getHours();
        const m = now.getMinutes();

        // 🔔 5 MIN PRZED
        if (m === 55) {
            const nextH = (h + 1) % 24;
            const event = getEvent(nextH);
            const role = data.roles[event.key];
            if (!role) return;

            const embed = createEmbed("ZA 5 MINUT", nextH, event);

            await channel.send({
                content: `<@&${role}>`,
                embeds: [embed]
            });

            sendDM([embed]);
        }

        // 🚀 START
        if (m === 0) {
            const event = getEvent(h);
            const role = data.roles[event.key];
            if (!role) return;

            const embed = createEmbed("START", h, event);

            await channel.send({
                content: `<@&${role}>`,
                embeds: [embed]
            });

            sendDM([embed]);
        }
    });
});

// ⚡ KOMENDY
client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand()) return;

    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
    let h = now.getHours();
    let m = now.getMinutes();

    // 📊 EVENT
    if (i.commandName === 'event') {
        const event = getEvent(h);
        return i.reply({ embeds: [createEmbed("AKTYWNY", h, event)] });
    }

    // ⏭ NEXT
    if (i.commandName === 'next-event') {
        if (m > 0) h = (h + 1) % 24;

        const e1 = getEvent(h);
        const e2 = getEvent((h + 1) % 24);

        return i.reply({
            embeds: [
                createEmbed("NADCHODZI", h, e1),
                createEmbed("KOLEJNY", (h + 1) % 24, e2)
            ]
        });
    }

    // 📊 CHECK
    if (i.commandName === 'check-pings') {
        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return i.reply({ content: "❌ brak permisji", ephemeral: true });

        return i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle("📊 STATUS PINGÓW")
                    .setDescription(
`🥚 RNG: ${data.roles.jajko ? `<@&${data.roles.jajko}>` : "❌"}
🐝 MERCHANT: ${data.roles.merchant ? `<@&${data.roles.merchant}>` : "❌"}
🎰 SPIN: ${data.roles.spin ? `<@&${data.roles.spin}>` : "❌"}

📡 Kanał: <#${CHANNEL_ID}>`
                    )
                    .setTimestamp()
            ],
            ephemeral: true
        });
    }

    // 🛠 ROLE SET
    if (i.commandName === 'roles-add') {
        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return i.reply({ content: "❌ brak permisji", ephemeral: true });

        const type = i.options.getString('typ');
        const role = i.options.getRole('rola');

        data.roles[type] = role.id;
        save();

        return i.reply({ content: `✅ Ustawiono ${role} dla ${type}`, ephemeral: true });
    }

    // 📩 DM
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
