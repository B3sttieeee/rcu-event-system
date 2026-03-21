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

// 🔧 ID
const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1484937784283369502';

const FILE = './data.json';

// 📁 DATA
let data = {
    roles: { jajko: null, merchant: null, spin: null },
    dm: []
};

if (fs.existsSync(FILE)) data = JSON.parse(fs.readFileSync(FILE));
const save = () => fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

// 🎯 EVENT SYSTEM
function getEvent(h) {

    if ([0,3,6,9,12,15,18,21].includes(h))
        return {
            key: "jajko",
            name: "🥚 RNG EGG",
            color: 0x00ffc8,
            role: data.roles.jajko,
            desc: "Na Anniversary Event znajduje się specjalna wyspa z jajkiem. Zbierasz punkty i rozwijasz Tier, który daje losowe bonusy."
        };

    if ([1,4,7,10,13,16,19,22].includes(h))
        return {
            key: "merchant",
            name: "🐝 BOSS / HONEY MERCHANT",
            color: 0xffcc00,
            role: data.roles.merchant,
            desc: "Boss Merchant pojawia się na Anniversary Event i oferuje przedmioty za Boss Tokeny. Honey Merchant pojawia się na Bee World i sprzedaje itemy za miód."
        };

    if ([2,5,8,11,14,17,20,23].includes(h))
        return {
            key: "spin",
            name: "🎰 DEVS SPIN",
            color: 0xff0055,
            role: data.roles.spin,
            desc: "Na Anniversary Event pojawia się koło losowania. Możesz zakręcić i zdobyć różne nagrody."
        };
}

const format = h => `${h.toString().padStart(2, '0')}:00`;

// 💎 EMBED
function createEmbed(event, status, h) {
    return new EmbedBuilder()
        .setColor(event.color)
        .setTitle(event.name)
        .setDescription(
`📊 **Status:** ${status}

${event.desc}

⏰ **Godzina:** \`${format(h)}\``
        )
        .setFooter({ text: "RCU • Event System" })
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
        new SlashCommandBuilder().setName('next').setDescription('2 następne eventy'),
        new SlashCommandBuilder().setName('dm').setDescription('Toggle DM'),
        new SlashCommandBuilder().setName('panel').setDescription('Ustaw role'),
        new SlashCommandBuilder().setName('roles').setDescription('Wybierz role')
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    console.log("✅ Commands ready");

    // ⏰ SYSTEM CZASU
    cron.schedule('* * * * *', async () => {

        const channel = await client.channels.fetch(CHANNEL_ID);
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
        const h = now.getHours();
        const m = now.getMinutes();

        // 🔔 5 MIN PRZED
        if (m === 55) {
            const nextH = (h + 1) % 24;
            const e = getEvent(nextH);

            if (!e || !e.role) return;

            const embed = createEmbed(e, "🔔 ZA 5 MINUT", nextH);

            channel.send({ content: `<@&${e.role}>`, embeds: [embed] });
            sendDM(embed);
        }

        // ⏰ START
        if (m === 0) {
            const e = getEvent(h);

            if (!e || !e.role) return;

            const embed = createEmbed(e, "⏰ START EVENTU", h);

            channel.send({ content: `<@&${e.role}>`, embeds: [embed] });
            sendDM(embed);
        }

    });
});

// ⚡ INTERAKCJE
client.on('interactionCreate', async i => {

    if (i.isChatInputCommand()) {

        const h = new Date().getHours();

        // 🧪 TEST (1 EVENT)
        if (i.commandName === 'test') {
            return i.reply({
                embeds: [createEmbed(getEvent(h), "AKTYWNY", h)]
            });
        }

        // ⏭️ NEXT (2 EMBEDY)
        if (i.commandName === 'next') {

            const h1 = (h + 1) % 24;
            const h2 = (h + 2) % 24;

            return i.reply({
                embeds: [
                    createEmbed(getEvent(h1), "NADCHODZI", h1),
                    createEmbed(getEvent(h2), "KOLEJNY", h2)
                ]
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

        // ⚙️ PANEL
        if (i.commandName === 'panel') {

            const menu = new StringSelectMenuBuilder()
                .setCustomId('select_event')
                .setPlaceholder('Wybierz event')
                .addOptions([
                    { label: '🥚 RNG EGG', value: 'jajko' },
                    { label: '🐝 Merchant', value: 'merchant' },
                    { label: '🎰 Spin', value: 'spin' }
                ]);

            return i.reply({
                content: "⚙️ PANEL ADMINA",
                components: [new ActionRowBuilder().addComponents(menu)]
            });
        }

        // 🎮 ROLE
        if (i.commandName === 'roles') {

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('r1').setLabel('🥚 RNG').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('r2').setLabel('🐝 Merchant').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('r3').setLabel('🎰 Spin').setStyle(ButtonStyle.Danger)
            );

            return i.reply({
                content: "🎮 Wybierz powiadomienia:",
                components: [row]
            });
        }
    }

    // SELECT MENU
    if (i.isStringSelectMenu()) {

        if (i.customId === 'select_event') {

            const type = i.values[0];

            const roles = i.guild.roles.cache
                .filter(r => r.editable)
                .map(r => ({ label: r.name, value: r.id }))
                .slice(0, 25);

            const menu = new StringSelectMenuBuilder()
                .setCustomId(`set_${type}`)
                .addOptions(roles);

            return i.update({
                content: "Wybierz rolę",
                components: [new ActionRowBuilder().addComponents(menu)]
            });
        }

        if (i.customId.startsWith('set_')) {
            const type = i.customId.split('_')[1];
            data.roles[type] = i.values[0];
            save();

            return i.update({ content: "✅ Zapisano!", components: [] });
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

        if (!roleId) {
            return i.reply({ content: "❌ Najpierw ustaw role (/panel)", ephemeral: true });
        }

        const has = i.member.roles.cache.has(roleId);

        if (has) {
            await i.member.roles.remove(roleId);
            return i.reply({ content: "❌ Usunięto rolę", ephemeral: true });
        } else {
            await i.member.roles.add(roleId);
            return i.reply({ content: "✅ Dodano rolę", ephemeral: true });
        }
    }
});

client.login(TOKEN);
