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

// 🔧 CONFIG
const TOKEN = process.env.TOKEN;
const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1484937784283369502';

const FILE = './data.json';

// 📁 DATA
let data = {
    roles: { jajko: null, merchant: null, spin: null },
    dm: [],
    notify: { reminder: true, event: true }
};

if (fs.existsSync(FILE)) data = JSON.parse(fs.readFileSync(FILE));

const save = () => fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

// 🎯 EVENT
function getEvent(h) {
    if ([0,3,6,9,12,15,18,21].includes(h))
        return { name: "🥚 RNG EGG", emoji: "🥚", color: 0x00ffc8, role: data.roles.jajko };

    if ([1,4,7,10,13,16,19,22].includes(h))
        return { name: "🐝 BOSS / HONEY MERCHANT", emoji: "🐝", color: 0xffcc00, role: data.roles.merchant };

    return { name: "🎰 DEVS SPIN (EVENT WORLD)", emoji: "🎰", color: 0xff0055, role: data.roles.spin };
}

const format = h => `${h.toString().padStart(2, '0')}:00`;

// 🎨 EMBED PRO
function embed(event, type, h) {
    const nextH = (h + 1) % 24;
    const next = getEvent(nextH);

    return new EmbedBuilder()
        .setTitle(`${event.emoji} ${event.name}`)
        .setDescription(
`✨ **${type}**

🕒 **Godzina:** ${format(h)}
📌 **Event:** ${event.name}

━━━━━━━━━━━━━━

⏭️ **Następny:**
${next.name} (${format(nextH)})

━━━━━━━━━━━━━━
🔥 **Dołącz i nie przegap!**`
        )
        .setColor(event.color)
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
        new SlashCommandBuilder().setName('panel').setDescription('Ustaw role'),
        new SlashCommandBuilder().setName('roles').setDescription('Wybierz role'),
        new SlashCommandBuilder().setName('dm').setDescription('Toggle DM'),
        new SlashCommandBuilder().setName('notify').setDescription('Toggle powiadomienia'),
        new SlashCommandBuilder().setName('test').setDescription('Test'),
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    // ⏰ SYSTEM
    cron.schedule('* * * * *', async () => {
        const ch = await client.channels.fetch(CHANNEL_ID);
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();

        if (m === 55 && data.notify.reminder) {
            const e = getEvent((h + 1) % 24);
            if (!e.role) return;

            const em = embed(e, "🔔 ZA 5 MINUT", (h + 1) % 24);
            ch.send({ content: `<@&${e.role}>`, embeds: [em] });
            sendDM(em);
        }

        if (m === 0 && data.notify.event) {
            const e = getEvent(h);
            if (!e.role) return;

            const em = embed(e, "⏰ START EVENTU", h);
            ch.send({ content: `<@&${e.role}>`, embeds: [em] });
            sendDM(em);
        }
    });
});

// ⚡ INTERAKCJE
client.on('interactionCreate', async i => {

    if (i.isChatInputCommand()) {

        const h = new Date().getHours();

        if (i.commandName === 'test') {
            return i.reply({ embeds: [embed(getEvent(h), "🧪 TEST", h)] });
        }

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

        if (i.commandName === 'notify') {
            data.notify.event = !data.notify.event;
            data.notify.reminder = !data.notify.reminder;
            save();

            return i.reply({ content: "🔔 Przełączono powiadomienia", ephemeral: true });
        }

        if (i.commandName === 'panel') {
            const menu = new StringSelectMenuBuilder()
                .setCustomId('event')
                .addOptions([
                    { label: 'RNG EGG', value: 'jajko' },
                    { label: 'Merchant', value: 'merchant' },
                    { label: 'Spin', value: 'spin' }
                ]);

            return i.reply({ components: [new ActionRowBuilder().addComponents(menu)] });
        }

        if (i.commandName === 'roles') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('r1').setLabel('🥚').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('r2').setLabel('🐝').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('r3').setLabel('🎰').setStyle(ButtonStyle.Danger)
            );

            return i.reply({ content: "🎮 Role:", components: [row] });
        }
    }

    if (i.isStringSelectMenu()) {
        const type = i.values[0];

        const roles = i.guild.roles.cache
            .filter(r => r.editable)
            .map(r => ({ label: r.name, value: r.id }))
            .slice(0, 25);

        const menu = new StringSelectMenuBuilder()
            .setCustomId(`set_${type}`)
            .addOptions(roles);

        return i.update({ components: [new ActionRowBuilder().addComponents(menu)] });
    }

    if (i.isButton()) {
        const map = {
            r1: data.roles.jajko,
            r2: data.roles.merchant,
            r3: data.roles.spin
        };

        const roleId = map[i.customId];
        if (!roleId) return i.reply({ content: "❌ ustaw role", ephemeral: true });

        const has = i.member.roles.cache.has(roleId);

        if (has) {
            await i.member.roles.remove(roleId);
            return i.reply({ content: "❌ usunięto", ephemeral: true });
        } else {
            await i.member.roles.add(roleId);
            return i.reply({ content: "✅ dodano", ephemeral: true });
        }
    }
});

client.login(TOKEN);
