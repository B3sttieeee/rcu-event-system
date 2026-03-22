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
// 💾 DATA
//////////////////////////////////////////////////

const FILE = './data.json';

let data = {
roles: { egg:null, merchant:null, spin:null },
dm: {},
giveaway: null
};

function load(){
if(fs.existsSync(FILE)) data = JSON.parse(fs.readFileSync(FILE));
}

function save(){
fs.writeFileSync(FILE, JSON.stringify(data,null,2));
}

load();

//////////////////////////////////////////////////
// 🕒 TIME
//////////////////////////////////////////////////

function hourPL(){
return parseInt(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw",hour:"numeric",hour12:false}));
}

function getEvent(h){
if([0,3,6,9,12,15,18,21].includes(h)) return "egg";
if([1,4,7,10,13,16,19,22].includes(h)) return "merchant";
return "spin";
}

//////////////////////////////////////////////////
// 🎨 EMBED
//////////////////////////////////////////////////

const EGG=()=>new EmbedBuilder().setTitle("🥚 **RNG EGG**").setDescription("Otwieraj jajka i zdobywaj pety").setColor(0x00ffcc);
const BOSS=()=>new EmbedBuilder().setTitle("🐝 **MERCHANT BOSS**").setDescription("Anniversary Event").setColor(0xff0000);
const HONEY=()=>new EmbedBuilder().setTitle("🍯 **HONEY MERCHANT**").setDescription("Bee World").setColor(0xffcc00);
const SPIN=()=>new EmbedBuilder().setTitle("🎰 **DEV SPIN**").setDescription("Kręć kołem").setColor(0x9b59b6);

//////////////////////////////////////////////////
// 📩 DM
//////////////////////////////////////////////////

async function sendDM(type, embed){

for(const id in data.dm){

if(!data.dm[id].includes(type)) continue;

try{
const user = await client.users.fetch(id);
await user.send({embeds:[embed]});
}catch{}
}
}

//////////////////////////////////////////////////
// 🎁 GIVEAWAY
//////////////////////////////////////////////////

function gEmbed(){

const count = Object.keys(data.giveaway.entries || {}).length;

const roles = Object.entries(data.giveaway.bonus || {})
.map(([id,val])=>`<@&${id}> x${val}`)
.join("\n") || "Brak";

return new EmbedBuilder()
.setTitle(`🎁 ${data.giveaway.prize}`)
.setDescription(
`👥 Uczestnicy: **${count}**
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

const cmds=[

new SlashCommandBuilder().setName('event').setDescription('event'),
new SlashCommandBuilder().setName('next-events').setDescription('next'),

new SlashCommandBuilder().setName('get-role').setDescription('role'),
new SlashCommandBuilder().setName('set-dm').setDescription('dm picker'),

new SlashCommandBuilder()
.setName('set-role')
.setDescription('set role')
.addStringOption(o=>o.setName('event').setDescription('event').setRequired(true)
.addChoices(
{name:'egg',value:'egg'},
{name:'merchant',value:'merchant'},
{name:'spin',value:'spin'}
))
.addRoleOption(o=>o.setName('rola').setDescription('rola').setRequired(true)),

new SlashCommandBuilder()
.setName('giveaway')
.setDescription('start')
.addStringOption(o=>o.setName('nagroda').setRequired(true))
.addIntegerOption(o=>o.setName('minuty').setRequired(true))
.addIntegerOption(o=>o.setName('wygrani').setRequired(true)),

new SlashCommandBuilder()
.setName('giveaway-role')
.setDescription('bonus')
.addRoleOption(o=>o.setName('rola').setRequired(true))
.addIntegerOption(o=>o.setName('x').setRequired(true)),

new SlashCommandBuilder().setName('reroll').setDescription('reroll')

].map(c=>c.toJSON());

const rest=new REST({version:'10'}).setToken(TOKEN);
await rest.put(Routes.applicationGuildCommands(CLIENT_ID,GUILD_ID),{body:cmds});
}

//////////////////////////////////////////////////
// 🚀 START
//////////////////////////////////////////////////

client.once('ready', async()=>{

await register();
console.log("BOT READY");

cron.schedule('* * * * *', async()=>{

const h=hourPL();
const m=new Date().getMinutes();

if(m!==0) return;

const type=getEvent(h);
const role=data.roles[type];
if(!role) return;

const ch=await client.channels.fetch(CHANNEL_ID);

let embeds=[];

if(type==="merchant") embeds=[BOSS(),HONEY()];
if(type==="egg") embeds=[EGG()];
if(type==="spin") embeds=[SPIN()];

ch.send({content:`<@&${role}>`,embeds});

sendDM(type,embeds[0]);

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
return i.editReply("OK");
}

//////////////////////////////////////////////////

if(i.commandName==="get-role"){

const menu=new StringSelectMenuBuilder()
.setCustomId("roles")
.addOptions([
{label:"EGG",value:"egg"},
{label:"MERCHANT",value:"merchant"},
{label:"SPIN",value:"spin"}
]);

return i.editReply({components:[new ActionRowBuilder().addComponents(menu)]});
}

//////////////////////////////////////////////////

if(i.commandName==="set-dm"){

const menu=new StringSelectMenuBuilder()
.setCustomId("dm")
.setMinValues(1)
.setMaxValues(3)
.addOptions([
{label:"EGG",value:"egg"},
{label:"MERCHANT",value:"merchant"},
{label:"SPIN",value:"spin"}
]);

return i.editReply({content:"Wybierz DM",components:[new ActionRowBuilder().addComponents(menu)]});
}

//////////////////////////////////////////////////

if(i.commandName==="giveaway"){

data.giveaway={
prize:i.options.getString("nagroda"),
winners:i.options.getInteger("wygrani"),
entries:{},
bonus:{}
};

save();

const msg=await i.channel.send({
embeds:[gEmbed()],
components:[new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("join").setLabel("🎉 Join").setStyle(ButtonStyle.Success)
)]
});

data.giveaway.messageId=msg.id;
save();
}

//////////////////////////////////////////////////

if(i.commandName==="giveaway-role"){

data.giveaway.bonus[i.options.getRole("rola").id] =
i.options.getInteger("x");

save();
return i.editReply("Dodano bonus");
}

//////////////////////////////////////////////////

if(i.commandName==="reroll"){

const users=Object.keys(data.giveaway.entries);

const win=users[Math.floor(Math.random()*users.length)];

return i.editReply(`🎉 <@${win}>`);
}

}

//////////////////////////////////////////////////
// BUTTON
//////////////////////////////////////////////////

if(i.isButton() && i.customId==="join"){

let multi=1;

for(const r in data.giveaway.bonus){
if(i.member.roles.cache.has(r)) multi+=data.giveaway.bonus[r];
}

data.giveaway.entries[i.user.id]=multi;
save();

return i.reply({content:`Masz x${multi}`,ephemeral:true});
}

//////////////////////////////////////////////////
// SELECT
//////////////////////////////////////////////////

if(i.isStringSelectMenu()){

// ROLE
if(i.customId==="roles"){

for(const k in data.roles){
const r=data.roles[k];
if(!r) continue;

if(i.values.includes(k)) await i.member.roles.add(r).catch(()=>{});
else await i.member.roles.remove(r).catch(()=>{});
}

return i.update({content:"Role ustawione",components:[]});
}

// DM
if(i.customId==="dm"){
data.dm[i.user.id]=i.values;
save();
return i.update({content:"DM zapisany",components:[]});
}

}

});

client.login(TOKEN);
