const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
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

function nowPL() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
}

//////////////////////////////////////////////////
// 🎯 EVENT LOGIC
//////////////////////////////////////////////////

function getEvent(h) {
    if ([0,3,6,9,12,15,18,21].includes(h)) return "egg";
    if ([1,4,7,10,13,16,19,22].includes(h)) return "merchant";
    if ([2,5,8,11,14,17,20,23].includes(h)) return "spin";
}

//////////////////////////////////////////////////
// 🎨 EVENT EMBEDY
//////////////////////////////////////////////////

function embedEgg() {
    return new EmbedBuilder()
        .setTitle("🥚 **RNG EGG**")
        .setDescription(
`🎲 **Otwieraj jajka i zdobywaj pety**

**Zdobywaj punkty do Tieru**  
Lepsze pety = więcej punktów  
Wyższy Tier = lepsze bonusy

📍 Sprawdź swoje postępy`
        )
        .setThumbnail(IMAGES.egg)
        .setColor(0x00ffcc);
}

function embedBoss() {
    return new EmbedBuilder()
        .setTitle("🐝 **MERCHANT BOSS**")
        .setDescription(
`🎉 Eventowy merchant

📍 Mapa: Anniversary Event

Za żetony z bossów kupisz przedmioty  
Szansa na Supreme: 125%

⏳ Przejdź i sprawdź ofertę`
        )
        .setThumbnail(IMAGES.boss)
        .setColor(0xff0000);
}

function embedHoney() {
    return new EmbedBuilder()
        .setTitle("🍯 **HONEY MERCHANT**")
        .setDescription(
`🍯 Eventowy merchant

📍 Mapa: Bee World

Za miód kupisz przedmioty  
Szansa na Supreme: 110%

⏳ Przejdź i sprawdź ofertę`
        )
        .setThumbnail(IMAGES.honey)
        .setColor(0xffcc00);
}

function embedSpin() {
    return new EmbedBuilder()
        .setTitle("🎰 **DEV SPIN**")
        .setDescription(
`🎰 Kręć kołem i zdobywaj nagrody

Szansa na Supreme: ??%

🍀 Spróbuj szczęścia`
        )
        .setThumbnail(IMAGES.spin)
        .setColor(0x9b59b6);
}

//////////////////////////////////////////////////
// 🎁 GIVEAWAY EMBED (CLEAN)
//////////////////////////////////////////////////

function buildGiveawayEmbed() {

    const participants = Object.keys(giveaway.entries || {}).length;

    const rolesText = Object.entries(giveaway.rolesBonus || {})
        .map(([id, val]) => `• <@&${id}> — **${val} wejść**`)
        .join("\n") || "Brak dodatkowych losów";

    const end = Math.floor((Date.now() + giveaway.duration) / 1000);

    return new EmbedBuilder()
        .setTitle(`🎁 ${giveaway.prize || "Giveaway"}`)
        .setDescription(
`🎉 Kliknij przycisk poniżej, aby wziąć udział

👥 **Uczestnicy:** ${participants}

🏆 **Wygrani:** ${giveaway.winners}  
⏰ **Koniec:** <t:${end}:R>

🎯 **Dodatkowe losy:**
${rolesText}

📨 **Wymagania:**
${giveaway.requiredMessages} wiadomości`
        )
        .setColor(0x00ffcc)
        .setImage(giveaway.image || null)
        .setTimestamp();
}

//////////////////////////////////////////////////
// 🔄 KOMENDY
//////////////////////////////////////////////////

async function registerCommands() {

    const commands = [

        new SlashCommandBuilder()
            .setName('event')
            .setDescription('Aktualny event'),

        new SlashCommandBuilder()
            .setName('next-events')
            .setDescription('Następne eventy'),

        new SlashCommandBuilder()
            .setName('set-role')
            .setDescription('Ustaw rolę')
            .addStringOption(o =>
                o.setName('event')
                 .setDescription('event')
                 .setRequired(true)
                 .addChoices(
                    { name: 'egg', value: 'egg' },
                    { name: 'merchant', value: 'merchant' },
                    { name: 'spin', value: 'spin' }
                 )
            )
            .addRoleOption(o =>
                o.setName('rola')
                 .setDescription('rola')
                 .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName('giveaway')
            .setDescription('Start giveaway')
            .addStringOption(o=>o.setName('nagroda').setDescription('nagroda').setRequired(true))
            .addStringOption(o=>o.setName('czas').setDescription('np 10m').setRequired(true))
            .addIntegerOption(o=>o.setName('wygrani').setDescription('ilość').setRequired(true)),

        new SlashCommandBuilder()
            .setName('giveaway-role')
            .setDescription('bonus roli')
            .addRoleOption(o=>o.setName('rola').setRequired(true))
            .addIntegerOption(o=>o.setName('bonus').setRequired(true)),

        new SlashCommandBuilder()
            .setName('reroll')
            .setDescription('Losuj ponownie'),

        new SlashCommandBuilder()
            .setName('refresh')
            .setDescription('Refresh komend')

    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );
}

//////////////////////////////////////////////////
// 🚀 START
//////////////////////////////////////////////////

client.once('clientReady', async () => {
    console.log(`✅ ${client.user.tag}`);
    await registerCommands();

    cron.schedule('* * * * *', async () => {

        const now = nowPL();
        const h = now.getHours();
        const m = now.getMinutes();

        if (m !== 0) return;

        const type = getEvent(h);
        const role = roles[type];
        if (!role) return;

        const ch = await client.channels.fetch(CHANNEL_ID);

        if (type === "merchant") {
            ch.send({ content: `<@&${role}>`, embeds: [embedBoss(), embedHoney()] });
        } else if (type === "egg") {
            ch.send({ content: `<@&${role}>`, embeds: [embedEgg()] });
        } else {
            ch.send({ content: `<@&${role}>`, embeds: [embedSpin()] });
        }
    });
});

//////////////////////////////////////////////////
// ⚡ INTERAKCJE
//////////////////////////////////////////////////

client.on('interactionCreate', async i => {

    try {

        if (i.isButton() && i.customId === "join") {

            let bonus = 1;

            for (const r in giveaway.rolesBonus) {
                if (i.member.roles.cache.has(r)) {
                    bonus += giveaway.rolesBonus[r];
                }
            }

            giveaway.entries[i.user.id] = bonus;

            const msg = await i.channel.messages.fetch(giveaway.messageId).catch(()=>null);
            if (msg) msg.edit({ embeds: [buildGiveawayEmbed()] });

            return i.reply({ content: `Masz ${bonus} losów`, ephemeral: true });
        }

        if (!i.isChatInputCommand()) return;

        await i.deferReply();

        if (i.commandName === "set-role") {
            roles[i.options.getString("event")] = i.options.getRole("rola").id;
            return i.editReply("Ustawiono rolę");
        }

        if (i.commandName === "event") {
            const type = getEvent(nowPL().getHours());

            if (type === "merchant") return i.editReply({ embeds: [embedBoss(), embedHoney()] });
            if (type === "egg") return i.editReply({ embeds: [embedEgg()] });
            return i.editReply({ embeds: [embedSpin()] });
        }

        if (i.commandName === "next-events") {

            const now = nowPL();
            const h = now.getHours();

            const next = (x) => {
                const d = new Date(now);
                d.setHours((h+x)%24);
                d.setMinutes(0);
                return Math.floor(d.getTime()/1000);
            };

            return i.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("📅 Następne eventy")
                        .setDescription(
`Teraz: **${getEvent(h)}**

Za godzinę: **${getEvent((h+1)%24)}** (<t:${next(1)}:R>)
Za 2 godziny: **${getEvent((h+2)%24)}** (<t:${next(2)}:R>)`
                        )
                        .setColor(0x5865F2)
                ]
            });
        }

        if (i.commandName === "giveaway") {

            giveaway.prize = i.options.getString("nagroda");
            giveaway.duration = parseInt(i.options.getString("czas")) * 60000;
            giveaway.winners = i.options.getInteger("wygrani");
            giveaway.entries = {};

            const msg = await i.editReply({
                embeds: [buildGiveawayEmbed()],
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("join")
                            .setLabel("🎉 Weź udział")
                            .setStyle(ButtonStyle.Success)
                    )
                ]
            });

            giveaway.messageId = msg.id;

            setTimeout(async () => {

                const pool = [];

                for (const u in giveaway.entries) {
                    for (let x = 0; x < giveaway.entries[u]; x++) {
                        pool.push(u);
                    }
                }

                if (!pool.length) return;

                const winner = pool[Math.floor(Math.random()*pool.length)];
                msg.reply(`🎉 Wygrał <@${winner}>`);

            }, giveaway.duration);
        }

        if (i.commandName === "giveaway-role") {
            giveaway.rolesBonus[i.options.getRole("rola").id] =
                i.options.getInteger("bonus");

            return i.editReply("Dodano bonus");
        }

        if (i.commandName === "reroll") {

            const pool = [];

            for (const u in giveaway.entries) {
                for (let x = 0; x < giveaway.entries[u]; x++) {
                    pool.push(u);
                }
            }

            if (!pool.length) return i.editReply("Brak uczestników");

            const winner = pool[Math.floor(Math.random()*pool.length)];

            return i.editReply(`Nowy zwycięzca: <@${winner}>`);
        }

        if (i.commandName === "refresh") {
            await registerCommands();
            return i.editReply("Odświeżono komendy");
        }

    } catch (err) {
        console.log(err);
    }

});

client.login(TOKEN);
