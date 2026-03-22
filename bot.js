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

process.on('unhandledRejection', err => console.log(err));
process.on('uncaughtException', err => console.log(err));

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
    active: false,
    prize: "",
    winners: 1,
    entries: {},
    rolesBonus: {},
    requiredMessages: 0,
    image: null,
    duration: 0
};

//////////////////////////////////////////////////
// 🕒 CZAS
//////////////////////////////////////////////////

function getPolishTime() {
    return new Date(new Date().toLocaleString("en-US", {
        timeZone: "Europe/Warsaw"
    }));
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
// 🎨 EVENT EMBEDY (PRO)
//////////////////////////////////////////////////

function embedEgg() {
    return new EmbedBuilder()
        .setTitle("🥚┃**RNG EGG**")
        .setDescription(
`🎲 **Otwieraj jajka i zdobywaj pety**

➜ **Zdobywaj punkty do Tieru**  
➜ **Lepsze pety = więcej punktów**  
➜ **Wyższy Tier = lepsze bonusy**

📍 **Sprawdź swoje postępy**`
        )
        .setThumbnail(IMAGES.egg)
        .setColor(0x00ffcc)
        .setFooter({ text: "Event trwa 15 minut" })
        .setTimestamp();
}

function embedBoss() {
    return new EmbedBuilder()
        .setTitle("🐝┃**MERCHANT BOSS**")
        .setDescription(
`🎉 **Eventowy Merchant**

📍 **Mapa: Anniversary Event**

➜ **Za żetony z bossów kupisz przedmioty**  
🎯 **Szansa na Supreme: 125%**

⏳ **Przejdź i sprawdź ofertę**`
        )
        .setThumbnail(IMAGES.boss)
        .setColor(0xff0000)
        .setFooter({ text: "Event trwa 15 minut" })
        .setTimestamp();
}

function embedHoney() {
    return new EmbedBuilder()
        .setTitle("🍯┃**HONEY MERCHANT**")
        .setDescription(
`🍯 **Eventowy Merchant**

📍 **Mapa: Bee World**

➜ **Za miód kupisz przedmioty**  
🎯 **Szansa na Supreme: 110%**

⏳ **Przejdź i sprawdź ofertę**`
        )
        .setThumbnail(IMAGES.honey)
        .setColor(0xffcc00)
        .setFooter({ text: "Event trwa 15 minut" })
        .setTimestamp();
}

function embedSpin() {
    return new EmbedBuilder()
        .setTitle("🎰┃**DEV SPIN**")
        .setDescription(
`🎰 **Zakręć kołem i zdobądź nagrody**

🎯 **Szansa na Supreme: ??%**

🍀 **Spróbuj swojego szczęścia**`
        )
        .setThumbnail(IMAGES.spin)
        .setColor(0x9b59b6)
        .setFooter({ text: "Event trwa 15 minut" })
        .setTimestamp();
}

//////////////////////////////////////////////////
// 🎁 GIVEAWAY EMBED (PRO)
//////////////////////////////////////////////////

function buildGiveawayEmbed() {

    const rolesText = Object.entries(giveaway.rolesBonus)
        .map(([id, val]) => `➜ <@&${id}> — **${val} wejść**`)
        .join("\n") || "➜ **Brak dodatkowych losów**";

    const end = Math.floor((Date.now() + giveaway.duration) / 1000);

    return new EmbedBuilder()
        .setTitle(`🎁┃**${giveaway.prize}**`)
        .setDescription(
`🎉 **Kliknij przycisk poniżej, aby wziąć udział!**

━━━━━━━━━━━━━━━━━━

🏆 **INFORMACJE**
➜ **Wygrani:** \`${giveaway.winners}\`  
➜ **Koniec:** <t:${end}:R>  

━━━━━━━━━━━━━━━━━━

🎯 **DODATKOWE LOSY**
${rolesText}

━━━━━━━━━━━━━━━━━━

📨 **WYMAGANIA**
➜ **${giveaway.requiredMessages} wiadomości**

━━━━━━━━━━━━━━━━━━`
        )
        .setColor(0x00ffcc)
        .setFooter({ text: "Powodzenia wszystkim uczestnikom!" })
        .setTimestamp()
        .setImage(giveaway.image || null);
}

//////////////////////////////////////////////////
// ⏱️ PARSE TIME
//////////////////////////////////////////////////

function parseTime(str) {
    const num = parseInt(str);
    if (str.endsWith("m")) return num * 60000;
    if (str.endsWith("h")) return num * 3600000;
    return 60000;
}

//////////////////////////////////////////////////
// 🔄 KOMENDY
//////////////////////////////////////////////////

async function registerCommands() {

    const commands = [

        new SlashCommandBuilder()
            .setName('event')
            .setDescription('Sprawdź aktualny event'),

        new SlashCommandBuilder()
            .setName('next-events')
            .setDescription('Sprawdź następne eventy'),

        new SlashCommandBuilder()
            .setName('test-event')
            .setDescription('Wyślij testowy event'),

        new SlashCommandBuilder()
            .setName('refresh')
            .setDescription('Odśwież komendy bota'),

        new SlashCommandBuilder()
            .setName('set-role')
            .setDescription('Ustaw rolę dla eventu')
            .addStringOption(o =>
                o.setName('event')
                 .setDescription('Typ eventu')
                 .setRequired(true)
                 .addChoices(
                    { name: 'egg', value: 'egg' },
                    { name: 'merchant', value: 'merchant' },
                    { name: 'spin', value: 'spin' }
                 )
            )
            .addRoleOption(o =>
                o.setName('rola')
                 .setDescription('Rola do pingowania')
                 .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName('giveaway')
            .setDescription('Stwórz giveaway')
            .addStringOption(o =>
                o.setName('nagroda')
                 .setDescription('Nagroda')
                 .setRequired(true)
            )
            .addStringOption(o =>
                o.setName('czas')
                 .setDescription('Czas np 10m lub 1h')
                 .setRequired(true)
            )
            .addIntegerOption(o =>
                o.setName('wygrani')
                 .setDescription('Ilość zwycięzców')
                 .setRequired(true)
            )
            .addIntegerOption(o =>
                o.setName('wiadomosci')
                 .setDescription('Wymagana liczba wiadomości')
            )
            .addStringOption(o =>
                o.setName('obrazek')
                 .setDescription('Link do obrazka')
            ),

        new SlashCommandBuilder()
            .setName('giveaway-role')
            .setDescription('Dodaj bonus dla roli')
            .addRoleOption(o =>
                o.setName('rola')
                 .setDescription('Rola')
                 .setRequired(true)
            )
            .addIntegerOption(o =>
                o.setName('bonus')
                 .setDescription('Dodatkowe wejścia')
                 .setRequired(true)
            )

    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );
}

//////////////////////////////////////////////////
// 🚀 START + CRON
//////////////////////////////////////////////////

client.once('clientReady', async () => {

    console.log(`✅ ${client.user.tag}`);
    await registerCommands();

    cron.schedule('* * * * *', async () => {

        const now = getPolishTime();
        const h = now.getHours();
        const m = now.getMinutes();

        const type = getEvent(h);
        const role = roles[type];
        if (!role) return;

        const channel = await client.channels.fetch(CHANNEL_ID);

        if (m === 0) {

            if (type === "merchant") {
                await channel.send({
                    content: `<@&${role}>`,
                    embeds: [embedBoss(), embedHoney()]
                });
            }

            if (type === "egg") {
                await channel.send({
                    content: `<@&${role}>`,
                    embeds: [embedEgg()]
                });
            }

            if (type === "spin") {
                await channel.send({
                    content: `<@&${role}>`,
                    embeds: [embedSpin()]
                });
            }
        }

    });

});

//////////////////////////////////////////////////
// ⚡ INTERAKCJE
//////////////////////////////////////////////////

client.on('interactionCreate', async i => {

    try {

        if (i.isButton() && i.customId === "join") {
            giveaway.entries[i.user.id] = 1;
            return i.reply({ content: "🎉 Dołączyłeś do giveaway!", ephemeral: true });
        }

        if (!i.isChatInputCommand()) return;

        await i.deferReply();

        if (i.commandName === "set-role") {
            roles[i.options.getString("event")] = i.options.getRole("rola").id;
            return i.editReply("✅ Rola ustawiona");
        }

        if (i.commandName === "event") {
            const type = getEvent(getPolishTime().getHours());

            if (type === "merchant") return i.editReply({ embeds: [embedBoss(), embedHoney()] });
            if (type === "egg") return i.editReply({ embeds: [embedEgg()] });
            return i.editReply({ embeds: [embedSpin()] });
        }

        if (i.commandName === "next-events") {

            const now = getPolishTime();
            const h = now.getHours();

            const ts = (off) => {
                const d = new Date(now);
                d.setHours((h + off) % 24);
                d.setMinutes(0);
                return Math.floor(d.getTime()/1000);
            };

            return i.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("📊┃**NASTĘPNE EVENTY**")
                        .setDescription(
`🔥 **Aktualny:** ${getEvent(h)}

⏰ **Następne:**
➜ ${getEvent((h+1)%24)} — <t:${ts(1)}:R>
➜ ${getEvent((h+2)%24)} — <t:${ts(2)}:R>`
                        )
                        .setColor(0x5865F2)
                ]
            });
        }

        if (i.commandName === "giveaway") {

            giveaway.prize = i.options.getString("nagroda");
            giveaway.duration = parseTime(i.options.getString("czas"));
            giveaway.winners = i.options.getInteger("wygrani");
            giveaway.requiredMessages = i.options.getInteger("wiadomosci") || 0;
            giveaway.image = i.options.getString("obrazek");

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

            setTimeout(async () => {
                const users = Object.keys(giveaway.entries);
                if (!users.length) return;

                const winner = users[Math.floor(Math.random()*users.length)];
                await msg.reply(`🎉 Wygrał: <@${winner}>`);
            }, giveaway.duration);
        }

        if (i.commandName === "giveaway-role") {
            const role = i.options.getRole("rola");
            const bonus = i.options.getInteger("bonus");

            giveaway.rolesBonus[role.id] = bonus;

            return i.editReply("✅ Dodano bonus");
        }

        if (i.commandName === "refresh") {
            await registerCommands();
            return i.editReply("✅ Komendy odświeżone");
        }

    } catch (err) {
        console.log(err);
    }

});

client.login(TOKEN);
