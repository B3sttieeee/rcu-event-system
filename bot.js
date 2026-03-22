const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  REST,
  Routes
} = require("discord.js");

// ✅ ENV (RAILWAY)
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const CHANNEL_ID = "1484937784283369502";

// DEBUG (ZOSTAW NA CHWILĘ)
console.log("TOKEN:", TOKEN ? "OK" : "BRAK");
console.log("CLIENT_ID:", CLIENT_ID);
console.log("GUILD_ID:", GUILD_ID);

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// GODZINY (POPRAWNE)
function getEventType(h) {
  if ([0,3,6,9,12,15,18,21].includes(h)) return "egg";
  if ([1,4,7,10,13,16,19,22].includes(h)) return "merchant";
  if ([2,5,8,11,14,17,20,23].includes(h)) return "spin";
}

function getNextEvents() {
  const now = new Date();
  const events = [];

  for (let i = 1; i <= 24; i++) {
    const d = new Date(now);
    d.setHours(now.getHours() + i);
    d.setMinutes(0, 0, 0);

    events.push({
      type: getEventType(d.getHours()),
      date: d
    });

    if (events.length === 2) break;
  }

  return events;
}

// EMBEDY
const egg = () => new EmbedBuilder()
  .setColor("#f1c40f")
  .setTitle("🥚 **RNG EGG**")
  .setDescription("**Otwieraj jajka i zdobywaj punkty Tieru!**")
  .setThumbnail("https://imgur.com/pY2xNUL.png");

const honey = () => new EmbedBuilder()
  .setColor("#f39c12")
  .setTitle("🍯 **HONEY MERCHANT**")
  .setDescription("Eventowy merchant — sprawdź ofertę!")
  .setThumbnail("https://imgur.com/SsvlJ5a.png");

const boss = () => new EmbedBuilder()
  .setColor("#e74c3c")
  .setTitle("🔴 **BOSS MERCHANT**")
  .setDescription("Eventowy merchant — Anniversary Event!")
  .setThumbnail("https://imgur.com/VU9KdMS.png");

const spin = () => new EmbedBuilder()
  .setColor("#9b59b6")
  .setTitle("🎡 **DEV SPIN**")
  .setDescription("Kręć kołem i zdobywaj nagrody!")
  .setThumbnail("https://imgur.com/LeXDgiJ.png");

// READY
client.once("ready", async () => {
  console.log("✅ BOT ONLINE");

  const commands = [
    { name: "event", description: "Aktualny event" },
    { name: "next-events", description: "Następne eventy" },
    { name: "test-ping", description: "Test eventu" }
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Komendy załadowane");
});

// KOMENDY
client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;

  const now = new Date();
  const type = getEventType(now.getHours());

  if (i.commandName === "event") {
    if (type === "egg") return i.reply({ embeds: [egg()] });
    if (type === "merchant") return i.reply({ embeds: [honey(), boss()] });
    if (type === "spin") return i.reply({ embeds: [spin()] });
  }

  if (i.commandName === "next-events") {
    const ev = getNextEvents();

    return i.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#2ecc71")
          .setTitle("📅 **NASTĘPNE EVENTY**")
          .setDescription(
            ev.map(e =>
              `**${e.type.toUpperCase()}**\n<t:${Math.floor(e.date.getTime()/1000)}:R>`
            ).join("\n\n")
          )
      ]
    });
  }

  if (i.commandName === "test-ping") {
    return i.reply({ content: "✅ działa", ephemeral: true });
  }
});

// LOGIN (WAŻNE)
client.login(TOKEN)
  .then(() => console.log("✅ LOGIN OK"))
  .catch(err => console.error("❌ LOGIN ERROR:", err));
