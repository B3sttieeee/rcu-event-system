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

// GODZINY (ŚWIĘTE)
const HOURS = {
  egg: [0,3,6,9,12,15,18,21],
  merchant: [1,4,7,10,13,16,19,22],
  spin: [2,5,8,11,14,17,20,23]
};

// ================= TIME =================

function getUTCHour() {
  return new Date().getUTCHours();
}

// znajdź event po godzinie
function getEventByHour(hour) {
  for (const type in HOURS) {
    if (HOURS[type].includes(hour)) return type;
  }
}

// aktualny event
function getCurrentEvent() {
  return getEventByHour(getUTCHour());
}

// 🔥 NAJWAŻNIEJSZE — poprawny NEXT
function getNextEvents() {
  const now = new Date();
  const currentHour = now.getUTCHours();

  let results = [];

  for (let i = 1; i <= 24; i++) {
    let hour = (currentHour + i) % 24;

    const eventType = getEventByHour(hour);

    let date = new Date(now);
    date.setUTCHours(hour, 0, 0, 0);

    if (hour <= currentHour) {
      date.setUTCDate(date.getUTCDate() + 1);
    }

    results.push({
      type: eventType,
      time: Math.floor(date.getTime() / 1000)
    });
  }

  // ZWRACAMY 3 NAJBLIŻSZE
  return results.slice(0, 3);
}

// ================= EMBEDS =================

function embedEgg() {
  return new EmbedBuilder()
    .setColor("Yellow")
    .setTitle("🥚 **RNG EGG EVENT**")
    .setDescription("**Otwieraj jajka i zdobywaj punkty Tieru!**")
    .setThumbnail("https://imgur.com/JqyeITl.png");
}

function embedSpin() {
  return new EmbedBuilder()
    .setColor("Purple")
    .setTitle("🎡 **DEV SPIN EVENT**")
    .setDescription("**Kręć kołem i zdobywaj nagrody!**")
    .setThumbnail("https://imgur.com/NJI7052.png");
}

function embedMerchant1() {
  return new EmbedBuilder()
    .setColor("Gold")
    .setTitle("💰 **HONEY MERCHANT**")
    .setDescription("Za miód kupisz przedmioty\n\n**Szansa Supreme: 110%**")
    .setThumbnail("https://imgur.com/zhLC0zn.png");
}

function embedMerchant2() {
  return new EmbedBuilder()
    .setColor("Red")
    .setTitle("🔥 **BOSS MERCHANT**")
    .setDescription("Na mapie Anniversary Event\n\n**Szansa Supreme: 125%**\n\n⏳ Znika po 15 minutach")
    .setThumbnail("https://imgur.com/yFvb6jY.png");
}

// ================= SEND EVENT =================

async function sendEvent() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const event = getCurrentEvent();

  if (event === "egg") {
    await channel.send({
      content: `<@&${ROLES.egg}>`,
      embeds: [embedEgg()]
    });
  }

  if (event === "spin") {
    await channel.send({
      content: `<@&${ROLES.spin}>`,
      embeds: [embedSpin()]
    });
  }

  if (event === "merchant") {
    await channel.send({
      content: `<@&${ROLES.merchant}>`,
      embeds: [embedMerchant1(), embedMerchant2()]
    });
  }
}

// ================= TIMER =================

setInterval(() => {
  const now = new Date();

  // EVENT DOKŁADNIE
  if (now.getUTCMinutes() === 0 && now.getUTCSeconds() === 0) {
    sendEvent();
  }

  // 5 MIN PRZED
  if (now.getUTCMinutes() === 55 && now.getUTCSeconds() === 0) {
    client.channels.cache.get(CHANNEL_ID)
      ?.send("⏰ **Event za 5 minut!**");
  }

}, 1000);

// ================= DM SYSTEM =================

const userDM = new Map();

// ================= COMMANDS =================

const commands = [
  new SlashCommandBuilder().setName("event").setDescription("Aktualny event"),
  new SlashCommandBuilder().setName("next-events").setDescription("Następne eventy"),
  new SlashCommandBuilder().setName("test-ping").setDescription("Test"),
  new SlashCommandBuilder().setName("get-role").setDescription("Role"),
  new SlashCommandBuilder().setName("set-dm").setDescription("DM powiadomienia")
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

  if (i.isChatInputCommand()) {

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
        .setTitle("📅 **NASTĘPNE EVENTY**")
        .setDescription(
          `**${next[0].type.toUpperCase()}**\n<t:${next[0].time}:R>\n<t:${next[0].time}:F>\n\n` +
          `**${next[1].type.toUpperCase()}**\n<t:${next[1].time}:R>\n<t:${next[1].time}:F>`
        );

      i.reply({ embeds: [embed] });
    }

    if (i.commandName === "test-ping") {
      await sendEvent();
      i.reply({ content: "✅ OK", ephemeral: true });
    }

    if (i.commandName === "set-dm") {
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("dm")
          .setPlaceholder("Wybierz powiadomienia")
          .addOptions([
            { label: "RNG EGG", value: "egg" },
            { label: "MERCHANT", value: "merchant" },
            { label: "SPIN", value: "spin" }
          ])
      );

      i.reply({ content: "📩 Wybierz:", components: [row], ephemeral: true });
    }
  }

  if (i.isStringSelectMenu()) {
    if (i.customId === "dm") {
      userDM.set(i.user.id, i.values[0]);
      return i.reply({ content: "✅ Ustawiono DM", ephemeral: true });
    }
  }

});

client.once("clientReady", () => {
  console.log("✅ BOT ONLINE");
});

client.login(TOKEN);
