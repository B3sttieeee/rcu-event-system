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

// CYKL EVENTÓW
const cycle = ["egg", "merchant", "spin"];

// ================= CZAS =================

function getCurrentHourUTC() {
  return new Date().getUTCHours();
}

// znajdź event po godzinie
function getEventByHour(hour) {
  if ([0,3,6,9,12,15,18,21].includes(hour)) return "egg";
  if ([1,4,7,10,13,16,19,22].includes(hour)) return "merchant";
  if ([2,5,8,11,14,17,20,23].includes(hour)) return "spin";
}

// aktualny event
function getCurrentEvent() {
  return getEventByHour(getCurrentHourUTC());
}

// 🔥 KLUCZOWE — poprawne next eventy
function getNextEvents() {
  const now = new Date();
  const currentHour = now.getUTCHours();

  const currentEvent = getEventByHour(currentHour);
  const currentIndex = cycle.indexOf(currentEvent);

  let results = [];

  for (let i = 1; i <= 3; i++) {
    const nextIndex = (currentIndex + i) % 3;
    const nextType = cycle[nextIndex];

    let hour = (currentHour + i) % 24;

    let nextDate = new Date(now);
    nextDate.setUTCHours(hour, 0, 0, 0);

    if (hour <= currentHour) {
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    }

    results.push({
      type: nextType,
      time: Math.floor(nextDate.getTime() / 1000)
    });
  }

  return results;
}


// ================= EMBEDY =================

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


// ================= WYSYŁKA EVENTU =================

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

  // EVENT DOKŁADNIE O GODZINIE
  if (now.getUTCMinutes() === 0 && now.getUTCSeconds() === 0) {
    sendEvent();
  }

  // 5 MIN PRZED
  if (now.getUTCMinutes() === 55 && now.getUTCSeconds() === 0) {
    client.channels.cache.get(CHANNEL_ID)
      ?.send("⏰ **Event za 5 minut!**");
  }

}, 1000);


// ================= KOMENDY =================

const commands = [
  new SlashCommandBuilder().setName("event").setDescription("Aktualny event"),
  new SlashCommandBuilder().setName("next-events").setDescription("Następne eventy"),
  new SlashCommandBuilder().setName("test-ping").setDescription("Test eventu"),
  new SlashCommandBuilder().setName("get-role").setDescription("Panel ról"),
  new SlashCommandBuilder().setName("set-dm").setDescription("Powiadomienia DM")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
})();


// ================= INTERAKCJE =================

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
      i.reply({ content: "✅ Test wysłany", ephemeral: true });
    }

    if (i.commandName === "get-role") {
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("roles")
          .setPlaceholder("Wybierz role")
          .addOptions([
            { label: "RNG EGG", value: "egg" },
            { label: "MERCHANT", value: "merchant" },
            { label: "SPIN", value: "spin" }
          ])
      );

      i.reply({ content: "🎭 Wybierz role:", components: [row], ephemeral: true });
    }

  }

  if (i.isStringSelectMenu()) {
    if (i.customId === "roles") {
      const role = ROLES[i.values[0]];
      const member = await i.guild.members.fetch(i.user.id);

      if (member.roles.cache.has(role)) {
        await member.roles.remove(role);
        return i.reply({ content: "❌ Usunięto rolę", ephemeral: true });
      } else {
        await member.roles.add(role);
        return i.reply({ content: "✅ Dodano rolę", ephemeral: true });
      }
    }
  }

});

client.once("clientReady", () => {
  console.log("✅ BOT ONLINE");
});

client.login(TOKEN);
