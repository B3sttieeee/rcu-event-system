const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
    StringSelectMenuBuilder
} = require('discord.js');

const fs = require('fs');
const cron = require('node-cron');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const TOKEN = process.env.TOKEN;

const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1484937784283369502';

const FILE = './data.json';

let data = {
    roles: { egg: null, merchant: null, spin: null },
    dm: {}
};

if (fs.existsSync(FILE)) data = JSON.parse(fs.readFileSync(FILE));
const save = () => fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

function getEvent(h) {
    if ([0,3,6,9,12,15,18,21].includes(h)) return "egg";
    if ([1,4,7,10,13,16,19,22].includes(h)) return "merchant";
    return "spin";
}

function format(h) {
    return `${h.toString().padStart(2, '0')}:00`;
}

function getEmbed(type, status, h) {
    const titles = {
        egg: "🥚 RNG EGG",
        merchant: "🐝 MERCHANT",
        spin: "🎰 DEVS SPIN"
    };

    return new EmbedBuilder()
        .setColor(type === "egg" ? 0x00ffc8 : type === "merchant" ? 0xffcc00 : 0xff0055)
        .setTitle(titles[type] || "EVENT")
        .setDescription(`📊 **${status}**\n⏰ ${format(h)}`)
        .setTimestamp();
}

// DM
async function sendDM(type, embeds) {
    for (const userId in data.dm) {
        if (!data.dm[userId].includes(type)) continue;

        try {
            const user = await client.users.fetch(userId);
            await user.send({ embeds });
        } catch {}
    }
}

// READY
client.once('ready', async () => {

    console.log(`✅ ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder().setName('event').setDescription('Aktualny event'),
        new SlashCommandBuilder().setName('next-event').setDescription('Następne eventy'),
        new SlashCommandBuilder().setName('check-pings').setDescription('Status pingów'),
        new SlashCommandBuilder().setName('roles-add').setDescription('Ustaw role')
            .addStringOption(o=>o.setName('typ').setDescription('egg/merchant/spin').setRequired(true))
            .addRoleOption(o=>o.setName('rola').setDescription('rola').setRequired(true)),
        new SlashCommandBuilder().setName('set-dm').setDescription('Ustaw DM'),
        new SlashCommandBuilder().setName('panel').setDescription('Panel ról'),
        new SlashCommandBuilder().setName('giveaway')
            .setDescription('Stwórz giveaway')
            .addStringOption(o=>o.setName('nagroda').setDescription('nagroda').setRequired(true))
            .addIntegerOption(o=>o.setName('czas').setDescription('sekundy').setRequired(true))
            .addIntegerOption(o=>o.setName('wygrani').setDescription('ile osób').setRequired(true))
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    console.log("✅ Komendy OK");

    // CRON
    cron.schedule('* * * * *', async () => {

        const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
        const h = now.getHours();
        const m = now.getMinutes();

        const channel = await client.channels.fetch(CHANNEL_ID);

        if (m === 0) {
            const type = getEvent(h);
            const role = data.roles[type];
            if (!role) return;

            const embed = getEmbed(type, "START", h);

            channel.send({
                content: `<@&${role}>`,
                embeds: [embed]
            });

            sendDM(type, [embed]);
        }

    });
});

// INTERAKCJE
client.on('interactionCreate', async i => {

    if (i.isChatInputCommand()) {

        const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
        let h = now.getHours();

        // EVENT
        if (i.commandName === 'event') {
            const type = getEvent(h);
            return i.reply({ embeds: [getEmbed(type, "AKTYWNY", h)] });
        }

        // NEXT
        if (i.commandName === 'next-event') {
            const h1 = (h + 1) % 24;
            const h2 = (h + 2) % 24;

            return i.reply({
                embeds: [
                    getEmbed(getEvent(h1), "NADCHODZI", h1),
                    getEmbed(getEvent(h2), "KOLEJNY", h2)
                ]
            });
        }

        // CHECK
        if (i.commandName === 'check-pings') {

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("📊 STATUS PINGÓW")
                .setDescription(
`🥚 RNG: ${data.roles.egg ? `<@&${data.roles.egg}>` : "❌"}
🐝 MERCHANT: ${data.roles.merchant ? `<@&${data.roles.merchant}>` : "❌"}
🎰 SPIN: ${data.roles.spin ? `<@&${data.roles.spin}>` : "❌"}`
                );

            return i.reply({ embeds: [embed], ephemeral: true });
        }

        // ROLES ADD
        if (i.commandName === 'roles-add') {

            if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
                return i.reply({ content: "❌ brak permisji", ephemeral: true });

            const type = i.options.getString('typ');
            const role = i.options.getRole('rola');

            if (!["egg","merchant","spin"].includes(type))
                return i.reply({ content: "❌ zły typ", ephemeral: true });

            data.roles[type] = role.id;
            save();

            return i.reply({ content: "✅ zapisano", ephemeral: true });
        }

        // DM
        if (i.commandName === 'set-dm') {

            const menu = new StringSelectMenuBuilder()
                .setCustomId('dm_select')
                .setMinValues(1)
                .setMaxValues(3)
                .addOptions([
                    { label: 'RNG', value: 'egg' },
                    { label: 'Merchant', value: 'merchant' },
                    { label: 'Spin', value: 'spin' }
                ]);

            return i.reply({
                content: "Wybierz DM",
                components: [new ActionRowBuilder().addComponents(menu)],
                ephemeral: true
            });
        }

        // PANEL
        if (i.commandName === 'panel') {

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('egg').setLabel('🥚 RNG').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('merchant').setLabel('🐝 Merchant').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('spin').setLabel('🎰 Spin').setStyle(ButtonStyle.Danger)
            );

            return i.reply({ content: "Panel ról", components: [row] });
        }

        // GIVEAWAY
        if (i.commandName === 'giveaway') {

            const prize = i.options.getString('nagroda');
            const time = i.options.getInteger('czas') * 1000;
            const winners = i.options.getInteger('wygrani');

            const embed = new EmbedBuilder()
                .setTitle("🎉 GIVEAWAY")
                .setDescription(`Nagroda: **${prize}**\nKliknij 🎉`)
                .setColor(0xff00ff);

            const msg = await i.reply({ embeds: [embed], fetchReply: true });

            await msg.react("🎉");

            setTimeout(async () => {

                const fetched = await msg.fetch();
                const users = await fetched.reactions.cache.get("🎉").users.fetch();

                const filtered = users.filter(u => !u.bot).map(u => u);

                const winnersList = filtered.sort(() => 0.5 - Math.random()).slice(0, winners);

                i.followUp({
                    content: `🎉 Wygrali: ${winnersList.map(u=>u.toString()).join(", ") || "brak"}`
                });

            }, time);
        }
    }

    // SELECT DM
    if (i.isStringSelectMenu()) {
        if (i.customId === 'dm_select') {

            data.dm[i.user.id] = i.values;
            save();

            return i.update({ content: "✅ zapisano DM", components: [] });
        }
    }

    // BUTTON ROLES
    if (i.isButton()) {

        const roleId = data.roles[i.customId];
        if (!roleId) return i.reply({ content: "❌ brak roli", ephemeral: true });

        const member = i.member;

        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId);
            return i.reply({ content: "❌ usunięto", ephemeral: true });
        } else {
            await member.roles.add(roleId);
            return i.reply({ content: "✅ dodano", ephemeral: true });
        }
    }
});

client.login(TOKEN);
