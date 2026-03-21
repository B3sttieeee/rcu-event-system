const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionsBitField
} = require('discord.js');

const fs = require('fs');
const cron = require('node-cron');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;

const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1484937784283369502';

const FILE = './data.json';

let data = {
    roles: {
        egg: null,
        merchant: null,
        spin: null
    }
};

if (fs.existsSync(FILE)) {
    data = JSON.parse(fs.readFileSync(FILE));
}

const save = () => fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

// ===== EVENT SYSTEM =====
function getEvent(h) {
    if ([0,3,6,9,12,15,18,21].includes(h)) return "egg";
    if ([1,4,7,10,13,16,19,22].includes(h)) return "merchant";
    return "spin";
}

function getEventName(type) {
    return {
        egg: "🥚 RNG EGG",
        merchant: "🐝 MERCHANT",
        spin: "🎰 DEVS SPIN"
    }[type];
}

// ===== KOMENDY =====
const commands = [
    new SlashCommandBuilder().setName('event').setDescription('Aktualny event'),
    new SlashCommandBuilder().setName('next-event').setDescription('Następne eventy'),
    new SlashCommandBuilder().setName('check-pings').setDescription('Status pingów'),
    new SlashCommandBuilder()
        .setName('roles-add')
        .setDescription('Ustaw role do pingów')
        .addStringOption(o =>
            o.setName('typ')
                .setDescription('egg / merchant / spin')
                .setRequired(true))
        .addRoleOption(o =>
            o.setName('rola')
                .setDescription('rola')
                .setRequired(true))
].map(cmd => cmd.toJSON());

// ===== READY =====
client.once('ready', async () => {

    console.log(`✅ ${client.user.tag}`);

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );

    console.log("✅ Komendy OK");

    // ===== CRON PING =====
    cron.schedule('* * * * *', async () => {

        const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
        const h = now.getHours();
        const m = now.getMinutes();

        if (m !== 0) return;

        const type = getEvent(h);
        const role = data.roles[type];

        if (!role) return;

        const channel = await client.channels.fetch(CHANNEL_ID);

        const embed = new EmbedBuilder()
            .setTitle(getEventName(type))
            .setDescription("📢 EVENT START")
            .setColor(0x5865F2)
            .setTimestamp();

        channel.send({
            content: `<@&${role}>`,
            embeds: [embed]
        });

        console.log("📢 Ping wysłany:", type);

    });
});

// ===== INTERAKCJE =====
client.on('interactionCreate', async (interaction) => {

    if (!interaction.isChatInputCommand()) return;

    const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
    const h = now.getHours();

    // EVENT
    if (interaction.commandName === 'event') {
        const type = getEvent(h);

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("📊 AKTUALNY EVENT")
                    .setDescription(getEventName(type))
                    .setColor(0x00ffcc)
            ]
        });
    }

    // NEXT
    if (interaction.commandName === 'next-event') {
        const e1 = getEvent((h+1)%24);
        const e2 = getEvent((h+2)%24);

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("⏭️ NASTĘPNE EVENTY")
                    .setDescription(`${getEventName(e1)}\n${getEventName(e2)}`)
                    .setColor(0xff9900)
            ]
        });
    }

    // CHECK
    if (interaction.commandName === 'check-pings') {

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("📊 STATUS PINGÓW")
                    .setDescription(
`🥚 RNG: ${data.roles.egg ? `<@&${data.roles.egg}>` : "❌"}
🐝 MERCHANT: ${data.roles.merchant ? `<@&${data.roles.merchant}>` : "❌"}
🎰 SPIN: ${data.roles.spin ? `<@&${data.roles.spin}>` : "❌"}`
                    )
            ],
            ephemeral: true
        });
    }

    // ROLES
    if (interaction.commandName === 'roles-add') {

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                content: "❌ brak permisji",
                ephemeral: true
            });
        }

        const type = interaction.options.getString('typ');
        const role = interaction.options.getRole('rola');

        if (!["egg","merchant","spin"].includes(type)) {
            return interaction.reply({
                content: "❌ wpisz: egg / merchant / spin",
                ephemeral: true
            });
        }

        data.roles[type] = role.id;
        save();

        return interaction.reply({
            content: `✅ ustawiono ${type}`,
            ephemeral: true
        });
    }

});

// ===== START =====
client.login(TOKEN);
