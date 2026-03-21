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

// 🌐 API (DLA DASHBOARDU)
app.get('/api/data', (req,res)=> res.json(data));

app.post('/api/set-role', (req,res)=>{
    const { type, roleId } = req.body;
    data.roles[type] = roleId;
    save();
    res.json({ok:true});
});

app.get('/', (req,res)=>{
    res.send("Bot działa ✅");
});

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

// ⚡ INTERAKCJE (TWÓJ KOD — BEZ ZMIAN)
client.on('interactionCreate', async i => {
    // zostaje jak masz
});

// 🔥 WAŻNE DLA RAILWAY
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🌐 API działa na porcie", PORT));

client.login(TOKEN);
