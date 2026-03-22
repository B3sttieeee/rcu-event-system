const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

// ================= ENV =================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================= CONFIG =================

const CHANNEL_ID = "1484937784283369502";

const ROLE_EGG = "1476000993119568105";
const ROLE_MERCHANT = "1476000993660502139";
const ROLE_SPIN = "1484911421903999127";

// ================= CZAS (POLSKA) =================

function getTime() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" })
  );
}

// ================= GODZINY =================

const EVENTS = {
  egg: [0,3,6,9,12,15,18,21],
  merchant: [1,4,7,10,13,16,19,22],
  spin: [2,5,8,11,14,17,20,23]
};

function getEventByHour(hour) {
  if (EVENTS.egg.includes(hour)) return "egg";
  if (EVENTS.merchant.includes(hour)) return "merchant";
  return "spin";
}

// ================= EMBED =================

function base(embed) {
  return embed
    .setFooter({ text: "Start: 2026-03-22 • Twórca: B3sttiee" })
    .setTimestamp();
}

function getEmbed(type) {

  if (type === "egg") {
    return base(
      new EmbedBuilder()
        .setColor("#f1c40f")
        .setTitle("🥚 RNG EGG EVENT")
        .setDescription(
`**➤ Otwieraj jajka i zdobywaj punkty!**

➤ Lepsze pety → więcej punktów  
➤ Więcej punktów → wyższy tier  
➤ Lepszy tier → lepsze bonusy  

🔥 FARM TERAZ!`
        )
        .setThumbnail("https://imgur.com/JqyeITl.png")
    );
  }

  if (type === "merchant") {
    return [
      base(
        new EmbedBuilder()
          .setColor("#f39c12")
          .setTitle("🍯 HONEY MERCHANT")
          .setDescription(
`**➤ Zbieraj miód i kupuj itemy!**

➤ Bee World 🐝  
➤ Supreme 110%`
          )
          .setThumbnail("https://imgur.com/zhLC0zn.png")
      ),
      base(
        new EmbedBuilder()
          .setColor("#e74c3c")
          .setTitle("💀 BOSS MERCHANT")
          .setDescription(
`**➤ Zabij bossy i zdobywaj tokeny!**

➤ Tokeny ⚔️  
➤ Supreme 125%`
          )
          .setThumbnail("https://imgur.com/yFvb6jY.png")
      )
    ];
  }

  if (type === "spin") {
    return base(
      new EmbedBuilder()
        .setColor("#9b59b6")
        .setTitle("🎡 DEV SPIN EVENT")
        .setDescription(
`**➤ Zakręć kołem i wygraj nagrody!**

➤ Nagrody 🎁  
➤ Supreme шанс`
        )
        .setThumbnail("https://imgur.com/NJI7052.png")
    );
  }
}

// ================= PING =================

function getRole(type) {
  if (type === "egg") return `<@&${ROLE_EGG}>`;
  if (type === "merchant") return `<@&${ROLE_MERCHANT}>`;
  return `<@&${ROLE_SPIN}>`;
}

// ================= SEND EVENT =================

async function sendEvent() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const now = getTime();
  const type = getEventByHour(now.getHours());

  await channel.send(`${getRole(type)} 🚀 **EVENT WYSTARTOWAŁ!**`);

  const embed = getEmbed(type);

  if (Array.isArray(embed)) {
    for (const e of embed) await channel.send({ embeds: [e] });
  } else {
    await channel.send({ embeds: [embed] });
  }
}

// ================= 5 MIN ALERT =================

async function sendReminder() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const now = getTime();
  const nextHour = (now.getHours() + 1) % 24;
  const type = getEventByHour(nextHour);

  await channel.send(`${getRole(type)} ⏳ **EVENT ZA 5 MINUT!**`);
}

// ================= NEXT EVENTS =================

function getNextEvents() {
  const now = getTime();
  const currentHour = now.getHours();

  const list = [];

  for (let i = 1; i <= 3; i++) {
    const hour = (currentHour + i) % 24;

    const date = new Date(now);
    date.setHours(hour, 0, 0, 0);

    if (hour <= currentHour) {
      date.setDate(date.getDate() + 1);
    }

    list.push({
      type: getEventByHour(hour),
      timestamp: Math.floor(date.getTime() / 1000)
    });
  }

  return list;
}

// ================= LOOP =================

setInterval(() => {
  const now = getTime();

  if (now.getMinutes() === 0) sendEvent();
  if (now.getMinutes() === 55) sendReminder();

}, 60000);

// ================= COMMANDS =================

const commands = [
  new SlashCommandBuilder().setName("event").setDescription("Aktualny event"),
  new SlashCommandBuilder().setName("next-events").setDescription("Następne eventy")
];

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
}

// ================= INTERACTIONS =================

client.on("interactionCreate", async (i) => {

  if (!i.isChatInputCommand()) return;

  if (i.commandName === "event") {
    return i.reply({
      embeds: [getEmbed(getEventByHour(getTime().getHours()))]
    });
  }

  if (i.commandName === "next-events") {

    const events = getNextEvents();

    const embed = new EmbedBuilder()
      .setColor("#2ecc71")
      .setTitle("📅 NASTĘPNE EVENTY")
      .setFooter({ text: "Start: 2026-03-22 • Twórca: B3sttiee" });

    events.forEach(e => {
      embed.addFields({
        name: `➤ ${e.type.toUpperCase()}`,
        value: `<t:${e.timestamp}:R>\n<t:${e.timestamp}:F>`
      });
    });

    return i.reply({ embeds: [embed] });
  }
});

// ================= READY =================

client.once("clientReady", async () => {
  console.log("✅ BOT ONLINE");
  await registerCommands();
});

client.login(TOKEN);
