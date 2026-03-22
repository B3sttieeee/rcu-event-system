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

const cron = require('node-cron');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

process.on('unhandledRejection', console.log);
process.on('uncaughtException', console.log);

const TOKEN = process.env.TOKEN;

const CLIENT_ID = '1484904976563044444';
const GUILD_ID = '1475521240058953830';
const CHANNEL_ID = '1484937784283369502';

//////////////////////////////////////////////////
// 🧠 DATA
//////////////////////////////////////////////////

let roles = { egg:null, merchant:null, spin:null };
let lastReminder = null;

let giveaway = null;

//////////////////////////////////////////////////
// 🖼️ IMAGES
//////////////////////////////////////////////////

const IMG = {
    egg:"https://imgur.com/pY2xNUL.png",
    boss:"https://imgur.com/VU9KdMS.png",
    honey:"https://imgur.com/SsvlJ5a.png",
    spin:"https://imgur.com/LeXDgiJ.png"
};

//////////////////////////////////////////////////
// ⏰ TIME
//////////////////////////////////////////////////

function getHour() {
    return parseInt(new Date().toLocaleString("en-US",{timeZone:"Europe/Warsaw",hour:"numeric",hour12:false}));
}

function getEvent(h){
    if ([0,3,6,9,12,15,18,21].includes(h)) return "egg";
    if ([1,4,7,10,13,16,19,22].includes(h)) return "merchant";
    return "spin";
}

function nextTs(offset){
    const d=new Date();
    d.setMinutes(0,0,0);
    d.setHours(d.getHours()+offset);
    return Math.floor(d.getTime()/1000);
}

//////////////////////////////////////////////////
// 🎨 EMBEDS
//////////////////////////////////////////////////

const eEgg=()=>new EmbedBuilder()
.setTitle("🥚 **RNG EGG**")
.setDescription(
`✨ **Otwieraj jajka i zdobywaj pety**

• Punkty do Tieru  
• Lepsze pety = więcej punktów  
• Lepsze bonusy na koniec`
)
.setThumbnail(IMG.egg)
.setColor(0x00ffcc);

const eBoss=()=>new EmbedBuilder()
.setTitle("🐝 **MERCHANT BOSS**")
.setDescription(
`🎯 **Eventowy merchant**

📍 Anniversary Event  
⏳ 15 minut

• Zakupy za żetony bossów  
• Supreme: 125%`
)
.setThumbnail(IMG.boss)
.setColor(0xff0000);

const eHoney=()=>new EmbedBuilder()
.setTitle("🍯 **HONEY MERCHANT**")
.setDescription(
`🎯 **Eventowy merchant**

📍 Bee World  
⏳ 15 minut

• Zakupy za miód  
• Supreme: 110%`
)
.setThumbnail(IMG.honey)
.setColor(0xffcc00);

const eSpin=()=>new EmbedBuilder()
.setTitle("🎰 **DEV SPIN**")
.setDescription(
`🎯 **Kręć kołem**

• Różne nagrody  
• Supreme: ??%`
)
.setThumbnail(IMG.spin)
.setColor(0x9b59b6);

//////////////////////////////////////////////////
// 🎁 GIVEAWAY
//////////////////////////////////////////////////

function gEmbed(){
    const count=Object.keys(giveaway.entries).length;

    return new EmbedBuilder()
    .setTitle(`🎁 ${giveaway.prize}`)
    .setDescription(
`🎉 Kliknij aby wziąć udział

👥 Uczestnicy: **${count}**
🏆 Wygrani: **${giveaway.winners}**
⏱ Koniec: <t:${giveaway.end}:R>`
    )
    .setColor(0x00ffcc);
}

//////////////////////////////////////////////////
// 🔄 COMMANDS
//////////////////////////////////////////////////

async function register(){

const cmds=[

new SlashCommandBuilder().setName('event').setDescription('Aktualny event'),
new SlashCommandBuilder().setName('next-events').setDescription('Następne eventy'),
new SlashCommandBuilder().setName('get-role').setDescription('Wybierz role'),

new SlashCommandBuilder()
.setName('set-role')
.setDescription('Ustaw rolę')
.addStringOption(o=>o.setName('event').setDescription('typ').setRequired(true)
.addChoices(
{name:'egg',value:'egg'},
{name:'merchant',value:'merchant'},
{name:'spin',value:'spin'}
))
.addRoleOption(o=>o.setName('rola').setDescription('rola').setRequired(true)),

new SlashCommandBuilder()
.setName('giveaway')
.setDescription('Stwórz giveaway')
.addStringOption(o=>o.setName('nagroda').setDescription('nagroda').setRequired(true))
.addIntegerOption(o=>o.setName('minuty').setDescription('czas').setRequired(true))
.addIntegerOption(o=>o.setName('wygrani').setDescription('ile').setRequired(true)),

new SlashCommandBuilder()
.setName('reroll')
.setDescription('Nowy zwycięzca'),

].map(c=>c.toJSON());

const rest=new REST({version:'10'}).setToken(TOKEN);
await rest.put(Routes.applicationGuildCommands(CLIENT_ID,GUILD_ID),{body:cmds});

console.log("✅ Komendy OK");
}

//////////////////////////////////////////////////
// 🚀 START
//////////////////////////////////////////////////

client.once('clientReady', async()=>{

await register();
console.log("BOT READY");

cron.schedule('* * * * *', async()=>{

const h=getHour();
const m=new Date().getMinutes();
const ch=await client.channels.fetch(CHANNEL_ID).catch(()=>null);
if(!ch) return;

if(m===55){
const next=getEvent((h+1)%24);
const role=roles[next];
if(!role) return;

const key=`${h}_${next}`;
if(lastReminder===key) return;
lastReminder=key;

return ch.send({
content:`<@&${role}>`,
embeds:[new EmbedBuilder()
.setTitle("🔔 **NADCHODZI EVENT**")
.setDescription(`Za 5 minut: **${next}**`)
.setColor(0xffcc00)]
});
}

if(m!==0) return;

const type=getEvent(h);
const role=roles[type];
if(!role) return;

if(type==="merchant") ch.send({content:`<@&${role}>`,embeds:[eBoss(),eHoney()]});
if(type==="egg") ch.send({content:`<@&${role}>`,embeds:[eEgg()]});
if(type==="spin") ch.send({content:`<@&${role}>`,embeds:[eSpin()]});

});

});

//////////////////////////////////////////////////
// ⚡ INTERACTIONS
//////////////////////////////////////////////////

client.on('interactionCreate', async i=>{

try{

// 🎭 SELECT (NO LAG)
if(i.isStringSelectMenu()){

const map={egg:roles.egg,merchant:roles.merchant,spin:roles.spin};

for(const k in map){
const r=map[k];
if(!r) continue;

if(i.values.includes(k)) await i.member.roles.add(r).catch(()=>{});
else await i.member.roles.remove(r).catch(()=>{});
}

return i.update({content:"✅ Role ustawione",components:[]});
}

// 🎁 JOIN
if(i.isButton() && i.customId==="join"){

if(!giveaway) return i.reply({content:"Brak giveaway",ephemeral:true});

giveaway.entries[i.user.id]=true;

return i.reply({content:"Dodano!",ephemeral:true});
}

// COMMANDS
if(!i.isChatInputCommand()) return;

await i.deferReply();

//////////////////////////////////////////////////

if(i.commandName==="get-role"){

const menu=new StringSelectMenuBuilder()
.setCustomId("roles")
.setPlaceholder("Wybierz role")
.addOptions([
{label:"RNG EGG",value:"egg"},
{label:"MERCHANT",value:"merchant"},
{label:"DEV SPIN",value:"spin"}
]);

return i.editReply({
embeds:[new EmbedBuilder()
.setTitle("🎭 Role eventowe")
.setDescription("Wybierz role")
.setColor(0x5865F2)],
components:[new ActionRowBuilder().addComponents(menu)]
});
}

//////////////////////////////////////////////////

if(i.commandName==="set-role"){

const type=i.options.getString("event");
const role=i.options.getRole("rola");

roles[type]=role.id;

return i.editReply(`✅ Ustawiono <@&${role.id}>`);
}

//////////////////////////////////////////////////

if(i.commandName==="event"){

const t=getEvent(getHour());

if(t==="merchant") return i.editReply({embeds:[eBoss(),eHoney()]});
if(t==="egg") return i.editReply({embeds:[eEgg()]});
return i.editReply({embeds:[eSpin()]});
}

//////////////////////////////////////////////////

if(i.commandName==="next-events"){

const h=getHour();

return i.editReply({
embeds:[new EmbedBuilder()
.setTitle("📅 **NASTĘPNE EVENTY**")
.setDescription(
`🔥 Teraz: **${getEvent(h)}**

➜ ${getEvent((h+1)%24)} <t:${nextTs(1)}:R>
➜ ${getEvent((h+2)%24)} <t:${nextTs(2)}:R>`
)
.setColor(0x5865F2)]
});
}

//////////////////////////////////////////////////

if(i.commandName==="giveaway"){

const prize=i.options.getString("nagroda");
const time=i.options.getInteger("minuty");
const winners=i.options.getInteger("wygrani");

giveaway={
prize,
winners,
entries:{},
end:Math.floor((Date.now()+time*60000)/1000)
};

const msg=await i.editReply({
embeds:[gEmbed()],
components:[new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("join").setLabel("🎉 Weź udział").setStyle(ButtonStyle.Success)
)]
});

setTimeout(()=>{

const users=Object.keys(giveaway.entries);
if(!users.length) return;

const win=users[Math.floor(Math.random()*users.length)];
msg.reply(`🎉 Wygrał <@${win}>`);

},time*60000);
}

//////////////////////////////////////////////////

if(i.commandName==="reroll"){

if(!giveaway) return i.editReply("Brak");

const users=Object.keys(giveaway.entries);
if(!users.length) return i.editReply("Brak uczestników");

const win=users[Math.floor(Math.random()*users.length)];

return i.editReply(`🎉 Nowy zwycięzca: <@${win}>`);
}

//////////////////////////////////////////////////

}catch(e){console.log(e);}

});

client.login(TOKEN);
