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

const cron = require('node-cron');
const fs = require('fs');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;

// 🔥 TWOJE ID
const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1484937784283369502';

const FILE = './data.json';

// 📦 DATA
let data = {
    roles: { jajko: null, merchant: null, spin: null },
    dm: {}, // { userId: ["jajko","spin"] }
    giveaways: []
};

if (fs.existsSync(FILE)) data = JSON.parse(fs.readFileSync(FILE));
const save = () => fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

// 🔥 CUSTOM GODZINY
const schedule = {
    jajko: [0,3,6,9,12,15,18,21],
    merchant: [1,4,7,10,13,16,19,22],
    spin: [2,5,8,11,14,17,20,23]
};

// 🎯 EVENT
function getEventByHour(h){
    for (const key in schedule){
        if (schedule[key].includes(h)){
            return key;
        }
    }
    return null;
}

function getEventName(key){
    return key === "jajko" ? "🥚 RNG EGG"
        : key === "merchant" ? "🐝 MERCHANT"
        : "🎰 DEV SPIN";
}

// 💎 EMBED
function eventEmbed(status, hour, key){
    return new EmbedBuilder()
        .setColor(
            key === "jajko" ? 0x00ffc8 :
            key === "merchant" ? 0xffaa00 :
            0xff0055
        )
        .setTitle(getEventName(key))
        .setDescription(`📊 **${status}**\n⏰ ${hour}:00`)
        .setTimestamp();
}

// 📩 DM
async function sendDM(key, embeds){
    for (const userId in data.dm){
        if (data.dm[userId]?.includes(key)){
            try{
                const user = await client.users.fetch(userId);
                await user.send({embeds});
            }catch{}
        }
    }
}

// 🚀 READY
client.once('ready', async () => {
    console.log(`✅ ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder().setName('event').setDescription('Aktualny event'),
        new SlashCommandBuilder().setName('next-event').setDescription('Następne eventy'),

        new SlashCommandBuilder()
            .setName('set-dm')
            .setDescription('Wybierz DM eventy'),

        new SlashCommandBuilder()
            .setName('roles-add')
            .setDescription('Ustaw role')
            .addStringOption(o =>
                o.setName('typ')
                    .setDescription('Event')
                    .setRequired(true)
                    .addChoices(
                        { name: 'RNG', value: 'jajko' },
                        { name: 'MERCHANT', value: 'merchant' },
                        { name: 'SPIN', value: 'spin' }
                    )
            )
            .addRoleOption(o =>
                o.setName('rola')
                    .setDescription('Rola')
                    .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName('panel')
            .setDescription('Panel ról'),

        new SlashCommandBuilder()
            .setName('giveaway')
            .setDescription('Stwórz giveaway')
            .addStringOption(o => o.setName('nagroda').setRequired(true))
            .addIntegerOption(o => o.setName('czas').setDescription('minuty').setRequired(true))
            .addIntegerOption(o => o.setName('winners').setDescription('ile osób').setRequired(true))
            .addStringOption(o => o.setName('img').setDescription('link zdjęcia'))
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    // ⏰ CRON
    cron.schedule('* * * * *', async () => {
        const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
        const h = now.getHours();
        const m = now.getMinutes();

        if(m !== 0) return;

        const key = getEventByHour(h);
        if(!key) return;

        const role = data.roles[key];
        if(!role) return;

        const embed = eventEmbed("START", h, key);
        const channel = await client.channels.fetch(CHANNEL_ID);

        await channel.send({
            content: `<@&${role}>`,
            embeds: [embed]
        });

        sendDM(key, [embed]);
    });
});

// ⚡ INTERACTIONS
client.on('interactionCreate', async i => {

    // 📊 COMMANDS
    if(i.isChatInputCommand()){

        const now = new Date();
        let h = now.getHours();

        if(i.commandName === 'event'){
            const key = getEventByHour(h);
            return i.reply({embeds:[eventEmbed("AKTYWNY",h,key)]});
        }

        if(i.commandName === 'next-event'){
            const h1=(h+1)%24;
            const h2=(h+2)%24;

            return i.reply({
                embeds:[
                    eventEmbed("NEXT",h1,getEventByHour(h1)),
                    eventEmbed("NEXT",h2,getEventByHour(h2))
                ]
            });
        }

        // 📩 DM SELECT
        if(i.commandName === 'set-dm'){
            const menu = new StringSelectMenuBuilder()
                .setCustomId('dm_select')
                .setMinValues(1)
                .setMaxValues(3)
                .addOptions([
                    {label:'RNG',value:'jajko'},
                    {label:'MERCHANT',value:'merchant'},
                    {label:'SPIN',value:'spin'}
                ]);

            return i.reply({
                content:"Wybierz eventy DM",
                components:[new ActionRowBuilder().addComponents(menu)],
                ephemeral:true
            });
        }

        // 🛠 ROLE SET
        if(i.commandName === 'roles-add'){
            if(!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
                return i.reply({content:"❌ brak permisji",ephemeral:true});

            const type = i.options.getString('typ');
            const role = i.options.getRole('rola');

            data.roles[type] = role.id;
            save();

            return i.reply({content:"✅ zapisano",ephemeral:true});
        }

        // 🎮 PANEL
        if(i.commandName === 'panel'){
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('jajko').setLabel('🥚 RNG').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('merchant').setLabel('🐝 MERCHANT').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('spin').setLabel('🎰 SPIN').setStyle(ButtonStyle.Danger)
            );

            return i.reply({content:"🎮 PANEL RÓL",components:[row]});
        }

        // 🎁 GIVEAWAY
        if(i.commandName === 'giveaway'){
            const prize = i.options.getString('nagroda');
            const time = i.options.getInteger('czas');
            const winners = i.options.getInteger('winners');
            const img = i.options.getString('img');

            const end = Date.now() + time * 60000;

            const embed = new EmbedBuilder()
                .setTitle(`🎁 ${prize}`)
                .setDescription(`Kliknij 🎉\nKoniec: <t:${Math.floor(end/1000)}:R>\nWinners: ${winners}`)
                .setColor(0x5865F2);

            if(img) embed.setImage(img);

            const msg = await i.channel.send({embeds:[embed]});
            await msg.react("🎉");

            setTimeout(async ()=>{
                const m = await i.channel.messages.fetch(msg.id);
                const users = (await m.reactions.cache.get("🎉").users.fetch()).filter(u=>!u.bot);

                const win = users.random(winners);

                i.channel.send(`🎉 Wygrali: ${win}`);
            }, time*60000);

            return i.reply({content:"✅ giveaway start",ephemeral:true});
        }
    }

    // 📩 DM SELECT SAVE
    if(i.isStringSelectMenu()){
        if(i.customId === 'dm_select'){
            data.dm[i.user.id] = i.values;
            save();

            return i.update({content:"✅ zapisano DM",components:[]});
        }
    }

    // 🔘 ROLE BUTTONS
    if(i.isButton()){
        const roleId = data.roles[i.customId];
        if(!roleId) return i.reply({content:"❌ brak roli",ephemeral:true});

        const has = i.member.roles.cache.has(roleId);

        if(has){
            await i.member.roles.remove(roleId);
            return i.reply({content:"❌ usunięto",ephemeral:true});
        } else {
            await i.member.roles.add(roleId);
            return i.reply({content:"✅ dodano",ephemeral:true});
        }
    }
});

client.login(TOKEN);
