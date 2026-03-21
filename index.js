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

// 🔧 TWOJE ID
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
        return { name: "🥚 RNG EGG", emoji: "🥚", color: 0x00ffc8, role: data.roles.jajko };

    if ([1,4,7,10,13,16,19,22].includes(h))
        return { name: "🐝 BOSS / HONEY MERCHANT", emoji: "🐝", color: 0xffcc00, role: data.roles.merchant };

    return { name: "🎰 DEVS SPIN (EVENT WORLD)", emoji: "🎰", color: 0xff0055, role: data.roles.spin };
}

const format = h => `${h.toString().padStart(2, '0')}:00`;

// 🎨 EMBED
function createEmbed(event, type, h, showNext = true) {

    let desc =
`✨ **${type}**

> ⏰ Godzina: \`${format(h)}\`
> 📌 Event: ${event.name}`;

    if (showNext) {
        const next = getEvent((h + 1) % 24);
        const next2 = getEvent((h + 2) % 24);

        desc += `

╭───────────────
> ⏭️ Next:
> ${next.name} \`${format((h + 1) % 24)}\`

> 🔮 Kolejny:
> ${next2.name} \`${format((h + 2) % 24)}\`
╰───────────────`;
    }

    desc += `

🔥 Dołącz i nie przegap!`;

    return new EmbedBuilder()
        .setColor(event.color)
        .setTitle(`${event.emoji} ${event.name}`)
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
        new SlashCommandBuilder().setName('test').setDescription('Aktualny event'),
        new SlashCommandBuilder().setName('next').setDescription('2 następne eventy'),
        new SlashCommandBuilder().setName('dm').setDescription('Toggle DM'),
        new SlashCommandBuilder().setName('panel').setDescription('Ustaw role'),
        new SlashCommandBuilder().setName('roles').setDescription('Wybierz role')
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    console.log("✅ Commands ready");

    // ⏰ SYSTEM
    cron.schedule('* * * * *', async () => {

        const channel = await client.channels.fetch(CHANNEL_ID);
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();

        // 🔔 5 MIN PRZED (np 16:55 → event 17)
        if (m === 55) {
            const nextHour = (h + 1) % 24;
            const e = getEvent(nextHour);

            if (!e.role) return;

            const embed = createEmbed(e, "🔔 ZA 5 MINUT", nextHour);

            channel.send({ content: `<@&${e.role}>`, embeds: [embed] });
            sendDM(embed);
        }

        // ⏰ START EVENTU (np 17:00)
        if (m === 0) {
            const e = getEvent(h);

            if (!e.role) return;

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

        // 🧪 TEST = aktualny event
        if (i.commandName === 'test') {
            return i.reply({
                embeds: [createEmbed(getEvent(h), "🧪 AKTUALNY EVENT", h)]
            });
        }

        // ⏭️ NEXT = 2 następne
        if (i.commandName === 'next') {

            const nextH = (h + 1) % 24;
            const e = getEvent(nextH);

            return i.reply({
                embeds: [createEmbed(e, "⏭️ NADCHODZI", nextH)]
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
