require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const TOKEN = process.env.TOKEN;

const CHANNEL_ID = "1484937784283369502";

// ROLE
const ROLE_EGG = "1476000993119568105";
const ROLE_MERCHANT = "1476000993660502139";
const ROLE_SPIN = "1484911421903999127";


// =======================
// 🧠 SYSTEM CZASU (FIXED)
// =======================

function getCETDate() {
  const now = new Date();
  return new Date(now.getTime() + 60 * 60 * 1000); // +1h CET
}

function getEventType(hour) {
  if ([0,3,6,9,12,15,18,21].includes(hour)) return "egg";
  if ([1,4,7,10,13,16,19,22].includes(hour)) return "merchant";
  if ([2,5,8,11,14,17,20,23].includes(hour)) return "spin";
}

// 🔥 AKTUALNY EVENT (NAPRAWIONY)
function getCurrentEvent() {
  const now = getCETDate();
  return getEventType(now.getHours());
}

// 🔥 KOLEJNE EVENTY (NAPRAWIONE)
function getNextEvents(count = 2) {
  const now = getCETDate();
  const results = [];

  let test = new Date(now);

  for (let i = 0; i < 24; i++) {
    test.setMinutes(0, 0, 0);

    const type = getEventType(test.getHours());

    if (test > now) {
      results.push({
        type,
        time: new Date(test)
      });
    }

    test.setHours(test.getHours() + 1);

    if (results.length >= count) break;
  }

  return results;
}

// 🔥 TIMESTAMP
function toUnix(date) {
  return Math.floor(date.getTime() / 1000);
}


// =======================
// 🎨 EMBEDY
// =======================

function eventEmbed(type) {
  if (type === "egg") {
    return new EmbedBuilder()
      .setColor("#f1c40f")
      .setTitle("🥚 RNG EGG")
      .setDescription(`**Otwieraj jajka i zdobywaj punkty Tieru!**\n\n• Lepsze pety = więcej punktów\n• Lepszy Tier = lepsze bonusy`)
      .setThumbnail("https://i.imgur.com/8R8nX8M.png");
  }

  if (type === "merchant") {
    return [
      new EmbedBuilder()
        .setColor("#f39c12")
        .setTitle("🍯 HONEY MERCHANT")
        .setDescription(`**Eventowy merchant — sprawdź ofertę!**\n\n• Za miód kupisz przedmioty\n• Supreme: **110%**\n\n⏳ Znika po 15 minutach`)
        .setThumbnail("https://i.imgur.com/1XK8JZg.png"),

      new EmbedBuilder()
        .setColor("#e74c3c")
        .setTitle("👹 BOSS MERCHANT")
        .setDescription(`**Eventowy merchant na mapie Anniversary!**\n\n• Za tokeny z bossów kupisz przedmioty\n• Supreme: **125%**\n\n⏳ Znika po 15 minutach`)
        .setThumbnail("https://i.imgur.com/3XQZ4Fh.png")
    ];
  }

  if (type === "spin") {
    return new EmbedBuilder()
      .setColor("#9b59b6")
      .setTitle("🎡 DEV SPIN")
      .setDescription(`**Kręć kołem i zdobywaj nagrody!**\n\n• Szansa na Supreme`)
      .setThumbnail("https://i.imgur.com/FV9ZK0G.png");
  }
}

// =======================
// 📅 NEXT EVENTS EMBED
// =======================

function nextEventsEmbed() {
  const next = getNextEvents(2);

  return new EmbedBuilder()
    .setColor("#2ecc71")
    .setTitle("📅 NASTĘPNE EVENTY")
    .setDescription(
      next.map(e => {
        return `**${e.type.toUpperCase()}**\n<t:${toUnix(e.time)}:R>\n<t:${toUnix(e.time)}:F>\n`;
      }).join("\n")
    );
}


// =======================
// ⚡ KOMENDY
// =======================

const commands = [
  new SlashCommandBuilder()
    .setName("event")
    .setDescription("Aktualny event"),

  new SlashCommandBuilder()
    .setName("next-events")
    .setDescription("Następne eventy"),

  new SlashCommandBuilder()
    .setName("test-ping")
    .setDescription("Test eventu")
];

const rest = new REST({ version: "10" }).setToken(TOKEN);


// =======================
// 🚀 READY
// =======================

client.once("clientReady", async () => {
  console.log("✅ BOT ONLINE");

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Komendy załadowane");
});


// =======================
// 🎮 INTERACTION
// =======================

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // EVENT
  if (interaction.commandName === "event") {
    const type = getCurrentEvent();
    const embed = eventEmbed(type);

    if (Array.isArray(embed)) {
      return interaction.reply({ embeds: embed });
    }

    return interaction.reply({ embeds: [embed] });
  }

  // NEXT EVENTS
  if (interaction.commandName === "next-events") {
    return interaction.reply({
      embeds: [nextEventsEmbed()]
    });
  }

  // TEST
  if (interaction.commandName === "test-ping") {
    const type = getCurrentEvent();
    const channel = await client.channels.fetch(CHANNEL_ID);

    if (type === "merchant") {
      await channel.send(`<@&${ROLE_MERCHANT}>`);
      const embeds = eventEmbed("merchant");
      for (const e of embeds) {
        await channel.send({ embeds: [e] });
      }
    }

    if (type === "egg") {
      await channel.send(`<@&${ROLE_EGG}>`);
      await channel.send({ embeds: [eventEmbed("egg")] });
    }

    if (type === "spin") {
      await channel.send(`<@&${ROLE_SPIN}>`);
      await channel.send({ embeds: [eventEmbed("spin")] });
    }

    return interaction.reply({ content: "✅ Test wysłany", ephemeral: true });
  }
});


// =======================
// 🔐 LOGIN
// =======================

client.login(TOKEN);
