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

// 📦 DATA
let data = {
    roles: { egg: null, merchant: null, spin: null },
    dm: {},
    giveaway: {
        active: false,
        prize: null,
        rolesBonus: {} // roleId: bonus entries
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
// 🎯 EVENT SYSTEM
//////////////////////////////////////////////////

function getEvent(h) {
    if ([0,3,6,9,12,15,18,21].includes(h)) return "egg";
    if ([1,4,7,10,13,16,19,22].includes(h)) return "merchant";
    return "spin";
}

function getMerchantVariant() {
    return Math.random() < 0.5 ? "boss" : "honey";
}

function getName(type, variant=null) {
    if (type === "merchant") {
        return variant === "boss"
            ? "🐝 MERCHANT BOSS"
            : "🍯 HONEY MERCHANT";
    }

    return {
        egg: "🥚 RNG EGG",
        spin: "🎰 DEV SPIN"
    }[type];
}

function buildEventEmbed(type, variant=null) {

    let color = 0x5865F2;
    let desc = "📢 Event wystartował!";

    if (type === "egg") {
        color = 0x00ffcc;
        desc = "🥚 Otwieraj RNG EGG i testuj swoje szczęście!";
    }

    if (type === "merchant") {
        color = variant === "boss" ? 0xff0000 : 0xffcc00;
        desc = variant === "boss"
            ? "🐝 MERCHANT BOSS pojawił się! Rzadkie itemy!"
            : "🍯 HONEY MERCHANT dostępny! Sprawdź ofertę!";
    }

    if (type === "spin") {
        color = 0x9b59b6;
        desc = "🎰 DEV SPIN aktywny! Zakręć i wygraj!";
    }

    return new EmbedBuilder()
        .setTitle(getName(type, variant))
        .setDescription(desc)
        .setFooter({ text: "Event System" })
        .setColor(color)
        .setTimestamp();
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
// ⏰ CRON
//////////////////////////////////////////////////

client.once('ready', async () => {
    console.log(`✅ ${client.user.tag}`);

    cron.schedule('* * * * *', async () => {

        const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
        const h = now.getHours();
        const m = now.getMinutes();

        if (m !== 0) return;

        const type = getEvent(h);
        const role = data.roles[type];
        if (!role) return;

        const variant = type === "merchant" ? getMerchantVariant() : null;
        const embed = buildEventEmbed(type, variant);

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
// ⚡ COMMANDS
//////////////////////////////////////////////////

client.on('interactionCreate', async i => {

    //////////////////////////////////////////////////
    // 🎮 GIVEAWAY JOIN
    //////////////////////////////////////////////////
    if (i.isButton() && i.customId === "giveaway_join") {

        if (!data.giveaway.active)
            return i.reply({ content: "❌ brak giveaway", ephemeral: true });

        const entries = getEntries(i.member);

        return i.reply({
            content: `🎟️ Masz **${entries} wejść** do giveaway!`,
            ephemeral: true
        });
    }

    //////////////////////////////////////////////////
    // 📋 SELECT MENU (DM + ROLE SET)
    //////////////////////////////////////////////////
    if (i.isStringSelectMenu()) {

        if (i.customId === "dm_select") {
            data.dm[i.user.id] = i.values;
            save();

            return i.update({
                content: "✅ Zapisano ustawienia DM",
                components: []
            });
        }

        if (i.customId.startsWith("role_set_")) {

            const type = i.customId.split("_")[2];
            const roleId = i.values[0];

            data.roles[type] = roleId;
            save();

            return i.update({
                content: "✅ Rola ustawiona",
                components: []
            });
        }
    }

    //////////////////////////////////////////////////
    // 🎛️ COMMANDY
    //////////////////////////////////////////////////
    if (!i.isChatInputCommand()) return;

    // EVENT
    if (i.commandName === 'event') {
        const now = new Date();
        const type = getEvent(now.getHours());

        return i.reply({
            embeds: [buildEventEmbed(type)]
        });
    }

    // DM SET
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
            content: "📩 Wybierz eventy do DM",
            components: [new ActionRowBuilder().addComponents(menu)],
            ephemeral: true
        });
    }

    // ROLE PICKER (ADMIN)
    if (i.commandName === 'roles-picker') {

        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return i.reply({ content: "❌ brak permisji", ephemeral: true });

        const menu = new StringSelectMenuBuilder()
            .setCustomId(`role_set_egg`)
            .setPlaceholder("Wybierz rolę dla RNG EGG")
            .addOptions(
                i.guild.roles.cache.map(r => ({
                    label: r.name,
                    value: r.id
                })).slice(0, 25)
            );

        return i.reply({
            content: "🎯 Ustaw rolę dla eventu",
            components: [new ActionRowBuilder().addComponents(menu)],
            ephemeral: true
        });
    }

    // GIVEAWAY START
    if (i.commandName === 'giveaway') {

        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return i.reply({ content: "❌ brak permisji", ephemeral: true });

        data.giveaway.active = true;
        data.giveaway.prize = "🎁 Nagroda";
        save();

        const embed = new EmbedBuilder()
            .setTitle("🎉 GIVEAWAY")
            .setDescription("Kliknij przycisk aby dołączyć!")
            .addFields(
                Object.entries(data.giveaway.rolesBonus).map(([role, bonus]) => ({
                    name: `<@&${role}>`,
                    value: `+${bonus} wejść`,
                    inline: true
                }))
            )
            .setColor(0x00ffcc);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("giveaway_join")
                .setLabel("Weź udział")
                .setStyle(ButtonStyle.Success)
        );

        return i.reply({ embeds: [embed], components: [row] });
    }
});

client.login(TOKEN);
