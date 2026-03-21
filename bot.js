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
    intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;

const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1484937784283369502';

const FILE = './data.json';

// 📦 DATA
let data = {
    roles: { jajko: null, merchant: null, spin: null },
    dm: {},
    giveaways: {}
};

if (fs.existsSync(FILE)) data = JSON.parse(fs.readFileSync(FILE));
const save = () => fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

// 🔥 GODZINY
const schedule = {
    jajko: [0,3,6,9,12,15,18,21],
    merchant: [1,4,7,10,13,16,19,22],
    spin: [2,5,8,11,14,17,20,23]
};

function getEventByHour(h){
    for (const key in schedule){
        if(schedule[key].includes(h)) return key;
    }
}

function eventName(key){
    return key==="jajko"?"🥚 RNG EGG":
           key==="merchant"?"🐝 MERCHANT":
           "🎰 DEV SPIN";
}

// 📩 DM
async function sendDM(key, embed){
    for(const userId in data.dm){
        if(data.dm[userId]?.includes(key)){
            try{
                const user = await client.users.fetch(userId);
                await user.send({embeds:[embed]});
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
            .setDescription('Ustaw DM'),

        new SlashCommandBuilder()
            .setName('roles-add')
            .setDescription('Ustaw role')
            .addStringOption(o=>o.setName('typ').setDescription('event').setRequired(true)
                .addChoices(
                    {name:'RNG',value:'jajko'},
                    {name:'MERCHANT',value:'merchant'},
                    {name:'SPIN',value:'spin'}
                ))
            .addRoleOption(o=>o.setName('rola').setDescription('rola').setRequired(true)),

        new SlashCommandBuilder().setName('panel').setDescription('Panel ról'),

        // 🎁 GIVEAWAY PRO
        new SlashCommandBuilder()
            .setName('giveaway')
            .setDescription('Stwórz giveaway')
            .addStringOption(o=>o.setName('nagroda').setDescription('nagroda').setRequired(true))
            .addIntegerOption(o=>o.setName('czas').setDescription('minuty').setRequired(true))
            .addIntegerOption(o=>o.setName('winners').setDescription('ile osób').setRequired(true))
            .addRoleOption(o=>o.setName('bonus_role').setDescription('więcej szans'))
            .addIntegerOption(o=>o.setName('bonus_entries').setDescription('ile extra szans'))
            .addStringOption(o=>o.setName('img').setDescription('link obrazka')),

        new SlashCommandBuilder()
            .setName('reroll')
            .setDescription('Reroll giveaway')
            .addStringOption(o=>o.setName('message_id').setDescription('ID wiadomości').setRequired(true))

    ].map(c=>c.toJSON());

    const rest = new REST({version:'10'}).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID,GUILD_ID),{body:commands});

    // ⏰ EVENT CRON
    cron.schedule('* * * * *', async () => {
        const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
        const h = now.getHours();
        const m = now.getMinutes();

        if(m!==0) return;

        const key = getEventByHour(h);
        if(!key) return;

        const role = data.roles[key];
        if(!role) return;

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(eventName(key))
            .setDescription(`📊 START\n⏰ ${h}:00`)
            .setTimestamp();

        const channel = await client.channels.fetch(CHANNEL_ID);

        await channel.send({
            content:`<@&${role}>`,
            embeds:[embed]
        });

        sendDM(key,embed);
    });

});

// ⚡ INTERAKCJE
client.on('interactionCreate', async i => {

    if(i.isChatInputCommand()){

        // 🎁 GIVEAWAY
        if(i.commandName==='giveaway'){

            const prize = i.options.getString('nagroda');
            const time = i.options.getInteger('czas');
            const winners = i.options.getInteger('winners');
            const img = i.options.getString('img');

            const bonusRole = i.options.getRole('bonus_role');
            const bonusEntries = i.options.getInteger('bonus_entries') || 0;

            const end = Date.now() + time*60000;

            const embed = new EmbedBuilder()
                .setTitle(`🎁 ${prize}`)
                .setDescription(`Kliknij przycisk aby wziąć udział!\nKoniec: <t:${Math.floor(end/1000)}:R>\nWinners: ${winners}`)
                .setColor(0x5865F2);

            if(img) embed.setImage(img);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('join_giveaway')
                    .setLabel('🎉 WEŹ UDZIAŁ')
                    .setStyle(ButtonStyle.Success)
            );

            const msg = await i.channel.send({embeds:[embed],components:[row]});

            data.giveaways[msg.id] = {
                users: [],
                winners,
                bonusRole: bonusRole?.id || null,
                bonusEntries
            };

            save();

            setTimeout(async ()=>{

                const g = data.giveaways[msg.id];
                if(!g) return;

                let pool = [];

                for(const userId of g.users){
                    pool.push(userId);

                    if(g.bonusRole){
                        const member = await i.guild.members.fetch(userId).catch(()=>null);
                        if(member && member.roles.cache.has(g.bonusRole)){
                            for(let x=0;x<g.bonusEntries;x++){
                                pool.push(userId);
                            }
                        }
                    }
                }

                const winners = [];
                for(let x=0;x<g.winners;x++){
                    const win = pool[Math.floor(Math.random()*pool.length)];
                    if(win && !winners.includes(win)){
                        winners.push(win);
                    }
                }

                i.channel.send(`🎉 Wygrali: ${winners.map(id=>`<@${id}>`).join(", ")}`);

                delete data.giveaways[msg.id];
                save();

            }, time*60000);

            return i.reply({content:"✅ giveaway start",ephemeral:true});
        }

        // 🔄 REROLL
        if(i.commandName==='reroll'){
            const id = i.options.getString('message_id');
            const g = data.giveaways[id];

            if(!g) return i.reply({content:"❌ brak giveaway",ephemeral:true});

            const winner = g.users[Math.floor(Math.random()*g.users.length)];

            return i.reply(`🎉 Nowy winner: <@${winner}>`);
        }
    }

    // 🎉 BUTTON JOIN
    if(i.isButton()){
        if(i.customId==='join_giveaway'){

            const g = data.giveaways[i.message.id];
            if(!g) return;

            if(g.users.includes(i.user.id)){
                return i.reply({content:"❌ już jesteś",ephemeral:true});
            }

            g.users.push(i.user.id);
            save();

            return i.reply({content:"✅ dołączono",ephemeral:true});
        }
    }

});

client.login(TOKEN);
