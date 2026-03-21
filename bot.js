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
    ButtonStyle,
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

// 🖼️ OBRAZKI (TU WSTAW SWOJE)
const IMAGES = {
    egg: "https://imgur.com/pY2xNUL.png",
    merchant_boss: "https://imgur.com/VU9KdMS.png",
    merchant_honey: "https://imgur.com/SsvlJ5a.png",
    spin: "https://imgur.com/LeXDgiJ.png"
};

// 📦 DATA
let data = {
    roles: { egg: null, merchant: null, spin: null },
    dm: {},
    giveaway: {
        active: false,
        rolesBonus: {}
    }
};

function loadData() {
    if (fs.existsSync(FILE)) {
        data = JSON.parse(fs.readFileSync(FILE));
    }
}

function save() {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

loadData();

//////////////////////////////////////////////////
// 🎯 EVENTY
//////////////////////////////////////////////////

function getEvent(h) {
    if ([0,3,6,9,12,15,18,21].includes(h)) return "egg";
    if ([1,4,7,10,13,16,19,22].includes(h)) return "merchant";
    if ([2,5,8,11,14,17,20,23].includes(h)) return "spin";
}

function getMerchantVariant() {
    return Math.random() < 0.5 ? "boss" : "honey";
}

function buildEmbed(type, variant=null) {

    if (type === "egg") {
        return new EmbedBuilder()
            .setTitle("🥚 RNG EGG EVENT")
            .setDescription(
`🎲 **Event wystartował!**

➜ Otwieraj jajka
➜ Losowe nagrody
➜ Szansa na rare drop

⏰ Kolejny za 3h`
            )
            .setImage(IMAGES.egg)
            .setColor(0x00ffcc)
            .setTimestamp();
    }

    if (type === "merchant") {

        if (variant === "boss") {
            return new EmbedBuilder()
                .setTitle("🐝 MERCHANT BOSS")
                .setDescription(
`🔥 **RZADKI MERCHANT**

➜ Najlepsze itemy
➜ Rzadkie oferty
➜ Limitowany czas

⚠️ Spiesz się!`
                )
                .setImage(IMAGES.merchant_boss)
                .setColor(0xff0000)
                .setTimestamp();
        }

        return new EmbedBuilder()
            .setTitle("🍯 HONEY MERCHANT")
            .setDescription(
`🍯 **Standardowy merchant**

➜ Normalne itemy
➜ Krótki czas dostępności

💰 Sprawdź ofertę`
            )
            .setImage(IMAGES.merchant_honey)
            .setColor(0xffcc00)
            .setTimestamp();
    }

    if (type === "spin") {
        return new EmbedBuilder()
            .setTitle("🎰 DEV SPIN EVENT")
            .setDescription(
`🎰 **Zakręć i wygraj!**

➜ Losowe nagrody
➜ Szansa na jackpot
➜ Szybki event

🎯 Powodzenia!`
            )
            .setImage(IMAGES.spin)
            .setColor(0x9b59b6)
            .setTimestamp();
    }
}

//////////////////////////////////////////////////
// 🎁 GIVEAWAY
//////////////////////////////////////////////////

function getEntries(member) {
    let entries = 1;

    for (const roleId in data.giveaway.rolesBonus) {
        if (member.roles.cache.has(roleId)) {
            entries += data.giveaway.rolesBonus[roleId];
        }
    }

    return entries;
}

//////////////////////////////////////////////////
// 🔄 KOMENDY
//////////////////////////////////////////////////

async function registerCommands() {

    const commands = [
        new SlashCommandBuilder().setName('event').setDescription('Aktualny event'),
        new SlashCommandBuilder().setName('next-events').setDescription('Następne eventy'),
        new SlashCommandBuilder().setName('set-dm').setDescription('Ustaw DM'),
        new SlashCommandBuilder().setName('roles-picker').setDescription('Ustaw role eventów'),
        new SlashCommandBuilder().setName('giveaway-start').setDescription('Start giveaway'),
        new SlashCommandBuilder().setName('refresh').setDescription('Odśwież komendy')
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );

    console.log("✅ Komendy zarejestrowane");
}

//////////////////////////////////////////////////
// 🚀 READY
//////////////////////////////////////////////////

client.once('ready', async () => {
    console.log(`✅ ${client.user.tag}`);

    await registerCommands();

    cron.schedule('* * * * *', async () => {

        const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
        const h = now.getHours();
        const m = now.getMinutes();

        if (m !== 0) return;

        const type = getEvent(h);
        const role = data.roles[type];
        if (!role) return;

        const variant = type === "merchant" ? getMerchantVariant() : null;
        const embed = buildEmbed(type, variant);

        const channel = await client.channels.fetch(CHANNEL_ID);

        await channel.send({
            content: `<@&${role}>`,
            embeds: [embed]
        });

        // DM
        for (const userId in data.dm) {
            if (!data.dm[userId]?.includes(type)) continue;

            try {
                const user = await client.users.fetch(userId);
                await user.send({ embeds: [embed] });
            } catch {}
        }
    });
});

//////////////////////////////////////////////////
// ⚡ INTERAKCJE
//////////////////////////////////////////////////

client.on('interactionCreate', async i => {

    if (i.isButton()) {
        if (i.customId === "giveaway_join") {
            const entries = getEntries(i.member);

            return i.reply({
                content: `🎟️ Masz **${entries} wejść**`,
                ephemeral: true
            });
        }
    }

    if (i.isStringSelectMenu()) {

        if (i.customId === "dm_select") {
            data.dm[i.user.id] = i.values;
            save();

            return i.update({
                content: "✅ DM zapisany",
                components: []
            });
        }

        if (i.customId.startsWith("role_")) {
            const type = i.customId.split("_")[1];

            data.roles[type] = i.values[0];
            save();

            return i.update({
                content: "✅ Rola ustawiona",
                components: []
            });
        }
    }

    if (!i.isChatInputCommand()) return;

    if (i.commandName === 'event') {
        const now = new Date();
        const type = getEvent(now.getHours());

        return i.reply({
            embeds: [buildEmbed(type)]
        });
    }

    if (i.commandName === 'next-events') {
        const now = new Date();
        const h = now.getHours();

        return i.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("⏭️ Następne eventy")
                    .setDescription(
`+1h → ${getEvent((h+1)%24)}
+2h → ${getEvent((h+2)%24)}
+3h → ${getEvent((h+3)%24)}`
                    )
                    .setColor(0x5865F2)
            ]
        });
    }

    if (i.commandName === 'set-dm') {

        const menu = new StringSelectMenuBuilder()
            .setCustomId('dm_select')
            .setMinValues(1)
            .setMaxValues(3)
            .addOptions([
                { label: 'RNG EGG', value: 'egg' },
                { label: 'MERCHANT', value: 'merchant' },
                { label: 'DEV SPIN', value: 'spin' }
            ]);

        return i.reply({
            content: "📩 Wybierz DM",
            components: [new ActionRowBuilder().addComponents(menu)],
            ephemeral: true
        });
    }

    if (i.commandName === 'roles-picker') {

        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return i.reply({ content: "❌ brak permisji", ephemeral: true });

        const makeMenu = (type, label) =>
            new StringSelectMenuBuilder()
                .setCustomId(`role_${type}`)
                .setPlaceholder(label)
                .addOptions(
                    i.guild.roles.cache
                        .filter(r => r.editable)
                        .map(r => ({
                            label: r.name,
                            value: r.id
                        }))
                        .slice(0, 25)
                );

        return i.reply({
            content: "🎯 Ustaw role",
            components: [
                new ActionRowBuilder().addComponents(makeMenu("egg", "RNG EGG")),
                new ActionRowBuilder().addComponents(makeMenu("merchant", "MERCHANT")),
                new ActionRowBuilder().addComponents(makeMenu("spin", "DEV SPIN"))
            ],
            ephemeral: true
        });
    }

    if (i.commandName === 'giveaway-start') {

        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return i.reply({ content: "❌ brak permisji", ephemeral: true });

        data.giveaway.active = true;
        save();

        const embed = new EmbedBuilder()
            .setTitle("🎉 GIVEAWAY")
            .setDescription("Kliknij przycisk aby dołączyć!")
            .setColor(0x00ffcc);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("giveaway_join")
                .setLabel("Weź udział")
                .setStyle(ButtonStyle.Success)
        );

        return i.reply({ embeds: [embed], components: [row] });
    }

    if (i.commandName === 'refresh') {

        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return i.reply({ content: "❌ brak permisji", ephemeral: true });

        await registerCommands();

        return i.reply({
            content: "✅ Komendy odświeżone",
            ephemeral: true
        });
    }
});

client.login(TOKEN);
