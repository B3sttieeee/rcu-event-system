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

// 🔧 TWOJE ID (ZOSTAWIAM)
const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1484937784283369502';

const FILE = './data.json';

let data = {
    roles: { egg: null, merchant: null, spin: null },
    dm: []
};

if (fs.existsSync(FILE)) data = JSON.parse(fs.readFileSync(FILE));
const save = () => fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

// 🎯 EVENT SYSTEM
function getEvent(h) {
    if ([0,3,6,9,12,15,18,21].includes(h))
        return { type: "egg", name: "🥚 RNG EGG", color: 0x00ffc8 };

    if ([1,4,7,10,13,16,19,22].includes(h))
        return { type: "merchant", name: "🐝 BOSS / HONEY MERCHANT", color: 0xffcc00 };

    return { type: "spin", name: "🎰 DEVS SPIN", color: 0xff0055 };
}

const format = h => `${h.toString().padStart(2, '0')}:00`;

// 🎨 EMBED
function createEmbed(event, status, h) {

    let desc = `📊 **Status:** ${status}\n⏰ **Godzina:** \`${format(h)}\`\n\n`;

    if (event.type === "egg") {
        desc += "Zbierasz punkty na Anniversary Event.\nZwiększasz Tier i zdobywasz bonusy do jajka.";
    }

    if (event.type === "merchant") {
        desc += "👹 Boss Merchant → itemy za Boss Tokeny\n🐝 Honey Merchant → itemy za miód";
    }

    if (event.type === "spin") {
        desc += "Koło losowania nagród na Anniversary Event.\nMożesz zakręcić i zdobyć nagrody.";
    }

    return new EmbedBuilder()
        .setColor(event.color)
        .setTitle(event.name)
        .setDescription(desc)
        .setFooter({ text: "RCU • EVENT SYSTEM" })
        .setTimestamp();
}

// 📩 DM
async function sendDM(embed) {
    for (const id of data.dm) {
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
        new SlashCommandBuilder().setName('event').setDescription('Aktualny event'),
        new SlashCommandBuilder().setName('next-event').setDescription('2 następne eventy'),
        new SlashCommandBuilder().setName('set-dm').setDescription('Włącz / wyłącz DM'),
        new SlashCommandBuilder().setName('check-pings').setDescription('Status pingów'),
        new SlashCommandBuilder().setName('roles-add')
            .setDescription('Ustaw role do pingów')
            .addStringOption(o =>
                o.setName('typ')
                .setDescription('event')
                .setRequired(true)
                .addChoices(
                    { name: 'RNG EGG', value: 'egg' },
                    { name: 'MERCHANT', value: 'merchant' },
                    { name: 'SPIN', value: 'spin' }
                )
            )
            .addRoleOption(o =>
                o.setName('rola')
                .setDescription('rola do pingowania')
                .setRequired(true)
            )
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    console.log("✅ Commands ready");

    // ⏰ SYSTEM
    cron.schedule('* * * * *', async () => {

        const channel = await client.channels.fetch(CHANNEL_ID);

        const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
        const h = now.getHours();
        const m = now.getMinutes();

        // 🔔 5 MIN PRZED
        if (m === 55) {
            const nh = (h + 1) % 24;
            const e = getEvent(nh);

            const role = data.roles[e.type];
            if (!role) return;

            const embed = createEmbed(e, "START ZA 5 MINUT", nh);

            channel.send({
                content: `<@&${role}>`,
                embeds: [embed]
            });

            sendDM(embed);
        }

        // ⏰ START
        if (m === 0) {
            const e = getEvent(h);

            const role = data.roles[e.type];
            if (!role) return;

            const embed = createEmbed(e, "START EVENTU", h);

            channel.send({
                content: `<@&${role}>`,
                embeds: [embed]
            });

            sendDM(embed);
        }

    });
});

// ⚡ KOMENDY
client.on('interactionCreate', async i => {

    if (!i.isChatInputCommand()) return;

    const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
    let h = now.getHours();
    let m = now.getMinutes();

    // 📊 AKTUALNY EVENT
    if (i.commandName === 'event') {
        const e = getEvent(h);
        return i.reply({ embeds: [createEmbed(e, "AKTYWNY", h)] });
    }

    // ⏭ NEXT
    if (i.commandName === 'next-event') {

        if (m > 0) h = (h + 1) % 24;

        const h1 = h;
        const h2 = (h + 1) % 24;

        const e1 = getEvent(h1);
        const e2 = getEvent(h2);

        return i.reply({
            embeds: [
                createEmbed(e1, "NADCHODZI", h1),
                createEmbed(e2, "KOLEJNY", h2)
            ]
        });
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
`🥚 RNG: ${data.roles.egg ? `<@&${data.roles.egg}>` : "❌"}
🐝 MERCHANT: ${data.roles.merchant ? `<@&${data.roles.merchant}>` : "❌"}
🎰 SPIN: ${data.roles.spin ? `<@&${data.roles.spin}>` : "❌"}

📡 Kanał: <#${CHANNEL_ID}>`
                )
                .setTimestamp()
            ],
            ephemeral: true
        });
    }

    // ⚙️ ROLE SET
    if (i.commandName === 'roles-add') {

        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return i.reply({ content: "❌ brak permisji", ephemeral: true });

        const type = i.options.getString('typ');
        const role = i.options.getRole('rola');

        data.roles[type] = role.id;
        save();

        return i.reply({
            content: `✅ Ustawiono rolę ${role} dla ${type}`,
            ephemeral: true
        });
    }

});

client.login(TOKEN);
