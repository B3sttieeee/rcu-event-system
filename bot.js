const {
Client,
GatewayIntentBits,
EmbedBuilder,
REST,
Routes,
SlashCommandBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
StringSelectMenuBuilder
} = require('discord.js');

const fs = require('fs');
const cron = require('node-cron');

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

const client = new Client({
intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1484937784283369502';

//////////////////////////////////////////////////
// 📦 DATA
//////////////////////////////////////////////////

const FILE = './data.json';

let data = {
roles: { egg:null, merchant:null, spin:null },
dm: {},
giveaway: null
};

function load(){
if(fs.existsSync(FILE)){
try{
data = JSON.parse(fs.readFileSync(FILE));
}catch{}
}
}
function save(){
fs.writeFileSync(FILE, JSON.stringify(data,null,2));
}
load();

//////////////////////////////////////////////////
// 🕒 TIME FIX
//////////////////////////////////////////////////

function nowPL(){
return new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
}

function getEvent(h){
if([0,3,6,9,12,15,18,21].includes(h)) return "egg";
if([1,4,7,10,13,16,19,22].includes(h)) return "merchant";
return "spin";
}

function nextEvent(offset=1){
const now = nowPL();
const date = new Date(now.getTime() + offset*60*60*1000);
return {
type: getEvent(date.getHours()),
time: Math.floor(date.getTime()/1000)
};
}

//////////////////////////////////////////////////
// 🖼 OBRAZKI
//////////////////////////////////////////////////

const IMG = {
egg: "https://imgur.com/pY2xNUL.png",
boss: "https://imgur.com/VU9KdMS.png",
honey: "https://imgur.com/SsvlJ5a.png",
spin: "https://imgur.com/LeXDgiJ.png"
};

//////////////////////////////////////////////////
// 🎨 EMBEDY PRO
//////////////////////////////////////////////////

function EGG(){
return new EmbedBuilder()
.setTitle("🥚 **RNG EGG**")
.setDescription("**Otwieraj jajka dropiąc pety i zdobywaj Tier!**")
.setThumbnail(IMG.egg)
.setColor(0x00ffcc);
}

function BOSS(){
return new EmbedBuilder()
.setTitle("🐝 **BOSS MERCHANT**")
.setDescription("**Eventowy merchant (Anniversary Event)**\n➡️ Przejdź sprawdzić ofertę!")
.setThumbnail(IMG.boss)
.setColor(0xff0000);
}

function HONEY(){
return new EmbedBuilder()
.setTitle("🍯 **HONEY MERCHANT**")
.setDescription("**Eventowy merchant (Bee World)**\n➡️ Przejdź sprawdzić ofertę!")
.setThumbnail(IMG.honey)
.setColor(0xffcc00);
}

function SPIN(){
return new EmbedBuilder()
.setTitle("🎰 **DEV SPIN**")
.setDescription("**Kręć kołem i zdobywaj nagrody!**")
.setThumbnail(IMG.spin)
.setColor(0x9b59b6);
}

//////////////////////////////////////////////////
// 🎁 GIVEAWAY FIX
//////////////////////////////////////////////////

function gEmbed(){

if(!data.giveaway) return new EmbedBuilder().setDescription("Brak giveaway");

const users = Object.keys(data.giveaway.entries || {});
const roles = Object.entries(data.giveaway.bonus || {})
.map(([id,val])=>`<@&${id}> → x${val}`)
.join("\n") || "Brak";

return new EmbedBuilder()
.setTitle(`🎁 **${data.giveaway.prize}**`)
.setDescription(
`👥 Uczestnicy: **${users.length}**
🏆 Wygrani: **${data.giveaway.winners}**

🎯 Bonus ról:
${roles}`
)
.setColor(0x00ffcc);
}

//////////////////////////////////////////////////
// 🚀 READY
//////////////////////////////////////////////////

client.once('clientReady', async()=>{

console.log(`✅ ${client.user.tag}`);

cron.schedule('* * * * *', async()=>{

const now = nowPL();
if(now.getMinutes() !== 0) return;

const type = getEvent(now.getHours());
const role = data.roles[type];
if(!role) return;

const ch = await client.channels.fetch(CHANNEL_ID);

if(type==="merchant"){
await ch.send({content:`<@&${role}>`,embeds:[BOSS(),HONEY()]});
}else if(type==="egg"){
await ch.send({content:`<@&${role}>`,embeds:[EGG()]});
}else{
await ch.send({content:`<@&${role}>`,embeds:[SPIN()]});
}

});
});

//////////////////////////////////////////////////
// ⚡ COMMANDS
//////////////////////////////////////////////////

client.on('interactionCreate', async i=>{

if(i.isChatInputCommand()){

// EVENT
if(i.commandName==="event"){

const type = getEvent(nowPL().getHours());

let embeds=[];
if(type==="merchant") embeds=[BOSS(),HONEY()];
if(type==="egg") embeds=[EGG()];
if(type==="spin") embeds=[SPIN()];

return i.reply({embeds,ephemeral:true});
}

// NEXT EVENTS FIX
if(i.commandName==="next-events"){

const n1 = nextEvent(1);
const n2 = nextEvent(2);

return i.reply({
embeds:[new EmbedBuilder()
.setTitle("📅 **NASTĘPNE EVENTY**")
.setDescription(
`➡️ **${n1.type.toUpperCase()}** → <t:${n1.time}:R>
➡️ **${n2.type.toUpperCase()}** → <t:${n2.time}:R>`
)
.setColor(0x5865F2)
],
ephemeral:true
});
}

// GIVEAWAY ROLE FIX
if(i.commandName==="giveaway-role"){

if(!data.giveaway){
return i.reply({content:"❌ Brak aktywnego giveaway",ephemeral:true});
}

data.giveaway.bonus[i.options.getRole("rola").id] =
i.options.getInteger("x");

save();

return i.reply({content:"✅ Dodano bonus",ephemeral:true});
}

}

});

client.login(TOKEN);
