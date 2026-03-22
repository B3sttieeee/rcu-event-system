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
StringSelectMenuBuilder,
PermissionsBitField
} = require('discord.js');

const fs = require('fs');
const cron = require('node-cron');

const client = new Client({
intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1484937784283369502';

const FILE = './data.json';

//////////////////////////////////////////////////
// 📦 DATA
//////////////////////////////////////////////////

let data = {
roles: { egg:null, merchant:null, spin:null },
dm: {},
giveaway: null,
giveawayBonus: {}
};

function load(){
if(fs.existsSync(FILE)){
data = JSON.parse(fs.readFileSync(FILE));
}}
function save(){
fs.writeFileSync(FILE, JSON.stringify(data,null,2));
}
load();

//////////////////////////////////////////////////
// 🕒 TIME
//////////////////////////////////////////////////

function nowPL(){
return new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw"}));
}

function getEvent(hour){
if([0,3,6,9,12,15,18,21].includes(hour)) return "egg";
if([1,4,7,10,13,16,19,22].includes(hour)) return "merchant";
if([2,5,8,11,14,17,20,23].includes(hour)) return "spin";
}

function nextEvent(offset){
const now = nowPL();
const future = new Date(now);
future.setHours(now.getHours()+offset,0,0,0);

return {
type: getEvent(future.getHours()),
time: Math.floor(future.getTime()/1000)
};
}

//////////////////////////////////////////////////
// 🖼 IMAGES
//////////////////////////////////////////////////

const IMG = {
egg:"https://imgur.com/pY2xNUL.png",
boss:"https://imgur.com/VU9KdMS.png",
honey:"https://imgur.com/SsvlJ5a.png",
spin:"https://imgur.com/LeXDgiJ.png"
};

//////////////////////////////////////////////////
// 🎨 EMBEDS
//////////////////////////////////////////////////

const EGG = ()=> new EmbedBuilder()
.setTitle("🥚 **RNG EGG**")
.setDescription("**Otwieraj jajka i zdobywaj Tier oraz nagrody!**")
.setThumbnail(IMG.egg)
.setColor(0x00ffcc);

const BOSS = ()=> new EmbedBuilder()
.setTitle("🐝 **BOSS MERCHANT**")
.setDescription("**Eventowy merchant (Anniversary Event)**\n➡️ Przejdź sprawdzić ofertę!")
.setThumbnail(IMG.boss)
.setColor(0xff0000);

const HONEY = ()=> new EmbedBuilder()
.setTitle("🍯 **HONEY MERCHANT**")
.setDescription("**Eventowy merchant (Bee World)**\n➡️ Przejdź sprawdzić ofertę!")
.setThumbnail(IMG.honey)
.setColor(0xffcc00);

const SPIN = ()=> new EmbedBuilder()
.setTitle("🎰 **DEV SPIN**")
.setDescription("**Kręć kołem i zdobywaj nagrody!**")
.setThumbnail(IMG.spin)
.setColor(0x9b59b6);

//////////////////////////////////////////////////
// 🎁 GIVEAWAY
//////////////////////////////////////////////////

function gEmbed(){

if(!data.giveaway) return new EmbedBuilder().setDescription("Brak giveaway");

const users = Object.keys(data.giveaway.entries || {});
const roles = Object.entries(data.giveawayBonus || {})
.map(([id,v])=>`<@&${id}> → x${v}`).join("\n") || "Brak";

return new EmbedBuilder()
.setTitle(`🎁 **${data.giveaway.prize}**`)
.setDescription(
`👥 Uczestnicy: **${users.length}**
🏆 Wygrani: **${data.giveaway.winners}**
⏳ Koniec: <t:${data.giveaway.end}:R>

🎯 Bonus ról:
${roles}`
)
.setColor(0x00ffcc);
}

//////////////////////////////////////////////////
// 🚀 READY
//////////////////////////////////////////////////

client.once('clientReady', async()=>{

console.log("✅ BOT ONLINE");

cron.schedule('* * * * *', async()=>{

const now = nowPL();
const h = now.getHours();
const m = now.getMinutes();

if(m===55){
const next = getEvent((h+1)%24);
const role = data.roles[next];
if(role){
const ch = await client.channels.fetch(CHANNEL_ID);
ch.send(`⏰ Za 5 minut: <@&${role}>`);
}
}

if(m!==0) return;

const type = getEvent(h);
const role = data.roles[type];
if(!role) return;

const ch = await client.channels.fetch(CHANNEL_ID);

if(type==="merchant"){
ch.send({content:`<@&${role}>`,embeds:[BOSS(),HONEY()]});
}
if(type==="egg"){
ch.send({content:`<@&${role}>`,embeds:[EGG()]});
}
if(type==="spin"){
ch.send({content:`<@&${role}>`,embeds:[SPIN()]});
}

});

});

//////////////////////////////////////////////////
// ⚡ INTERACTIONS
//////////////////////////////////////////////////

client.on('interactionCreate', async i=>{

// SELECT MENU FIX
if(i.isStringSelectMenu()){
if(i.customId==="roles"){

const roleId = i.values[0];

// 🔥 FIX: ignoruj jeśli null
if(!roleId || roleId==="null") 
return i.reply({content:"❌ Rola nie ustawiona",ephemeral:true});

const has = i.member.roles.cache.has(roleId);

if(has){
await i.member.roles.remove(roleId);
return i.reply({content:"❌ Usunięto rolę",ephemeral:true});
}else{
await i.member.roles.add(roleId);
return i.reply({content:"✅ Dodano rolę",ephemeral:true});
}
}
}

// BUTTON
if(i.isButton()){
if(i.customId==="join"){

if(!data.giveaway) return;

let bonus = 1;

for(const r of i.member.roles.cache.keys()){
if(data.giveawayBonus[r]){
bonus = data.giveawayBonus[r];
}
}

data.giveaway.entries[i.user.id] = bonus;
save();

return i.reply({content:`🎉 Masz ${bonus} losów`,ephemeral:true});
}
}

// COMMANDY
if(i.isChatInputCommand()){

if(i.commandName==="get-role"){

const options = [];

// 🔥 FIX: tylko jeśli istnieją
if(data.roles.egg) options.push({label:"RNG EGG",value:data.roles.egg});
if(data.roles.merchant) options.push({label:"MERCHANT",value:data.roles.merchant});
if(data.roles.spin) options.push({label:"SPIN",value:data.roles.spin});

if(options.length===0)
return i.reply({content:"❌ Brak ustawionych ról",ephemeral:true});

const menu = new StringSelectMenuBuilder()
.setCustomId("roles")
.setPlaceholder("Wybierz rolę")
.addOptions(options);

return i.reply({
content:"🎛 Wybierz role",
components:[new ActionRowBuilder().addComponents(menu)]
});
}

if(i.commandName==="next-events"){

const n1 = nextEvent(1);
const n2 = nextEvent(2);

return i.reply({
embeds:[new EmbedBuilder()
.setTitle("📅 **NASTĘPNE EVENTY**")
.setDescription(
`➡️ **${n1.type}** → <t:${n1.time}:R>
➡️ **${n2.type}** → <t:${n2.time}:R>`
)]
});
}

}

});

//////////////////////////////////////////////////
// REGISTER
//////////////////////////////////////////////////

async function register(){

const cmds = [
new SlashCommandBuilder().setName("get-role").setDescription("Panel ról"),
new SlashCommandBuilder().setName("next-events").setDescription("Następne eventy")
].map(c=>c.toJSON());

const rest = new REST({version:'10'}).setToken(TOKEN);

await rest.put(
Routes.applicationGuildCommands(CLIENT_ID,GUILD_ID),
{body:cmds}
);

console.log("✅ Komendy OK");
}

register();

client.login(TOKEN);
