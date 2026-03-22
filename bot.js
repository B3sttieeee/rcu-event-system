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
// DATA
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
// TIME
//////////////////////////////////////////////////

function getHour(){
return parseInt(new Date().toLocaleString("en-US", {
timeZone:"Europe/Warsaw",
hour:"numeric",
hour12:false
}));
}

function getEvent(h){
if([0,3,6,9,12,15,18,21].includes(h)) return "egg";
if([1,4,7,10,13,16,19,22].includes(h)) return "merchant";
return "spin";
}

//////////////////////////////////////////////////
// EMBEDS
//////////////////////////////////////////////////

const EGG = () => new EmbedBuilder()
.setTitle("🥚 **RNG EGG**")
.setDescription("**Otwieraj jajka i zdobywaj pety.**")
.setColor(0x00ffcc);

const BOSS = () => new EmbedBuilder()
.setTitle("🐝 **BOSS MERCHANT**")
.setDescription("**Eventowy merchant (Anniversary Event)**\n➡️ Sprawdź ofertę!")
.setColor(0xff0000);

const HONEY = () => new EmbedBuilder()
.setTitle("🍯 **HONEY MERCHANT**")
.setDescription("**Eventowy merchant (Bee World)**\n➡️ Sprawdź ofertę!")
.setColor(0xffcc00);

const SPIN = () => new EmbedBuilder()
.setTitle("🎰 **DEV SPIN**")
.setDescription("**Kręć kołem i zdobywaj nagrody!**")
.setColor(0x9b59b6);

//////////////////////////////////////////////////
// DM
//////////////////////////////////////////////////

async function sendDM(type, embed){
for(const id in data.dm){
if(!data.dm[id]?.includes(type)) continue;

try{
const user = await client.users.fetch(id);
await user.send({embeds:[embed]});
}catch{}
}
}

//////////////////////////////////////////////////
// GIVEAWAY
//////////////////////////////////////////////////

function gEmbed(){

if(!data.giveaway) return null;

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
// COMMANDS
//////////////////////////////////////////////////

async function register(){

const commands = [

new SlashCommandBuilder()
.setName('event')
.setDescription('Aktualny event'),

new SlashCommandBuilder()
.setName('next-events')
.setDescription('Następne eventy'),

new SlashCommandBuilder()
.setName('get-role')
.setDescription('Wybierz role eventowe'),

new SlashCommandBuilder()
.setName('set-dm')
.setDescription('Ustaw powiadomienia DM'),

new SlashCommandBuilder()
.setName('set-role')
.setDescription('Ustaw rolę dla eventu')
.addStringOption(o=>o.setName('event').setDescription('Typ').setRequired(true)
.addChoices(
{name:'egg',value:'egg'},
{name:'merchant',value:'merchant'},
{name:'spin',value:'spin'}
))
.addRoleOption(o=>o.setName('rola').setDescription('Rola').setRequired(true)),

new SlashCommandBuilder()
.setName('giveaway')
.setDescription('Stwórz giveaway')
.addStringOption(o=>o.setName('nagroda').setDescription('Nagroda').setRequired(true))
.addIntegerOption(o=>o.setName('wygrani').setDescription('Ilość wygranych').setRequired(true)),

new SlashCommandBuilder()
.setName('giveaway-role')
.setDescription('Bonus roli')
.addRoleOption(o=>o.setName('rola').setDescription('Rola').setRequired(true))
.addIntegerOption(o=>o.setName('x').setDescription('Mnożnik').setRequired(true)),

new SlashCommandBuilder()
.setName('reroll')
.setDescription('Losuj ponownie')

].map(c=>c.toJSON());

const rest = new REST({version:'10'}).setToken(TOKEN);
await rest.put(Routes.applicationGuildCommands(CLIENT_ID,GUILD_ID), {body:commands});

console.log("✅ Komendy załadowane");
}

//////////////////////////////////////////////////
// READY
//////////////////////////////////////////////////

client.once('clientReady', async()=>{
console.log(`✅ ${client.user.tag}`);
await register();

cron.schedule('* * * * *', async()=>{

const h = getHour();
const m = new Date().getMinutes();

if(m !== 0) return;

const type = getEvent(h);
const role = data.roles[type];
if(!role) return;

const channel = await client.channels.fetch(CHANNEL_ID);

let embeds = [];

if(type==="egg") embeds=[EGG()];
if(type==="spin") embeds=[SPIN()];
if(type==="merchant") embeds=[BOSS(),HONEY()];

await channel.send({
content:`<@&${role}>`,
embeds
});

sendDM(type, embeds[0]);

});
});

//////////////////////////////////////////////////
// INTERACTIONS
//////////////////////////////////////////////////

client.on('interactionCreate', async i=>{

// COMMANDS
if(i.isChatInputCommand()){

try{

if(i.commandName==="event"){
return i.reply({embeds:[EGG()],ephemeral:true});
}

if(i.commandName==="next-events"){
return i.reply({content:"⏳ Działa",ephemeral:true});
}

if(i.commandName==="set-role"){
data.roles[i.options.getString("event")] = i.options.getRole("rola").id;
save();
return i.reply({content:"✅ OK",ephemeral:true});
}

if(i.commandName==="get-role"){

const menu = new StringSelectMenuBuilder()
.setCustomId("roles")
.addOptions([
{label:"RNG EGG",value:"egg"},
{label:"MERCHANT",value:"merchant"},
{label:"SPIN",value:"spin"}
]);

return i.reply({
content:"Wybierz role",
components:[new ActionRowBuilder().addComponents(menu)],
ephemeral:true
});
}

if(i.commandName==="set-dm"){

const menu = new StringSelectMenuBuilder()
.setCustomId("dm")
.addOptions([
{label:"EGG",value:"egg"},
{label:"MERCHANT",value:"merchant"},
{label:"SPIN",value:"spin"}
]);

return i.reply({
content:"Wybierz DM",
components:[new ActionRowBuilder().addComponents(menu)],
ephemeral:true
});
}

if(i.commandName==="giveaway"){

data.giveaway={
prize:i.options.getString("nagroda"),
winners:i.options.getInteger("wygrani"),
entries:{},
bonus:{}
};

save();

await i.channel.send({
embeds:[gEmbed()],
components:[new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("join").setLabel("🎉 Join").setStyle(ButtonStyle.Success)
)]
});

return i.reply({content:"✅ Giveaway start",ephemeral:true});
}

if(i.commandName==="giveaway-role"){
data.giveaway.bonus[i.options.getRole("rola").id] = i.options.getInteger("x");
save();
return i.reply({content:"✅ Bonus dodany",ephemeral:true});
}

if(i.commandName==="reroll"){

const users = Object.keys(data.giveaway.entries);
if(!users.length) return i.reply({content:"❌ Brak",ephemeral:true});

const win = users[Math.floor(Math.random()*users.length)];
return i.reply({content:`🎉 <@${win}>`,ephemeral:true});
}

}catch(e){
console.error(e);
if(!i.replied) i.reply({content:"❌ Błąd",ephemeral:true});
}
}

// BUTTON
if(i.isButton() && i.customId==="join"){

let multi=1;

for(const r in data.giveaway.bonus){
if(i.member.roles.cache.has(r)) multi+=data.giveaway.bonus[r];
}

data.giveaway.entries[i.user.id]=multi;
save();

return i.reply({content:`Masz x${multi}`,ephemeral:true});
}

// SELECT
if(i.isStringSelectMenu()){

if(i.customId==="dm"){
data.dm[i.user.id]=i.values;
save();
return i.update({content:"✅ zapisano",components:[]});
}

if(i.customId==="roles"){

for(const k in data.roles){
const r=data.roles[k];
if(!r) continue;

if(i.values.includes(k)) await i.member.roles.add(r).catch(()=>{});
else await i.member.roles.remove(r).catch(()=>{});
}

return i.update({content:"✅ role ustawione",components:[]});
}

}

});

client.login(TOKEN);
