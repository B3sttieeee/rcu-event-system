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
giveaway: null
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

function getEvent(h){
if([0,3,6,9,12,15,18,21].includes(h)) return "egg";
if([1,4,7,10,13,16,19,22].includes(h)) return "merchant";
return "spin";
}

function nextEvent(offset){
const d = new Date(nowPL().getTime() + offset*60*60*1000);
return {
type: getEvent(d.getHours()),
time: Math.floor(d.getTime()/1000)
};
}

//////////////////////////////////////////////////
// 🖼 OBRAZKI
//////////////////////////////////////////////////

const IMG = {
egg:"https://imgur.com/pY2xNUL.png",
boss:"https://imgur.com/VU9KdMS.png",
honey:"https://imgur.com/SsvlJ5a.png",
spin:"https://imgur.com/LeXDgiJ.png"
};

//////////////////////////////////////////////////
// 🎨 EMBEDY
//////////////////////////////////////////////////

const EGG = () => new EmbedBuilder()
.setTitle("🥚 **RNG EGG**")
.setDescription("**Otwieraj jajka i zdobywaj Tier oraz nagrody!**")
.setThumbnail(IMG.egg)
.setColor(0x00ffcc);

const BOSS = () => new EmbedBuilder()
.setTitle("🐝 **BOSS MERCHANT**")
.setDescription("**Eventowy merchant (Anniversary Event)**\n➡️ Sprawdź ofertę!")
.setThumbnail(IMG.boss)
.setColor(0xff0000);

const HONEY = () => new EmbedBuilder()
.setTitle("🍯 **HONEY MERCHANT**")
.setDescription("**Eventowy merchant (Bee World)**\n➡️ Sprawdź ofertę!")
.setThumbnail(IMG.honey)
.setColor(0xffcc00);

const SPIN = () => new EmbedBuilder()
.setTitle("🎰 **DEV SPIN**")
.setDescription("**Kręć kołem i zdobywaj nagrody!**")
.setThumbnail(IMG.spin)
.setColor(0x9b59b6);

//////////////////////////////////////////////////
// 🎁 GIVEAWAY
//////////////////////////////////////////////////

function gEmbed(){
if(!data.giveaway) return;

const users = Object.keys(data.giveaway.entries || {});
const roles = Object.entries(data.giveaway.bonus || {})
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

console.log(`✅ ${client.user.tag}`);

// ⏰ EVENTY
cron.schedule('* * * * *', async()=>{

const now = nowPL();
const h = now.getHours();
const m = now.getMinutes();

// przypomnienie 5 min
if(m===55){
const next = getEvent((h+1)%24);
const role = data.roles[next];
if(!role) return;

const ch = await client.channels.fetch(CHANNEL_ID);
ch.send(`⏰ Za 5 min start: <@&${role}>`);
}

// start
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

// ⏰ GIVEAWAY END
setInterval(async()=>{
if(!data.giveaway) return;

if(Date.now()/1000 >= data.giveaway.end){

const users = Object.keys(data.giveaway.entries);
if(users.length===0) return;

const winners = users.sort(()=>0.5-Math.random()).slice(0,data.giveaway.winners);

const ch = await client.channels.fetch(data.giveaway.channel);

ch.send(`🏆 Wygrani: ${winners.map(u=>`<@${u}>`).join(", ")}`);

data.giveaway = null;
save();
}
},5000);

});

//////////////////////////////////////////////////
// ⚡ INTERACTIONS
//////////////////////////////////////////////////

client.on('interactionCreate', async i=>{

if(i.isChatInputCommand()){

// EVENT
if(i.commandName==="event"){
const type = getEvent(nowPL().getHours());

if(type==="merchant") return i.reply({embeds:[BOSS(),HONEY()]});
if(type==="egg") return i.reply({embeds:[EGG()]});
if(type==="spin") return i.reply({embeds:[SPIN()]});
}

// NEXT
if(i.commandName==="next-events"){
const n1 = nextEvent(1);
const n2 = nextEvent(2);

return i.reply({
embeds:[new EmbedBuilder()
.setTitle("📅 **NASTĘPNE EVENTY**")
.setDescription(
`➡️ **${n1.type}** → <t:${n1.time}:R>
➡️ **${n2.type}** → <t:${n2.time}:R>`
)
.setColor(0x5865F2)]
});
}

// GIVEAWAY START
if(i.commandName==="giveaway"){
if(!i.member.permissions.has(PermissionsBitField.Flags.Administrator))
return i.reply({content:"❌ Brak permisji",ephemeral:true});

data.giveaway = {
prize:i.options.getString("nagroda"),
winners:i.options.getInteger("wygrani"),
end: Math.floor(Date.now()/1000)+i.options.getInteger("czas")*60,
channel:i.channel.id,
entries:{},
bonus:{}
};
save();

const btn = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("join").setLabel("🎉 Weź udział").setStyle(ButtonStyle.Success)
);

return i.reply({embeds:[gEmbed()],components:[btn]});
}

// BONUS ROLE
if(i.commandName==="giveaway-role"){
if(!data.giveaway) return i.reply({content:"❌ Brak giveaway",ephemeral:true});

data.giveaway.bonus[i.options.getRole("rola").id] =
i.options.getInteger("x");

save();
return i.reply({content:"✅ Dodano bonus",ephemeral:true});
}

// REROLL
if(i.commandName==="reroll"){
if(!data.giveaway) return i.reply("❌ Brak");

const users = Object.keys(data.giveaway.entries);
const winner = users[Math.floor(Math.random()*users.length)];

return i.reply(`🎉 Nowy wygrany: <@${winner}>`);
}

}

// BUTTON
if(i.isButton()){
if(i.customId==="join"){

if(!data.giveaway) return;

let bonus = 1;

for(const r of i.member.roles.cache.keys()){
if(data.giveaway.bonus[r]){
bonus = data.giveaway.bonus[r];
}
}

data.giveaway.entries[i.user.id] = bonus;
save();

return i.reply({content:`✅ Masz ${bonus} losów`,ephemeral:true});
}
}

});

//////////////////////////////////////////////////
// 🚀 COMMAND REGISTER
//////////////////////////////////////////////////

async function reg(){

const cmds = [

new SlashCommandBuilder().setName("event").setDescription("Aktualny event"),
new SlashCommandBuilder().setName("next-events").setDescription("Następne eventy"),

new SlashCommandBuilder()
.setName("giveaway")
.setDescription("Start giveaway")
.addStringOption(o=>o.setName("nagroda").setDescription("Nagroda").setRequired(true))
.addIntegerOption(o=>o.setName("czas").setDescription("Czas (min)").setRequired(true))
.addIntegerOption(o=>o.setName("wygrani").setDescription("Ile osób").setRequired(true)),

new SlashCommandBuilder()
.setName("giveaway-role")
.setDescription("Bonus roli")
.addRoleOption(o=>o.setName("rola").setDescription("rola").setRequired(true))
.addIntegerOption(o=>o.setName("x").setDescription("ile losów").setRequired(true)),

new SlashCommandBuilder().setName("reroll").setDescription("Losuj ponownie")

].map(c=>c.toJSON());

const rest = new REST({version:'10'}).setToken(TOKEN);

await rest.put(
Routes.applicationGuildCommands(CLIENT_ID,GUILD_ID),
{body:cmds}
);

console.log("✅ Komendy załadowane");
}

reg();

client.login(TOKEN);
