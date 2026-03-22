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
}catch{
console.log("⚠️ data.json corrupted - reset");
}
}
}

function save(){
fs.writeFileSync(FILE, JSON.stringify(data,null,2));
}

load();

//////////////////////////////////////////////////
// 🕒 TIME
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
// 🎨 EMBEDS
//////////////////////////////////////////////////

function embedEgg(){
return new EmbedBuilder()
.setTitle("🥚 **RNG EGG**")
.setDescription("**Otwieraj jajka i zdobywaj pety.**")
.setColor(0x00ffcc);
}

function embedBoss(){
return new EmbedBuilder()
.setTitle("🐝 **BOSS MERCHANT**")
.setDescription("**Eventowy merchant (Anniversary Event)**\n➡️ Sprawdź ofertę!")
.setColor(0xff0000);
}

function embedHoney(){
return new EmbedBuilder()
.setTitle("🍯 **HONEY MERCHANT**")
.setDescription("**Eventowy merchant (Bee World)**\n➡️ Sprawdź ofertę!")
.setColor(0xffcc00);
}

function embedSpin(){
return new EmbedBuilder()
.setTitle("🎰 **DEV SPIN**")
.setDescription("**Kręć kołem i zdobywaj nagrody!**")
.setColor(0x9b59b6);
}

//////////////////////////////////////////////////
// 📩 DM
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
// 🎁 GIVEAWAY
//////////////////////////////////////////////////

function giveawayEmbed(){

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
// 🔄 COMMANDS
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
.addStringOption(o=>
o.setName('event')
.setDescription('Typ eventu')
.setRequired(true)
.addChoices(
{name:'egg',value:'egg'},
{name:'merchant',value:'merchant'},
{name:'spin',value:'spin'}
))
.addRoleOption(o=>
o.setName('rola')
.setDescription('Rola do pingowania')
.setRequired(true)
),

new SlashCommandBuilder()
.setName('giveaway')
.setDescription('Stwórz giveaway')
.addStringOption(o=>
o.setName('nagroda')
.setDescription('Nagroda')
.setRequired(true)
)
.addIntegerOption(o=>
o.setName('wygrani')
.setDescription('Liczba zwycięzców')
.setRequired(true)
),

new SlashCommandBuilder()
.setName('giveaway-role')
.setDescription('Dodaj bonus roli')
.addRoleOption(o=>
o.setName('rola')
.setDescription('Rola')
.setRequired(true)
)
.addIntegerOption(o=>
o.setName('x')
.setDescription('Mnożnik szans')
.setRequired(true)
),

new SlashCommandBuilder()
.setName('reroll')
.setDescription('Losuj ponownie zwycięzcę')

].map(c=>c.toJSON());

const rest = new REST({version:'10'}).setToken(TOKEN);
await rest.put(Routes.applicationGuildCommands(CLIENT_ID,GUILD_ID), {body:commands});

console.log("✅ Komendy OK");
}

//////////////////////////////////////////////////
// 🚀 START
//////////////////////////////////////////////////

client.once('ready', async()=>{
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

if(type==="egg") embeds=[embedEgg()];
if(type==="spin") embeds=[embedSpin()];
if(type==="merchant") embeds=[embedBoss(),embedHoney()];

await channel.send({
content:`<@&${role}>`,
embeds
});

sendDM(type, embeds[0]);

});
});

//////////////////////////////////////////////////
// ⚡ INTERACTION
//////////////////////////////////////////////////

client.on('interactionCreate', async i=>{

if(i.isChatInputCommand()){

await i.deferReply({ephemeral:true});

//////////////////////////////////////////////////

if(i.commandName==="set-role"){
data.roles[i.options.getString("event")] = i.options.getRole("rola").id;
save();
return i.editReply("✅ Zapisano");
}

//////////////////////////////////////////////////

if(i.commandName==="get-role"){

const menu = new StringSelectMenuBuilder()
.setCustomId("roles")
.setMinValues(1)
.setMaxValues(3)
.addOptions([
{label:"RNG EGG",value:"egg"},
{label:"MERCHANT",value:"merchant"},
{label:"DEV SPIN",value:"spin"}
]);

return i.editReply({
content:"Wybierz role:",
components:[new ActionRowBuilder().addComponents(menu)]
});
}

//////////////////////////////////////////////////

if(i.commandName==="set-dm"){

const menu = new StringSelectMenuBuilder()
.setCustomId("dm")
.setMinValues(1)
.setMaxValues(3)
.addOptions([
{label:"RNG EGG",value:"egg"},
{label:"MERCHANT",value:"merchant"},
{label:"DEV SPIN",value:"spin"}
]);

return i.editReply({
content:"Wybierz DM:",
components:[new ActionRowBuilder().addComponents(menu)]
});
}

//////////////////////////////////////////////////

if(i.commandName==="giveaway"){

data.giveaway = {
prize: i.options.getString("nagroda"),
winners: i.options.getInteger("wygrani"),
entries: {},
bonus: {}
};

save();

const msg = await i.channel.send({
embeds:[giveawayEmbed()],
components:[new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId("join")
.setLabel("🎉 Weź udział")
.setStyle(ButtonStyle.Success)
)]
});

data.giveaway.messageId = msg.id;
save();

return i.editReply("✅ Giveaway wystartował");
}

//////////////////////////////////////////////////

if(i.commandName==="giveaway-role"){

if(!data.giveaway) return i.editReply("❌ Brak giveaway");

data.giveaway.bonus[i.options.getRole("rola").id] =
i.options.getInteger("x");

save();

return i.editReply("✅ Dodano bonus");
}

//////////////////////////////////////////////////

if(i.commandName==="reroll"){

if(!data.giveaway) return i.editReply("❌ Brak");

const users = Object.keys(data.giveaway.entries);
if(!users.length) return i.editReply("❌ Brak uczestników");

const win = users[Math.floor(Math.random()*users.length)];

return i.editReply(`🎉 Wygrywa <@${win}>`);
}

}

//////////////////////////////////////////////////
// BUTTON
//////////////////////////////////////////////////

if(i.isButton() && i.customId==="join"){

if(!data.giveaway) return;

let multi = 1;

for(const r in data.giveaway.bonus){
if(i.member.roles.cache.has(r)){
multi += data.giveaway.bonus[r];
}
}

data.giveaway.entries[i.user.id] = multi;
save();

return i.reply({
content:`🎉 Masz **x${multi}** szans`,
ephemeral:true
});
}

//////////////////////////////////////////////////
// SELECT
//////////////////////////////////////////////////

if(i.isStringSelectMenu()){

// ROLE PICKER
if(i.customId==="roles"){

for(const type in data.roles){
const roleId = data.roles[type];
if(!roleId) continue;

if(i.values.includes(type)){
await i.member.roles.add(roleId).catch(()=>{});
}else{
await i.member.roles.remove(roleId).catch(()=>{});
}
}

return i.update({
content:"✅ Role ustawione",
components:[]
});
}

// DM
if(i.customId==="dm"){
data.dm[i.user.id] = i.values;
save();

return i.update({
content:"✅ DM zapisany",
components:[]
});
}

}

});

client.login(TOKEN);
