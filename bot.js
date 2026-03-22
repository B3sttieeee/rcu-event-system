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

// ROLE ID
const ROLES = {
    egg: "1476000993119568105",
    merchant: "1476000993660502139",
    spin: "1484911421903999127"
};

// OBRAZY
const IMAGES = {
    egg: "https://imgur.com/pY2xNUL.png",
    boss: "https://imgur.com/VU9KdMS.png",
    honey: "https://imgur.com/SsvlJ5a.png",
    spin: "https://imgur.com/LeXDgiJ.png"
};

let data = { dm: {}, giveaways: {} };

function save() {
    fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));
}

// 🔥 CZAS POLSKI
function getNow() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
}

// EVENT LOGIKA (NAPRAWIONA)
function getEvent(hour) {
    if ([0,3,6,9,12,15,18,21].includes(hour)) return "egg";
    if ([1,4,7,10,13,16,19,22].includes(hour)) return "merchant";
    if ([2,5,8,11,14,17,20,23].includes(hour)) return "spin";
}

// 🔥 NAJBLIŻSZE EVENTY (NAPRAWIONE)
function getNextEvents() {

    const now = getNow();
    let events = [];

    for (let i = 0; i < 24; i++) {
        const date = new Date(now);
        date.setMinutes(0,0,0);
        date.setHours(i);

        if (date <= now) date.setDate(date.getDate()+1);

        events.push({
            type: getEvent(i),
            time: date.getTime()
        });
    }

    events.sort((a,b)=>a.time-b.time);

    return events.slice(0,2);
}

// EMBEDY
function getEmbed(type) {

    if (type === "egg") {
        return new EmbedBuilder()
            .setTitle("🥚 **RNG EGG**")
            .setDescription(
`**Otwieraj jajka i zdobywaj punkty Tieru!**

• Lepsze pety = więcej punktów  
• Lepszy Tier = lepsze nagrody`
            )
            .setThumbnail(IMAGES.egg)
            .setColor(0xffcc00);
    }

    if (type === "merchant") {
        return new EmbedBuilder()
            .setTitle("🐝 **MERCHANT EVENT**")
            .setDescription(
`**🟡 Honey Merchant**
Za miód kupisz przedmioty  
Szansa Supreme: **110%**

**🔴 Boss Merchant**
Na mapie Anniversary Event  
Szansa Supreme: **125%**

⏳ Znika po 15 minutach`
            )
            .setThumbnail(IMAGES.honey)
            .setColor(0xff9900);
    }

    if (type === "spin") {
        return new EmbedBuilder()
            .setTitle("🎰 **DEV SPIN**")
            .setDescription(
`**Kręć kołem i zdobywaj nagrody!**

Szansa Supreme: **??%**`
            )
            .setThumbnail(IMAGES.spin)
            .setColor(0x00ccff);
    }
}

// READY
client.once('clientReady', async () => {

    console.log("✅ BOT ONLINE");

    const commands = [
        new SlashCommandBuilder().setName('event').setDescription('Aktualny event'),
        new SlashCommandBuilder().setName('next-events').setDescription('Następne eventy'),
        new SlashCommandBuilder().setName('get-role').setDescription('Panel ról'),
        new SlashCommandBuilder().setName('set-dm').setDescription('Powiadomienia DM'),

        new SlashCommandBuilder()
            .setName('giveaway')
            .setDescription('Start giveaway')
            .addStringOption(o=>o.setName('nagroda').setDescription('Nagroda').setRequired(true))
            .addStringOption(o=>o.setName('czas').setDescription('np 1h / 30m').setRequired(true))

    ].map(c=>c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    console.log("✅ Komendy załadowane");

    // CRON
    cron.schedule('* * * * *', async () => {

        const now = getNow();
        const h = now.getHours();
        const m = now.getMinutes();

        const type = getEvent(h);

        // 🔔 5 MIN PRZED
        if (m === 55) {
            const channel = await client.channels.fetch(CHANNEL_ID);
            channel.send(`⏰ Za 5 minut: **${type.toUpperCase()}** <@&${ROLES[type]}>`);
        }

        // 🚀 START
        if (m === 0) {
            const channel = await client.channels.fetch(CHANNEL_ID);

            channel.send({
                content: `<@&${ROLES[type]}>`,
                embeds: [getEmbed(type)]
            });

            // DM
            for (const id in data.dm) {
                if (data.dm[id]?.includes(type)) {
                    try {
                        const user = await client.users.fetch(id);
                        user.send({ embeds: [getEmbed(type)] });
                    } catch {}
                }
            }
        }

    });

});

// INTERACTIONS
client.on('interactionCreate', async i => {

    if (i.isChatInputCommand()) {

        const now = getNow();
        const h = now.getHours();

        // EVENT
        if (i.commandName === 'event') {
            return i.reply({ embeds: [getEmbed(getEvent(h))] });
        }

        // NEXT EVENTS
        if (i.commandName === 'next-events') {

            const next = getNextEvents();

            return i.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("📅 **NASTĘPNE EVENTY**")
                        .setDescription(
`🔥 **${next[0].type.toUpperCase()}**
🕒 <t:${Math.floor(next[0].time/1000)}:F>
⏳ <t:${Math.floor(next[0].time/1000)}:R>

🔥 **${next[1].type.toUpperCase()}**
🕒 <t:${Math.floor(next[1].time/1000)}:F>
⏳ <t:${Math.floor(next[1].time/1000)}:R>`
                        )
                        .setColor(0x00ffcc)
                ]
            });
        }

        // ROLE PANEL
        if (i.commandName === 'get-role') {

            const menu = new StringSelectMenuBuilder()
                .setCustomId('roles')
                .setMinValues(1)
                .setMaxValues(3)
                .addOptions([
                    { label: "RNG Egg", value: "egg" },
                    { label: "Merchant", value: "merchant" },
                    { label: "Dev Spin", value: "spin" }
                ]);

            return i.reply({
                content: "🎭 Wybierz role:",
                components: [new ActionRowBuilder().addComponents(menu)],
                ephemeral: true
            });
        }

        // DM PICKER
        if (i.commandName === 'set-dm') {

            const menu = new StringSelectMenuBuilder()
                .setCustomId('dm')
                .setMinValues(1)
                .setMaxValues(3)
                .addOptions([
                    { label: "Egg", value: "egg" },
                    { label: "Merchant", value: "merchant" },
                    { label: "Spin", value: "spin" }
                ]);

            return i.reply({
                content: "📩 Wybierz DM:",
                components: [new ActionRowBuilder().addComponents(menu)],
                ephemeral: true
            });
        }

        // GIVEAWAY
        if (i.commandName === 'giveaway') {

            const prize = i.options.getString('nagroda');
            const time = i.options.getString('czas');

            const ms = time.endsWith("h") ? parseInt(time)*3600000 :
                       time.endsWith("m") ? parseInt(time)*60000 : 60000;

            const end = Date.now()+ms;
            const id = Date.now();

            data.giveaways[id] = { users: [] };
            save();

            const embed = new EmbedBuilder()
                .setTitle(`🎁 ${prize}`)
                .setDescription(
`Kliknij 🎉 aby wziąć udział!

⏳ Koniec: <t:${Math.floor(end/1000)}:R>
👥 Uczestnicy: 0`
                )
                .setColor(0x00ff99);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`join_${id}`).setLabel("🎉 Weź udział").setStyle(ButtonStyle.Success)
            );

            const msg = await i.reply({ embeds: [embed], components: [row], fetchReply: true });

            setTimeout(async () => {
                const users = data.giveaways[id].users;
                if (!users.length) return;

                const winner = users[Math.floor(Math.random()*users.length)];
                msg.channel.send(`🏆 Wygrał: <@${winner}>`);
            }, ms);
        }

    }

    // ROLE SELECT
    if (i.isStringSelectMenu()) {

        if (i.customId === 'roles') {

            for (const type of ["egg","merchant","spin"]) {
                const role = ROLES[type];

                if (i.values.includes(type)) {
                    await i.member.roles.add(role).catch(()=>{});
                } else {
                    await i.member.roles.remove(role).catch(()=>{});
                }
            }

            return i.update({ content: "✅ Role ustawione", components: [] });
        }

        if (i.customId === 'dm') {
            data.dm[i.user.id] = i.values;
            save();
            return i.update({ content: "✅ DM zapisane", components: [] });
        }

    }

    // GIVEAWAY BUTTON
    if (i.isButton()) {

        if (i.customId.startsWith("join_")) {

            const id = i.customId.split("_")[1];

            if (!data.giveaways[id]) return;

            if (!data.giveaways[id].users.includes(i.user.id)) {
                data.giveaways[id].users.push(i.user.id);
                save();
            }

            return i.reply({ content: "✅ Dołączyłeś!", ephemeral: true });
        }
    }

});

client.login(TOKEN);
