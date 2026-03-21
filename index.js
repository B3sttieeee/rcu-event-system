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
    ButtonStyle,
    PermissionsBitField
} = require('discord.js');

const cron = require('node-cron');
const fs = require('fs');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;

const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1484937784283369502';

const FILE = './data.json';

let data = {
    roles: { jajko: null, merchant: null, spin: null },
    dm: []
};

if (fs.existsSync(FILE)) data = JSON.parse(fs.readFileSync(FILE));
const save = () => fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

// 🎯 EVENT
function getEvent(h) {
    if ([0,3,6,9,12,15,18,21].includes(h)) return { type: "egg", key: "jajko" };
    if ([1,4,7,10,13,16,19,22].includes(h)) return { type: "merchant", key: "merchant" };
    return { type: "spin", key: "spin" };
}

const format = h => `${h.toString().padStart(2, '0')}:00`;

// 💎 EMBEDY
const embedEgg = (s,h)=> new EmbedBuilder().setColor(0x00ffc8).setTitle("🥚 RNG EGG")
.setDescription(`📊 **${s}**\n\nZbierasz punkty i rozwijasz Tier na Anniversary Event.\n\n⏰ \`${format(h)}\``).setTimestamp();

const embedBoss = (s,h)=> new EmbedBuilder().setColor(0xff8800).setTitle("👹 BOSS MERCHANT")
.setDescription(`📊 **${s}**\n\nKupujesz itemy za Boss Tokeny.\n\n⏰ \`${format(h)}\``).setTimestamp();

const embedHoney = (s,h)=> new EmbedBuilder().setColor(0xffcc00).setTitle("🐝 HONEY MERCHANT")
.setDescription(`📊 **${s}**\n\nKupujesz itemy za miód.\n\n⏰ \`${format(h)}\``).setTimestamp();

const embedSpin = (s,h)=> new EmbedBuilder().setColor(0xff0055).setTitle("🎰 DEVS SPIN")
.setDescription(`📊 **${s}**\n\nKoło losowania na Anniversary Event.\n\n⏰ \`${format(h)}\``).setTimestamp();

// 📩 DM
async function sendDM(embeds){
    for(const id of data.dm){
        try{
            const user = await client.users.fetch(id);
            await user.send({embeds});
        }catch{}
    }
}

// 🚀 READY
client.once('ready', async () => {

    console.log(`✅ ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder().setName('test').setDescription('Aktualny event'),
        new SlashCommandBuilder().setName('next').setDescription('2 następne eventy'),
        new SlashCommandBuilder().setName('dm').setDescription('Toggle DM'),
        new SlashCommandBuilder().setName('panel').setDescription('Ustaw role'),
        new SlashCommandBuilder().setName('roles').setDescription('Wybierz role'),
        new SlashCommandBuilder().setName('check-pings').setDescription('Status pingów')
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    console.log("✅ Commands ready");

    cron.schedule('* * * * *', async () => {

        const channel = await client.channels.fetch(CHANNEL_ID);

        const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
        const h = now.getHours();
        const m = now.getMinutes();

        // 🔔 5 MIN PRZED
        if(m === 55){
            const nh = (h+1)%24;
            const e = getEvent(nh);
            const role = data.roles[e.key];
            if(!role) return;

            const ping = `<@&${role}>`;

            let embeds=[];
            if(e.type==="merchant") embeds=[embedBoss("ZA 5 MINUT",nh),embedHoney("ZA 5 MINUT",nh)];
            else if(e.type==="egg") embeds=[embedEgg("ZA 5 MINUT",nh)];
            else embeds=[embedSpin("ZA 5 MINUT",nh)];

            channel.send({content:ping,embeds});
            sendDM(embeds);
        }

        // ⏰ START
        if(m === 0){
            const e = getEvent(h);
            const role = data.roles[e.key];
            if(!role) return;

            const ping = `<@&${role}>`;

            let embeds=[];
            if(e.type==="merchant") embeds=[embedBoss("START",h),embedHoney("START",h)];
            else if(e.type==="egg") embeds=[embedEgg("START",h)];
            else embeds=[embedSpin("START",h)];

            channel.send({content:ping,embeds});
            sendDM(embeds);
        }

    });
});

// ⚡ INTERAKCJE
client.on('interactionCreate', async i => {

    if(i.isChatInputCommand()){

        const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
        let h = now.getHours();
        let m = now.getMinutes();

        // 🧪 TEST
        if(i.commandName==='test'){
            const e=getEvent(h);

            if(e.type==="merchant")
                return i.reply({embeds:[embedBoss("AKTYWNY",h),embedHoney("AKTYWNY",h)]});
            if(e.type==="egg")
                return i.reply({embeds:[embedEgg("AKTYWNY",h)]});
            return i.reply({embeds:[embedSpin("AKTYWNY",h)]});
        }

        // ⏭ NEXT
        if(i.commandName==='next'){
            if(m>0) h=(h+1)%24;

            const h1=h;
            const h2=(h+1)%24;

            const e1=getEvent(h1);
            const e2=getEvent(h2);

            let embeds=[];

            if(e1.type==="merchant") embeds.push(embedBoss("NADCHODZI",h1),embedHoney("NADCHODZI",h1));
            else if(e1.type==="egg") embeds.push(embedEgg("NADCHODZI",h1));
            else embeds.push(embedSpin("NADCHODZI",h1));

            if(e2.type==="merchant") embeds.push(embedBoss("KOLEJNY",h2),embedHoney("KOLEJNY",h2));
            else if(e2.type==="egg") embeds.push(embedEgg("KOLEJNY",h2));
            else embeds.push(embedSpin("KOLEJNY",h2));

            return i.reply({embeds});
        }

        // 📊 CHECK
        if(i.commandName==='check-pings'){
            if(!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
                return i.reply({content:"❌ brak permisji",ephemeral:true});

            return i.reply({
                embeds:[
                    new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle("📊 STATUS PINGÓW")
                    .setDescription(
`🥚 RNG: ${data.roles.jajko?`<@&${data.roles.jajko}>`:"❌"}
🐝 MERCHANT: ${data.roles.merchant?`<@&${data.roles.merchant}>`:"❌"}
🎰 SPIN: ${data.roles.spin?`<@&${data.roles.spin}>`:"❌"}

📡 Kanał: <#${CHANNEL_ID}>`
                    )
                    .setTimestamp()
                ],
                ephemeral:true
            });
        }

        // DM
        if(i.commandName==='dm'){
            const id=i.user.id;
            if(data.dm.includes(id)){
                data.dm=data.dm.filter(x=>x!==id);
                save();
                return i.reply({content:"❌ DM OFF",ephemeral:true});
            } else {
                data.dm.push(id);
                save();
                return i.reply({content:"✅ DM ON",ephemeral:true});
            }
        }

        // PANEL
        if(i.commandName==='panel'){
            const menu=new StringSelectMenuBuilder()
            .setCustomId('select_event')
            .addOptions([
                {label:'RNG',value:'jajko'},
                {label:'Merchant',value:'merchant'},
                {label:'Spin',value:'spin'}
            ]);

            return i.reply({
                content:"Panel",
                components:[new ActionRowBuilder().addComponents(menu)]
            });
        }

        // ROLE BUTTONY
        if(i.commandName==='roles'){
            const row=new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('r1').setLabel('🥚').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('r2').setLabel('🐝').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('r3').setLabel('🎰').setStyle(ButtonStyle.Danger)
            );

            return i.reply({content:"Role:",components:[row]});
        }
    }

    // SELECT
    if(i.isStringSelectMenu()){
        if(i.customId==='select_event'){
            const type=i.values[0];

            const roles=i.guild.roles.cache
            .filter(r=>r.editable)
            .map(r=>({label:r.name,value:r.id}))
            .slice(0,25);

            const menu=new StringSelectMenuBuilder()
            .setCustomId(`set_${type}`)
            .addOptions(roles);

            return i.update({
                content:"Wybierz rolę",
                components:[new ActionRowBuilder().addComponents(menu)]
            });
        }

        if(i.customId.startsWith('set_')){
            const type=i.customId.split('_')[1];
            data.roles[type]=i.values[0];
            save();

            return i.update({content:"✅ zapisano",components:[]});
        }
    }

    // BUTTONY
    if(i.isButton()){
        const map={
            r1:data.roles.jajko,
            r2:data.roles.merchant,
            r3:data.roles.spin
        };

        const roleId=map[i.customId];
        if(!roleId) return i.reply({content:"❌ ustaw role",ephemeral:true});

        const has=i.member.roles.cache.has(roleId);

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
