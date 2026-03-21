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
const express = require('express');

const app = express();
app.use(express.json());
app.use(express.static('dashboard/public'));

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
    dm: [],
    embeds: {
        egg: "Zbierasz punkty i rozwijasz Tier.",
        boss: "Kupujesz za Boss Tokeny.",
        honey: "Kupujesz za miód.",
        spin: "Koło losowania."
    },
    hours: {
        egg:[0,3,6,9,12,15,18,21],
        merchant:[1,4,7,10,13,16,19,22],
        spin:[2,5,8,11,14,17,20,23]
    }
};

if (fs.existsSync(FILE)) data = JSON.parse(fs.readFileSync(FILE));
const save = () => fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

/* ================= API ================= */

app.get('/', (req,res)=>{
    res.sendFile(__dirname + '/dashboard/public/index.html');
});

app.get('/api/config',(req,res)=> res.json(data));

app.post('/api/config',(req,res)=>{
    const {roles,embeds,hours} = req.body;

    if(roles) data.roles = roles;
    if(embeds) data.embeds = embeds;
    if(hours) data.hours = hours;

    save();
    res.json({ok:true});
});

app.get('/api/events',(req,res)=>{

    const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
    const h = now.getHours();

    const getName = (e)=>{
        if(e.type==="egg") return "🥚 RNG EGG";
        if(e.type==="merchant") return "🐝 MERCHANT";
        return "🎰 DEVS SPIN";
    };

    res.json({
        now:{hour:h,event:getName(getEvent(h)),status:"AKTYWNY"},
        next:{hour:(h+1)%24,event:getName(getEvent((h+1)%24)),status:"NADCHODZI"},
        later:{hour:(h+2)%24,event:getName(getEvent((h+2)%24)),status:"KOLEJNY"}
    });
});

/* ================= EVENT ================= */

function getEvent(h){
    if(data.hours.egg.includes(h)) return {type:"egg",key:"jajko"};
    if(data.hours.merchant.includes(h)) return {type:"merchant",key:"merchant"};
    return {type:"spin",key:"spin"};
}

const format = h => `${h.toString().padStart(2,'0')}:00`;

/* ================= EMBEDY ================= */

const embedEgg=(s,h)=>new EmbedBuilder()
.setColor(0x00ffc8)
.setTitle("🥚 RNG EGG")
.setDescription(`📊 **${s}**\n\n${data.embeds.egg}\n⏰ \`${format(h)}\``);

const embedBoss=(s,h)=>new EmbedBuilder()
.setColor(0xff8800)
.setTitle("👹 BOSS MERCHANT")
.setDescription(`📊 **${s}**\n\n${data.embeds.boss}\n⏰ \`${format(h)}\``);

const embedHoney=(s,h)=>new EmbedBuilder()
.setColor(0xffcc00)
.setTitle("🐝 HONEY MERCHANT")
.setDescription(`📊 **${s}**\n\n${data.embeds.honey}\n⏰ \`${format(h)}\``);

const embedSpin=(s,h)=>new EmbedBuilder()
.setColor(0xff0055)
.setTitle("🎰 DEVS SPIN")
.setDescription(`📊 **${s}**\n\n${data.embeds.spin}\n⏰ \`${format(h)}\``);

/* ================= DM ================= */

async function sendDM(embeds){
    for(const id of data.dm){
        try{
            const user = await client.users.fetch(id);
            await user.send({embeds});
        }catch{}
    }
}

/* ================= READY ================= */

client.once('ready', async () => {

    console.log(`✅ ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder().setName('test').setDescription('Aktualny event'),
        new SlashCommandBuilder().setName('next').setDescription('2 następne'),
        new SlashCommandBuilder().setName('dm').setDescription('DM on/off'),
        new SlashCommandBuilder().setName('check-pings').setDescription('Status pingów')
    ].map(c=>c.toJSON());

    const rest=new REST({version:'10'}).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID,GUILD_ID),{body:commands});

    cron.schedule('* * * * *', async()=>{

        const channel = await client.channels.fetch(CHANNEL_ID);

        const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
        const h = now.getHours();
        const m = now.getMinutes();

        // 🔔 5 MIN PRZED
        if(m===55){
            const nh=(h+1)%24;
            const e=getEvent(nh);
            const role=data.roles[e.key];
            if(!role) return;

            let embeds=[];
            if(e.type==="merchant") embeds=[embedBoss("ZA 5 MIN",nh),embedHoney("ZA 5 MIN",nh)];
            else if(e.type==="egg") embeds=[embedEgg("ZA 5 MIN",nh)];
            else embeds=[embedSpin("ZA 5 MIN",nh)];

            channel.send({content:`<@&${role}>`,embeds});
            sendDM(embeds);
        }

        // ⏰ START
        if(m===0){
            const e=getEvent(h);
            const role=data.roles[e.key];
            if(!role) return;

            let embeds=[];
            if(e.type==="merchant") embeds=[embedBoss("START",h),embedHoney("START",h)];
            else if(e.type==="egg") embeds=[embedEgg("START",h)];
            else embeds=[embedSpin("START",h)];

            channel.send({content:`<@&${role}>`,embeds});
            sendDM(embeds);
        }

    });
});

/* ================= INTERACTIONS (NAPRAWIONE) ================= */

client.on('interactionCreate', async i => {

    if(!i.isChatInputCommand()) return;

    const now = new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
    let h = now.getHours();
    let m = now.getMinutes();

    // TEST
    if(i.commandName==='test'){
        const e=getEvent(h);

        if(e.type==="merchant")
            return i.reply({embeds:[embedBoss("AKTYWNY",h),embedHoney("AKTYWNY",h)]});
        if(e.type==="egg")
            return i.reply({embeds:[embedEgg("AKTYWNY",h)]});
        return i.reply({embeds:[embedSpin("AKTYWNY",h)]});
    }

    // NEXT
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

    // CHECK
    if(i.commandName==='check-pings'){
        if(!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return i.reply({content:"❌ brak permisji",ephemeral:true});

        return i.reply({
            embeds:[new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("📊 STATUS")
            .setDescription(
`🥚 RNG: ${data.roles.jajko?`<@&${data.roles.jajko}>`:"❌"}
🐝 MERCHANT: ${data.roles.merchant?`<@&${data.roles.merchant}>`:"❌"}
🎰 SPIN: ${data.roles.spin?`<@&${data.roles.spin}>`:"❌"}`
            )],
            ephemeral:true
        });
    }

});

/* ================= START ================= */

const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log("🌐 Dashboard działa"));

client.login(TOKEN);
