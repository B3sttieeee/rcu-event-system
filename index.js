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
    ButtonStyle
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

const FILE = './data.json';

let data = {
    roles: { jajko: null, merchant: null, spin: null },
    dm: []
};

if (fs.existsSync(FILE)) data = JSON.parse(fs.readFileSync(FILE));
const save = () => fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

// 🎯 EVENT LOGIC
function getEvent(h) {
    if ([0,3,6,9,12,15,18,21].includes(h))
        return { name: "RNG EGG", emoji: "🥚", color: 0x00ffc8, role: data.roles.jajko };

    if ([1,4,7,10,13,16,19,22].includes(h))
        return { name: "BOSS / HONEY MERCHANT", emoji: "🐝", color: 0xffcc00, role: data.roles.merchant };

    return { name: "DEVS SPIN (EVENT WORLD)", emoji: "🎰", color: 0xff0055, role: data.roles.spin };
}

const format = h => `${h.toString().padStart(2, '0')}:00`;

// 🔥 CURRENT EVENT EMBED
function embedCurrent(event, h, status) {
    return new EmbedBuilder()
        .setColor(event.color)
        .setAuthor({ name: "RCU • EVENT TRACKER" })
        .setTitle(`${event.emoji} ${event.name}`)
        .addFields(
            { name: "📌 Status", value: `\`${status}\``, inline: true },
            { name: "⏰ Godzina", value: `\`${format(h)}\``, inline: true },
            { name: "🌍 Typ", value: `\`${event.name}\``, inline: false }
        )
        .setFooter({ text: "RCU • System Eventów" })
        .setTimestamp();
}

// ✨ NEXT EVENT EMBED (POJEDYNCZY)
function embedNextSingle(event, h, label) {
    return new EmbedBuilder()
        .setColor(event.color)
        .setTitle(`${event.emoji} ${event.name}`)
        .setDescription(`**${label}**`)
        .addFields(
            { name: "⏰ Start", value: `\`${format(h)}\``, inline: true },
            { name: "📊 Status", value: "`Nadchodzący`", inline: true }
        )
        .setFooter({ text: "RCU • Event Preview" })
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
        new SlashCommandBuilder().setName('test').setDescription('Aktualny event'),
        new SlashCommandBuilder().setName('next').setDescription('Następne eventy'),
        new SlashCommandBuilder().setName('dm').setDescription('DM on/off'),
        new SlashCommandBuilder().setName('panel').setDescription('Ustaw role'),
        new SlashCommandBuilder().setName('roles').setDescription('Wybierz role')
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    console.log("✅ Commands ready");

    cron.schedule('* * * * *', async () => {

        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
        const h = now.getHours();
        const m = now.getMinutes();

        const channel = await client.channels.fetch(CHANNEL_ID);

        // 🔔 5 MIN BEFORE
        if (m === 55) {
            const nextH = (h + 1) % 24;
            const e = getEvent(nextH);

            if (!e.role) return;

            const em = embedCurrent(e, nextH, "ZA 5 MINUT");

            channel.send({ content: `<@&${e.role}>`, embeds: [em] });
            sendDM(em);
        }

        // ⏰ START
        if (m === 0) {
            const e = getEvent(h);

            if (!e.role) return;

            const em = embedCurrent(e, h, "START");

            channel.send({ content: `<@&${e.role}>`, embeds: [em] });
            sendDM(em);
        }

    });
});

// ⚡ INTERACTIONS
client.on('interactionCreate', async i => {

    if (i.isChatInputCommand()) {

        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
        const h = now.getHours();

        // 🧪 CURRENT
        if (i.commandName === 'test') {
            return i.reply({
                embeds: [embedCurrent(getEvent(h), h, "AKTYWNY")]
            });
        }

        // 🔮 NEXT (2 EMBEDY)
        if (i.commandName === 'next') {

            const n1H = (h + 1) % 24;
            const n2H = (h + 2) % 24;

            const e1 = getEvent(n1H);
            const e2 = getEvent(n2H);

            return i.reply({
                embeds: [
                    embedNextSingle(e1, n1H, "Najbliższy event"),
                    embedNextSingle(e2, n2H, "Kolejny event")
                ]
            });
        }

        // DM
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

        // PANEL
        if (i.commandName === 'panel') {

            const menu = new StringSelectMenuBuilder()
                .setCustomId('select_event')
                .addOptions([
                    { label: 'RNG EGG', value: 'jajko' },
                    { label: 'Merchant', value: 'merchant' },
                    { label: 'Spin', value: 'spin' }
                ]);

            return i.reply({
                content: "⚙️ PANEL USTAWIEŃ",
                components: [new ActionRowBuilder().addComponents(menu)]
            });
        }

        // ROLE BUTTONY
        if (i.commandName === 'roles') {

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('r1').setLabel('🥚 RNG').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('r2').setLabel('🐝 MERCHANT').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('r3').setLabel('🎰 SPIN').setStyle(ButtonStyle.Danger)
            );

            return i.reply({
                content: "🎮 Wybierz role eventów:",
                components: [row]
            });
        }
    }

    // BUTTONY
    if (i.isButton()) {

        const map = {
            r1: data.roles.jajko,
            r2: data.roles.merchant,
            r3: data.roles.spin
        };

        const roleId = map[i.customId];

        if (!roleId)
            return i.reply({ content: "❌ Najpierw ustaw role (/panel)", ephemeral: true });

        const has = i.member.roles.cache.has(roleId);

        if (has) {
            await i.member.roles.remove(roleId);
            return i.reply({ content: "❌ Rola usunięta", ephemeral: true });
        } else {
            await i.member.roles.add(roleId);
            return i.reply({ content: "✅ Rola dodana", ephemeral: true });
        }
    }
});

client.login(TOKEN);
