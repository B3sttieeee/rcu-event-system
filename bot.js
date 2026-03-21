const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionsBitField
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;

const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';

// ===== KOMENDY =====
const commands = [
    new SlashCommandBuilder()
        .setName('event')
        .setDescription('Aktualny event'),

    new SlashCommandBuilder()
        .setName('next-event')
        .setDescription('Następne eventy'),

    new SlashCommandBuilder()
        .setName('check-pings')
        .setDescription('Status pingów'),

    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Test działania bota')
].map(cmd => cmd.toJSON());

// ===== EVENT SYSTEM =====
function getEvent(h) {
    if ([0,3,6,9,12,15,18,21].includes(h)) return "🥚 RNG EGG";
    if ([1,4,7,10,13,16,19,22].includes(h)) return "🐝 MERCHANT";
    return "🎰 DEVS SPIN";
}

// ===== READY =====
client.once('ready', async () => {
    console.log(`✅ BOT ONLINE: ${client.user.tag}`);

    try {
        const rest = new REST({ version: '10' }).setToken(TOKEN);

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log("✅ Komendy zarejestrowane");
    } catch (err) {
        console.error("❌ Błąd rejestracji:", err);
    }
});

// ===== INTERAKCJE =====
client.on('interactionCreate', async (interaction) => {

    if (!interaction.isChatInputCommand()) return;

    const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
    const h = now.getHours();

    // TEST
    if (interaction.commandName === 'ping') {
        return interaction.reply("🏓 Bot działa!");
    }

    // EVENT
    if (interaction.commandName === 'event') {

        const event = getEvent(h);

        const embed = new EmbedBuilder()
            .setTitle("📊 AKTUALNY EVENT")
            .setDescription(`Teraz trwa:\n\n**${event}**`)
            .setColor(0x5865F2);

        return interaction.reply({ embeds: [embed] });
    }

    // NEXT
    if (interaction.commandName === 'next-event') {

        const e1 = getEvent((h+1)%24);
        const e2 = getEvent((h+2)%24);

        const embed = new EmbedBuilder()
            .setTitle("⏭️ NASTĘPNE EVENTY")
            .setDescription(`🔜 ${e1}\n🔜 ${e2}`)
            .setColor(0x00ff99);

        return interaction.reply({ embeds: [embed] });
    }

    // CHECK
    if (interaction.commandName === 'check-pings') {

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                content: "❌ Brak permisji",
                ephemeral: true
            });
        }

        return interaction.reply({
            content: "✅ Bot działa i odpowiada",
            ephemeral: true
        });
    }

});

// ===== START =====
client.login(TOKEN);
