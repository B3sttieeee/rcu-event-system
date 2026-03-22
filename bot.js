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
    StringSelectMenuBuilder,
    PermissionsBitField
} = require('discord.js');

const cron = require('node-cron');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

process.on('unhandledRejection', console.log);
process.on('uncaughtException', console.log);

const TOKEN = process.env.TOKEN;

const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1484937784283369502';

//////////////////////////////////////////////////
// 🖼️ OBRAZKI
//////////////////////////////////////////////////

const IMAGES = {
    egg: "https://imgur.com/pY2xNUL.png",
    boss: "https://imgur.com/VU9KdMS.png",
    honey: "https://imgur.com/SsvlJ5a.png",
    spin: "https://imgur.com/LeXDgiJ.png"
};

//////////////////////////////////////////////////
// 🎯 ROLE
//////////////////////////////////////////////////

let roles = {
    egg: null,
    merchant: null,
    spin: null
};

//////////////////////////////////////////////////
// 🔔 REMINDER
//////////////////////////////////////////////////

let lastReminder = null;

//////////////////////////////////////////////////
// 🕒 CZAS
//////////////////////////////////////////////////

function getPLHour() {
    return parseInt(new Date().toLocaleString("en-US", {
        timeZone: "Europe/Warsaw",
        hour: "numeric",
        hour12: false
    }));
}

function getNextTimestamp(offset) {
    const now = new Date();
    const currentPL = getPLHour();
    const targetPL = (currentPL + offset) % 24;

    const date = new Date();
    date.setMinutes(0,0,0);

    let diff = targetPL - currentPL;
    if (diff < 0) diff += 24;

    date.setHours(date.getHours() + diff);

    return Math.floor(date.getTime()/1000);
}

//////////////////////////////////////////////////
// 🎯 EVENTY
//////////////////////////////////////////////////

function getEvent(h) {
    if ([0,3,6,9,12,15,18,21].includes(h)) return "egg";
    if ([1,4,7,10,13,16,19,22].includes(h)) return "merchant";
    if ([2,5,8,11,14,17,20,23].includes(h)) return "spin";
}

//////////////////////////////////////////////////
// 🎨 EMBEDY
//////////////////////////////////////////////////

function embedEgg() {
    return new EmbedBuilder()
        .setTitle("🥚 **RNG EGG**")
        .setDescription(
`✨ **Otwieraj jajka i zdobywaj pety**

• Zdobywaj punkty do Tieru  
• Lepsze pety = więcej punktów  
• Wyższy Tier = lepsze bonusy`
        )
        .setThumbnail(IMAGES.egg)
        .setColor(0x00ffcc);
}

function embedBoss() {
    return new EmbedBuilder()
        .setTitle("🐝 **MERCHANT BOSS**")
        .setDescription(
`🎯 **Eventowy merchant**

📍 Anniversary Event  
⏳ Dostępny przez 15 minut

• Zakupy za żetony z bossów  
• Szansa na Supreme: 125%`
        )
        .setThumbnail(IMAGES.boss)
        .setColor(0xff0000);
}

function embedHoney() {
    return new EmbedBuilder()
        .setTitle("🍯 **HONEY MERCHANT**")
        .setDescription(
`🎯 **Eventowy merchant**

📍 Bee World  
⏳ Dostępny przez 15 minut

• Zakupy za miód  
• Supreme: 110%`
        )
        .setThumbnail(IMAGES.honey)
        .setColor(0xffcc00);
}

function embedSpin() {
    return new EmbedBuilder()
        .setTitle("🎰 **DEV SPIN**")
        .setDescription(
`🎯 **Kręć kołem i zdobywaj nagrody**

• Różne nagrody  
• Szansa na Supreme: ??%`
        )
        .setThumbnail(IMAGES.spin)
        .setColor(0x9b59b6);
}

//////////////////////////////////////////////////
// 🔄 KOMENDY
//////////////////////////////////////////////////

async function registerCommands() {

    const commands = [

        new SlashCommandBuilder().setName('event').setDescription('Aktualny event'),
        new SlashCommandBuilder().setName('next-events').setDescription('Następne eventy'),
        new SlashCommandBuilder().setName('get-role').setDescription('Wybierz role'),

        new SlashCommandBuilder()
            .setName('set-role')
            .setDescription('Ustaw rolę')
            .addStringOption(o=>o.setName('event').setDescription('typ').setRequired(true)
                .addChoices(
                    {name:'egg',value:'egg'},
                    {name:'merchant',value:'merchant'},
                    {name:'spin',value:'spin'}
                ))
            .addRoleOption(o=>o.setName('rola').setDescription('rola').setRequired(true)),

        new SlashCommandBuilder()
            .setName('test-event')
            .setDescription('Wymuś event')
            .addStringOption(o=>o.setName('typ').setDescription('event').setRequired(true)
                .addChoices(
                    {name:'egg',value:'egg'},
                    {name:'merchant',value:'merchant'},
                    {name:'spin',value:'spin'}
                )),

        new SlashCommandBuilder()
            .setName('refresh')
            .setDescription('Odśwież komendy')

    ].map(c=>c.toJSON());

    const rest = new REST({ version:'10' }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );

    console.log("✅ Komendy OK");
}

//////////////////////////////////////////////////
// 🚀 START
//////////////////////////////////////////////////

client.once('clientReady', async ()=>{

    console.log(`✅ ${client.user.tag}`);
    await registerCommands();

    cron.schedule('* * * * *', async () => {

        const now = new Date();
        const h = getPLHour();
        const m = now.getMinutes();

        const ch = await client.channels.fetch(CHANNEL_ID).catch(()=>null);
        if (!ch) return;

        ////////////////////////////////////////////
        // 🔔 5 MIN PRZED
        ////////////////////////////////////////////

        if (m === 55) {

            const nextH = (h + 1) % 24;
            const nextType = getEvent(nextH);
            const role = roles[nextType];

            if (!role) return;

            const key = `${nextH}_${nextType}`;
            if (lastReminder === key) return;

            lastReminder = key;

            return ch.send({
                content: `<@&${role}>`,
                embeds: [
                    new EmbedBuilder()
                        .setTitle("🔔 **NADCHODZI EVENT**")
                        .setDescription(
`⏳ Za 5 minut:

🔥 **${nextType.toUpperCase()}**`
                        )
                        .setColor(0xffcc00)
                ]
            });
        }

        ////////////////////////////////////////////
        // 🚀 START EVENTU
        ////////////////////////////////////////////

        if (m !== 0) return;

        const type = getEvent(h);
        const role = roles[type];
        if (!role) return;

        if (type === "merchant") {
            ch.send({ content:`<@&${role}>`, embeds:[embedBoss(), embedHoney()] });
        } else if (type === "egg") {
            ch.send({ content:`<@&${role}>`, embeds:[embedEgg()] });
        } else {
            ch.send({ content:`<@&${role}>`, embeds:[embedSpin()] });
        }

    });

});

//////////////////////////////////////////////////
// ⚡ INTERAKCJE
//////////////////////////////////////////////////

client.on('interactionCreate', async i => {

    try {

        if (i.isChatInputCommand()) {

            await i.deferReply();

            if (i.commandName === "set-role") {

                const type = i.options.getString("event");
                const role = i.options.getRole("rola");

                roles[type] = role.id;

                return i.editReply(`✅ Ustawiono rolę <@&${role.id}>`);
            }

            if (i.commandName === "test-event") {

                const type = i.options.getString("typ");
                const role = roles[type];

                const ch = await client.channels.fetch(CHANNEL_ID);

                if (type === "merchant") {
                    return ch.send({ content:`<@&${role}>`, embeds:[embedBoss(), embedHoney()] });
                }

                if (type === "egg") {
                    return ch.send({ content:`<@&${role}>`, embeds:[embedEgg()] });
                }

                if (type === "spin") {
                    return ch.send({ content:`<@&${role}>`, embeds:[embedSpin()] });
                }
            }

            if (i.commandName === "next-events") {

                const h = getPLHour();

                return i.editReply({
                    embeds:[
                        new EmbedBuilder()
                            .setTitle("📅 **NASTĘPNE EVENTY**")
                            .setDescription(
`🔥 Teraz: **${getEvent(h)}**

➜ **${getEvent((h+1)%24)}** — <t:${getNextTimestamp(1)}:R>
➜ **${getEvent((h+2)%24)}** — <t:${getNextTimestamp(2)}:R>`
                            )
                            .setColor(0x5865F2)
                    ]
                });
            }

            if (i.commandName === "event") {

                const type = getEvent(getPLHour());

                if (type==="merchant") return i.editReply({ embeds:[embedBoss(), embedHoney()] });
                if (type==="egg") return i.editReply({ embeds:[embedEgg()] });
                return i.editReply({ embeds:[embedSpin()] });
            }

            if (i.commandName === "refresh") {
                await registerCommands();
                return i.editReply("✅ Odświeżono");
            }

        }

        ////////////////////////////////////////////
        // 🎭 ROLE PICKER
        ////////////////////////////////////////////

        if (i.isStringSelectMenu()) {

            const map = {
                egg: roles.egg,
                merchant: roles.merchant,
                spin: roles.spin
            };

            for (const key in map) {

                const roleId = map[key];
                if (!roleId) continue;

                if (i.values.includes(key)) {
                    await i.member.roles.add(roleId).catch(()=>{});
                } else {
                    await i.member.roles.remove(roleId).catch(()=>{});
                }
            }

            return i.update({ content:"✅ Role zaktualizowane", components:[] });
        }

    } catch(err) {
        console.log(err);
    }

});

client.login(TOKEN);
