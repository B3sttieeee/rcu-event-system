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
// 🎁 GIVEAWAY
//////////////////////////////////////////////////

let giveaway = {
    prize: "",
    winners: 1,
    entries: {},
    rolesBonus: {},
    requiredMessages: 0,
    image: null,
    duration: 0,
    messageId: null
};

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
    date.setUTCMinutes(0,0,0);

    let diff = targetPL - currentPL;
    if (diff < 0) diff += 24;

    date.setUTCHours(date.getUTCHours() + diff);

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
// 🎨 EMBEDY EVENTÓW
//////////////////////////////////////////////////

function embedEgg() {
    return new EmbedBuilder()
        .setTitle("🥚 **RNG EGG**")
        .setDescription(
`✨ Otwieraj jajka i zdobywaj pety

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
`🎯 Eventowy merchant

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
`🎯 Eventowy merchant

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
`🎯 Kręć kołem i zdobywaj nagrody

• Różne nagrody  
• Szansa na Supreme: ??%`
        )
        .setThumbnail(IMAGES.spin)
        .setColor(0x9b59b6);
}

//////////////////////////////////////////////////
// 🎁 GIVEAWAY EMBED
//////////////////////////////////////////////////

function buildGiveawayEmbed() {

    const users = Object.keys(giveaway.entries || {});
    const count = users.length;

    const rolesText = Object.entries(giveaway.rolesBonus || {})
        .map(([id,val])=>`• <@&${id}> — ${val} wejść`)
        .join("\n") || "Brak";

    const end = Math.floor((Date.now()+giveaway.duration)/1000);

    return new EmbedBuilder()
        .setTitle(`🎁 ${giveaway.prize}`)
        .setDescription(
`🎉 Kliknij przycisk aby wziąć udział

👥 Uczestnicy: **${count}**

🏆 Wygrani: **${giveaway.winners}**
⏱ Koniec: <t:${end}:R>

🎯 Bonusy ról:
${rolesText}

📌 Wymagania:
• ${giveaway.requiredMessages} wiadomości`
        )
        .setColor(0x00ffcc)
        .setImage(giveaway.image || null);
}

//////////////////////////////////////////////////
// 🔄 KOMENDY
//////////////////////////////////////////////////

async function registerCommands() {

    const commands = [

        new SlashCommandBuilder().setName('event').setDescription('Aktualny event'),
        new SlashCommandBuilder().setName('next-events').setDescription('Następne eventy'),
        new SlashCommandBuilder().setName('get-role').setDescription('Wybierz role eventowe'),

        new SlashCommandBuilder()
            .setName('set-role')
            .setDescription('Ustaw rolę eventu')
            .addStringOption(o=>o.setName('event').setDescription('event').setRequired(true)
                .addChoices(
                    {name:'egg',value:'egg'},
                    {name:'merchant',value:'merchant'},
                    {name:'spin',value:'spin'}
                ))
            .addRoleOption(o=>o.setName('rola').setDescription('rola').setRequired(true)),

        new SlashCommandBuilder()
            .setName('giveaway')
            .setDescription('Stwórz giveaway')
            .addStringOption(o=>o.setName('nagroda').setDescription('nagroda').setRequired(true))
            .addStringOption(o=>o.setName('czas').setDescription('minuty').setRequired(true))
            .addIntegerOption(o=>o.setName('wygrani').setDescription('ilość').setRequired(true)),

        new SlashCommandBuilder()
            .setName('giveaway-role')
            .setDescription('Bonus roli')
            .addRoleOption(o=>o.setName('rola').setDescription('rola').setRequired(true))
            .addIntegerOption(o=>o.setName('bonus').setDescription('bonus').setRequired(true)),

        new SlashCommandBuilder()
            .setName('reroll')
            .setDescription('Nowy zwycięzca'),

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

    cron.schedule('* * * * *', async ()=>{

        const h = getPLHour();
        const m = new Date().getMinutes();

        if (m !== 0) return;

        const type = getEvent(h);
        const role = roles[type];
        if (!role) return;

        const ch = await client.channels.fetch(CHANNEL_ID);

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

        // 🎭 ROLE PICKER
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

            return i.update({ content:"✅ Zaktualizowano role", components:[] });
        }

        // 🎁 JOIN
        if (i.isButton() && i.customId === "join") {

            let bonus = 1;

            for (const r in giveaway.rolesBonus) {
                if (i.member.roles.cache.has(r)) {
                    bonus += giveaway.rolesBonus[r];
                }
            }

            giveaway.entries[i.user.id] = bonus;

            const msg = await i.channel.messages.fetch(giveaway.messageId).catch(()=>null);
            if (msg) msg.edit({ embeds:[buildGiveawayEmbed()] });

            return i.reply({ content:`Masz ${bonus} losów`, ephemeral:true });
        }

        if (!i.isChatInputCommand()) return;

        await i.deferReply();

        // 🎭 PANEL RÓL
        if (i.commandName === "get-role") {

            const menu = new StringSelectMenuBuilder()
                .setCustomId("roles")
                .setPlaceholder("Wybierz role")
                .addOptions([
                    { label:"RNG EGG", value:"egg", emoji:"🥚" },
                    { label:"MERCHANT", value:"merchant", emoji:"🐝" },
                    { label:"DEV SPIN", value:"spin", emoji:"🎰" }
                ]);

            return i.editReply({
                embeds:[
                    new EmbedBuilder()
                        .setTitle("🎭 Role eventowe")
                        .setDescription("Wybierz które eventy chcesz otrzymywać")
                        .setColor(0x5865F2)
                ],
                components:[new ActionRowBuilder().addComponents(menu)]
            });
        }

        // 📅 NEXT EVENTS
        if (i.commandName === "next-events") {

            const h = getPLHour();

            return i.editReply({
                embeds:[
                    new EmbedBuilder()
                        .setTitle("📅 Następne eventy")
                        .setDescription(
`🔥 Teraz: **${getEvent(h)}**

⏰ Następne:
➜ **${getEvent((h+1)%24)}** — <t:${getNextTimestamp(1)}:R>
➜ **${getEvent((h+2)%24)}** — <t:${getNextTimestamp(2)}:R>`
                        )
                        .setColor(0x5865F2)
                ]
            });
        }

        // 📊 EVENT
        if (i.commandName === "event") {
            const type = getEvent(getPLHour());

            if (type==="merchant") return i.editReply({ embeds:[embedBoss(),embedHoney()] });
            if (type==="egg") return i.editReply({ embeds:[embedEgg()] });
            return i.editReply({ embeds:[embedSpin()] });
        }

        // 🎁 GIVEAWAY
        if (i.commandName === "giveaway") {

            giveaway.prize = i.options.getString("nagroda");
            giveaway.duration = parseInt(i.options.getString("czas"))*60000;
            giveaway.winners = i.options.getInteger("wygrani");
            giveaway.entries = {};

            const msg = await i.editReply({
                embeds:[buildGiveawayEmbed()],
                components:[
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("join")
                            .setLabel("🎉 Weź udział")
                            .setStyle(ButtonStyle.Success)
                    )
                ]
            });

            giveaway.messageId = msg.id;

            setTimeout(async ()=>{

                const pool = [];

                for (const u in giveaway.entries) {
                    for (let x=0;x<giveaway.entries[u];x++) {
                        pool.push(u);
                    }
                }

                if (!pool.length) return;

                const winner = pool[Math.floor(Math.random()*pool.length)];

                msg.reply(`🎉 Wygrał <@${winner}>`);

            }, giveaway.duration);
        }

        // 🔄 REFRESH
        if (i.commandName === "refresh") {
            await registerCommands();
            return i.editReply("✅ Odświeżono");
        }

    } catch(err) {
        console.log(err);
    }

});

client.login(TOKEN);
