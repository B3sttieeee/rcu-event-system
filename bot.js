const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// 🔥 USTAWIENIA
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const CHANNEL_ID = "1484937784283369502";

// ROLE
const ROLE_EGG = "1476000993119568105";
const ROLE_MERCHANT = "1476000993660502139";
const ROLE_SPIN = "1484911421903999127";

// =======================
// 🧠 CZAS (NAPRAWIONY)
// =======================

function getCET() {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
}

function getEvent(hour) {
  if ([0,3,6,9,12,15,18,21].includes(hour)) return "egg";
  if ([1,4,7,10,13,16,19,22].includes(hour)) return "merchant";
  if ([2,5,8,11,14,17,20,23].includes(hour)) return "spin";
}

function getCurrentEvent() {
  const now = getCET();
  return getEvent(now.getHours());
}

function getNextEvents() {
  const now = getCET();
  const list = [];

  for (let i = 1; i <= 24; i++) {
    const future = new Date(now);
    future.setHours(now.getHours() + i, 0, 0, 0);

    list.push({
      type: getEvent(future.getHours()),
      time: future
    });

    if (list.length === 2) break;
  }

  return list;
}

function unix(t) {
  return Math.floor(t.getTime() / 1000);
}

// =======================
// 🎨 EMBEDY
// =======================

function eggEmbed() {
  return new EmbedBuilder()
    .setColor("#f1c40f")
    .setTitle("🥚 RNG EGG")
    .setDescription(
`**Otwieraj jajka i zdobywaj punkty Tieru!**

• Lepsze pety = więcej punktów
• Lepszy Tier = lepsze bonusy`
    )
    .setThumbnail("https://imgur.com/JqyeITl.png");
}

function honeyEmbed() {
  return new EmbedBuilder()
    .setColor("#f39c12")
    .setTitle("🍯 HONEY MERCHANT")
    .setDescription(
`**Eventowy merchant — sprawdź ofertę!**

• Za miód kupisz przedmioty
• Szansa na Supreme: **110%**

⏳ Znika po 15 minutach`
    )
    .setThumbnail("https://imgur.com/zhLC0zn.png");
}

function bossEmbed() {
  return new EmbedBuilder()
    .setColor("#e74c3c")
    .setTitle("👹 BOSS MERCHANT")
    .setDescription(
`**Eventowy merchant na mapie Anniversary Event!**

• Za tokeny z bossów kupisz przedmioty
• Szansa na Supreme: **125%**

⏳ Znika po 15 minutach`
    )
    .setThumbnail("https://imgur.com/yFvb6jY.png");
}

function spinEmbed() {
  return new EmbedBuilder()
    .setColor("#9b59b6")
    .setTitle("🎡 DEV SPIN")
    .setDescription(
`**Kręć kołem i zdobywaj nagrody!**

• Szansa na Supreme`
    )
    .setThumbnail("https://imgur.com/NJI7052.png");
}

// =======================
// 📅 NEXT EVENTS
// =======================

function nextEmbed() {
  const next = getNextEvents();

  return new EmbedBuilder()
    .setColor("#2ecc71")
    .setTitle("📅 NASTĘPNE EVENTY")
    .setDescription(
      next.map(e =>
`**${e.type.toUpperCase()}**
<t:${unix(e.time)}:R>
<t:${unix(e.time)}:F>`
      ).join("\n\n")
    );
}

// =======================
// 🎮 PICKER
// =======================

function rolePicker() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("roles")
      .setPlaceholder("Wybierz powiadomienia")
      .addOptions([
        { label: "RNG EGG", value: "egg" },
        { label: "MERCHANT", value: "merchant" },
        { label: "DEV SPIN", value: "spin" }
      ])
  );
}

// =======================
// 📦 KOMENDY
// =======================

const commands = [
  new SlashCommandBuilder().setName("event").setDescription("Aktualny event"),
  new SlashCommandBuilder().setName("next-events").setDescription("Następne eventy"),
  new SlashCommandBuilder().setName("test-ping").setDescription("Test eventu"),
  new SlashCommandBuilder().setName("get-role").setDescription("Picker ról"),
  new SlashCommandBuilder().setName("set-dm").setDescription("DM powiadomienia")
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

// =======================
// 🚀 READY
// =======================

client.once("clientReady", async () => {
  console.log("BOT ONLINE");

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("Komendy gotowe");
});

// =======================
// 🎮 INTERAKCJE
// =======================

const dmSettings = new Map();

client.on("interactionCreate", async (i) => {
  if (i.isChatInputCommand()) {

    if (i.commandName === "event") {
      const e = getCurrentEvent();

      if (e === "egg") return i.reply({ embeds: [eggEmbed()] });
      if (e === "spin") return i.reply({ embeds: [spinEmbed()] });

      if (e === "merchant") {
        return i.reply({ embeds: [honeyEmbed(), bossEmbed()] });
      }
    }

    if (i.commandName === "next-events") {
      return i.reply({ embeds: [nextEmbed()] });
    }

    if (i.commandName === "test-ping") {
      const e = getCurrentEvent();
      const ch = await client.channels.fetch(CHANNEL_ID);

      if (e === "egg") {
        await ch.send(`<@&${ROLE_EGG}>`);
        await ch.send({ embeds: [eggEmbed()] });
      }

      if (e === "spin") {
        await ch.send(`<@&${ROLE_SPIN}>`);
        await ch.send({ embeds: [spinEmbed()] });
      }

      if (e === "merchant") {
        await ch.send(`<@&${ROLE_MERCHANT}>`);
        await ch.send({ embeds: [honeyEmbed()] });
        await ch.send({ embeds: [bossEmbed()] });
      }

      return i.reply({ content: "OK", ephemeral: true });
    }

    if (i.commandName === "get-role") {
      return i.reply({
        content: "Wybierz powiadomienia:",
        components: [rolePicker()],
        ephemeral: true
      });
    }

    if (i.commandName === "set-dm") {
      dmSettings.set(i.user.id, true);
      return i.reply({ content: "DM włączone", ephemeral: true });
    }

  }

  if (i.isStringSelectMenu()) {
    const member = i.member;

    if (i.values.includes("egg")) await member.roles.add(ROLE_EGG);
    if (i.values.includes("merchant")) await member.roles.add(ROLE_MERCHANT);
    if (i.values.includes("spin")) await member.roles.add(ROLE_SPIN);

    return i.reply({ content: "Ustawiono role", ephemeral: true });
  }
});

// =======================
// 🔐 LOGIN
// =======================

client.login(TOKEN);
