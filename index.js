const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const cron = require('node-cron');
const fs = require('fs');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// 🔧 CONFIG
const TOKEN = 'MTQ4NDkwNDk3NjU2MzA0NDQ0NA.GXAQdO.UW0N-IoD5ckiyGULP-fpVHtZyMCsSjy-4Vh5tw';
const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1475561359851786335';

const ROLE_FILE = './roles.json';
const DM_FILE = './dm.json';

// 📁 DATA
let rolesData = { jajko: null, merchant: null, spin: null };
if (fs.existsSync(ROLE_FILE)) rolesData = JSON.parse(fs.readFileSync(ROLE_FILE));

let dmUsers = [];
if (fs.existsSync(DM_FILE)) dmUsers = JSON.parse(fs.readFileSync(DM_FILE));

const saveRoles = () => fs.writeFileSync(ROLE_FILE, JSON.stringify(rolesData, null, 2));
const saveDM = () => fs.writeFileSync(DM_FILE, JSON.stringify(dmUsers, null, 2));

// 🎯 EVENT
function getEvent(hour) {
    if ([0,3,6,9,12,15,18,21].includes(hour))
        return { name: "🥚 RNG EGG", desc: "Ultra rare egg spawn!", color: 0x00ffc8, role: rolesData.jajko };

    if ([1,4,7,10,13,16,19,22].includes(hour))
        return { name: "🐝 BOSS / HONEY MERCHANT", desc: "Merchant active!", color: 0xffcc00, role: rolesData.merchant };

    return { name: "🎰 DEVS SPIN (EVENT WORLD)", desc: "Spin event live!", color: 0xff0055, role: rolesData.spin };
}

// ⏰ FORMAT GODZINY
function formatHour(h) {
    return `${h.toString().padStart(2, '0')}:00`;
}

// 📩 DM
async function sendDM(embed) {
    for (const id of dmUsers) {
        try {
            const user = await client.users.fetch(id);
            await user.send({ embeds: [embed] });
        } catch {}
    }
}

// 🎨 EMBED
function createEmbed(event, type, hour) {

    const nextHour = (hour + 1) % 24;
    const nextEvent = getEvent(nextHour);

    return new EmbedBuilder()
        .setTitle(`${event.name}`)
        .setDescription(
            `📢 **${type}**\n\n` +
            `🕒 Godzina: **${formatHour(hour)}**\n` +
            `📌 Event: **${event.name}**\n\n` +
            `➡️ Następny:\n**${nextEvent.name}** o ${formatHour(nextHour)}`
        )
        .setColor(event.color)
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/1827/1827370.png')
        .setFooter({ text: "RCU PRO SYSTEM" })
        .setTimestamp();
}

// 🚀 READY
client.once('ready', async () => {

    console.log(`✅ ${client.user.tag} online`);

    const commands = [
        new SlashCommandBuilder().setName('panel').setDescription('Ustaw role'),
        new SlashCommandBuilder().setName('roles').setDescription('Wybierz role'),
        new SlashCommandBuilder().setName('test').setDescription('Test event'),
        new SlashCommandBuilder().setName('next').setDescription('Next event'),
        new SlashCommandBuilder().setName('dm-info').setDescription('Toggle DM'),
        new SlashCommandBuilder().setName('dm-test').setDescription('Test DM')
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    console.log("✅ Commands loaded");

    cron.schedule('* * * * *', async () => {

        const channel = await client.channels.fetch(CHANNEL_ID);
        const now = new Date();

        const h = now.getHours();
        const m = now.getMinutes();

        // 🔔 5 MIN PRZED
        if (m === 55) {
            const e = getEvent((h + 1) % 24);
            if (!e.role) return;

            const embed = createEmbed(e, "🔔 EVENT ZA 5 MINUT", (h + 1) % 24);

            channel.send({ content: `<@&${e.role}>`, embeds: [embed] });
            sendDM(embed);
        }

        // ⏰ START
        if (m === 0) {
            const e = getEvent(h);
            if (!e.role) return;

            const embed = createEmbed(e, "⏰ EVENT START", h);

            channel.send({ content: `<@&${e.role}>`, embeds: [embed] });
            sendDM(embed);
        }

    });

});

// ⚡ INTERAKCJE
client.on('interactionCreate', async interaction => {

    if (interaction.isChatInputCommand()) {

        const h = new Date().getHours();

        if (interaction.commandName === 'test') {
            const e = getEvent(h);
            return interaction.reply({ embeds: [createEmbed(e, "🧪 TEST", h)] });
        }

        if (interaction.commandName === 'next') {
            const nh = (h + 1) % 24;
            const e = getEvent(nh);
            return interaction.reply({ embeds: [createEmbed(e, "⏳ NEXT EVENT", nh)] });
        }

        if (interaction.commandName === 'dm-info') {
            const id = interaction.user.id;

            if (dmUsers.includes(id)) {
                dmUsers = dmUsers.filter(x => x !== id);
                saveDM();
                return interaction.reply({ content: "❌ DM OFF", ephemeral: true });
            } else {
                dmUsers.push(id);
                saveDM();
                return interaction.reply({ content: "✅ DM ON", ephemeral: true });
            }
        }

        if (interaction.commandName === 'dm-test') {
            const e = getEvent(h);
            const embed = createEmbed(e, "📩 TEST DM", h);

            try {
                await interaction.user.send({ embeds: [embed] });
                return interaction.reply({ content: "✅ DM wysłany!", ephemeral: true });
            } catch {
                return interaction.reply({ content: "❌ Nie mogę wysłać DM (masz wyłączone prywatne wiadomości)", ephemeral: true });
            }
        }

        if (interaction.commandName === 'panel') {
            const menu = new StringSelectMenuBuilder()
                .setCustomId('select_event')
                .setPlaceholder('Wybierz event')
                .addOptions([
                    { label: '🥚 RNG EGG', value: 'jajko' },
                    { label: '🐝 Merchant', value: 'merchant' },
                    { label: '🎰 Spin', value: 'spin' }
                ]);

            return interaction.reply({
                content: "⚙️ PANEL",
                components: [new ActionRowBuilder().addComponents(menu)]
            });
        }

        if (interaction.commandName === 'roles') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('role_jajko').setLabel('🥚 RNG EGG').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('role_merchant').setLabel('🐝 Merchant').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('role_spin').setLabel('🎰 Spin').setStyle(ButtonStyle.Danger)
            );

            return interaction.reply({
                content: "🎮 Kliknij aby wybrać powiadomienia:",
                components: [row]
            });
        }
    }

    if (interaction.isStringSelectMenu()) {

        if (interaction.customId === 'select_event') {
            const type = interaction.values[0];

            const roles = interaction.guild.roles.cache
                .filter(r => r.editable)
                .map(r => ({ label: r.name, value: r.id }))
                .slice(0, 25);

            const menu = new StringSelectMenuBuilder()
                .setCustomId(`setrole_${type}`)
                .setPlaceholder('Wybierz rolę')
                .addOptions(roles);

            return interaction.update({
                content: `Wybierz rolę`,
                components: [new ActionRowBuilder().addComponents(menu)]
            });
        }

        if (interaction.customId.startsWith('setrole_')) {
            const type = interaction.customId.split('_')[1];
            rolesData[type] = interaction.values[0];
            saveRoles();

            return interaction.update({ content: "✅ Zapisano!", components: [] });
        }
    }

    if (interaction.isButton()) {

        const member = interaction.member;

        let roleId;
        if (interaction.customId === 'role_jajko') roleId = rolesData.jajko;
        if (interaction.customId === 'role_merchant') roleId = rolesData.merchant;
        if (interaction.customId === 'role_spin') roleId = rolesData.spin;

        if (!roleId) {
            return interaction.reply({ content: "❌ Najpierw ustaw role (/panel)", ephemeral: true });
        }

        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId);
            return interaction.reply({ content: "❌ Usunięto rolę", ephemeral: true });
        } else {
            await member.roles.add(roleId);
            return interaction.reply({ content: "✅ Dodano rolę", ephemeral: true });
        }
    }
});

client.login(TOKEN);