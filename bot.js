const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  SlashCommandBuilder,
  REST,
  Routes
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const CHANNEL_ID = "1484937784283369502";

// ROLE
const ROLES = {
  egg: "1476000993119568105",
  merchant: "1476000993660502139",
  spin: "1484911421903999127"
};

// SLOTY (KLUCZ)
const SLOTS = [
  { hour: 0, type: "egg" },
  { hour: 1, type: "merchant" },
  { hour: 2, type: "spin" },
  { hour: 3, type: "egg" },
  { hour: 4, type: "merchant" },
  { hour: 5, type: "spin" },
  { hour: 6, type: "egg" },
  { hour: 7, type: "merchant" },
  { hour: 8, type: "spin" },
  { hour: 9, type: "egg" },
  { hour: 10, type: "merchant" },
  { hour: 11, type: "spin" },
  { hour: 12, type: "egg" },
  { hour: 13, type: "merchant" },
  { hour: 14, type: "spin" },
  { hour: 15, type: "egg" },
  { hour: 16, type: "merchant" },
  { hour: 17, type: "spin" },
  { hour: 18, type: "egg" },
  { hour: 19, type: "merchant" },
  { hour: 20, type: "spin" },
  { hour: 21, type: "egg" },
  { hour: 22, type: "merchant" },
  { hour: 23, type: "spin" }
];

// ================= CURRENT =================

function getCurrentEvent() {
  const h = new Date().getUTCHours();
  return SLOTS.find(s => s.hour === h).type;
}

// ================= NEXT =================

function getNextEvents() {
  const now = new Date();
  const currentHour = now.getUTCHours();

  let future = [];

  for (let i = 1; i <= 24; i++) {
    const hour = (currentHour + i) % 24;

    const slot = SLOTS.find(s => s.hour === hour);

    let date = new Date(now);
    date.setUTCHours(hour, 0, 0, 0);

    if (hour <= currentHour) {
      date.setUTCDate(date.getUTCDate() + 1);
    }

    future.push({
      type: slot.type,
      time: Math.floor(date.getTime() / 1000)
    });
  }

  return future.slice(0, 3);
}

// ================= EMBEDS =================

function embedEgg() {
  return new EmbedBuilder()
    .setColor("Yellow")
    .setTitle("🥚 **RNG EGG EVENT**")
    .setThumbnail("https://imgur.com/JqyeITl.png");
}

function embedSpin() {
  return new EmbedBuilder()
    .setColor("Purple")
    .setTitle("🎡 **DEV SPIN EVENT**")
    .setThumbnail("https://imgur.com/NJI7052.png");
}

function embedMerchant1() {
  return new EmbedBuilder()
    .setColor("Gold")
    .setTitle("💰 **HONEY MERCHANT**")
    .setThumbnail("https://imgur.com/zhLC0zn.png");
}

function embedMerchant2() {
  return new EmbedBuilder()
    .setColor("Red")
    .setTitle("🔥 **BOSS MERCHANT**")
    .setDescription("⏳ Znika po 15 minutach")
    .setThumbnail("https://imgur.com/yFvb6jY.png");
}

// ================= SEND =================

async function sendEvent() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const event = getCurrentEvent();

  if (event === "egg") {
    channel.send({ content: `<@&${ROLES.egg}>`, embeds: [embedEgg()] });
  }

  if (event === "spin") {
    channel.send({ content: `<@&${ROLES.spin}>`, embeds: [embedSpin()] });
  }

  if (event === "merchant") {
    channel.send({
      content: `<@&${ROLES.merchant}>`,
      embeds: [embedMerchant1(), embedMerchant2()]
    });
  }
}

// ================= TIMER =================

setInterval(() => {
  const now = new Date();

  if (now.getUTCMinutes() === 0 && now.getUTCSeconds() === 0) {
    sendEvent();
  }

  if (now.getUTCMinutes() === 55 && now.getUTCSeconds() === 0) {
    client.channels.cache.get(CHANNEL_ID)
      ?.send("⏰ Event za 5 minut!");
  }

}, 1000);

// ================= COMMANDS =================

const commands = [
  new SlashCommandBuilder().setName("event").setDescription("Aktualny event"),
  new SlashCommandBuilder().setName("next-events").setDescription("Next"),
  new SlashCommandBuilder().setName("test-ping").setDescription("Test")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
})();

// ================= INTERACTION =================

client.on("interactionCreate", async (i) => {

  if (!i.isChatInputCommand()) return;

  if (i.commandName === "event") {
    const e = getCurrentEvent();

    if (e === "egg") return i.reply({ embeds: [embedEgg()] });
    if (e === "spin") return i.reply({ embeds: [embedSpin()] });
    if (e === "merchant") return i.reply({ embeds: [embedMerchant1(), embedMerchant2()] });
  }

  if (i.commandName === "next-events") {
    const next = getNextEvents();

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("📅 NASTĘPNE EVENTY")
      .setDescription(
        `**${next[0].type.toUpperCase()}**\n<t:${next[0].time}:R>\n\n` +
        `**${next[1].type.toUpperCase()}**\n<t:${next[1].time}:R>`
      );

    i.reply({ embeds: [embed] });
  }

  if (i.commandName === "test-ping") {
    sendEvent();
    i.reply({ content: "OK", ephemeral: true });
  }

});

client.once("clientReady", () => {
  console.log("BOT ONLINE");
});

client.login(TOKEN);
