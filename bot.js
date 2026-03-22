const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  REST,
  Routes
} = require("discord.js");

const TOKEN = "TWÓJ_TOKEN";
const CLIENT_ID = "TWÓJ_CLIENT_ID";
const GUILD_ID = "TWÓJ_GUILD_ID";

const CHANNEL_ID = "1484937784283369502";

// ROLE
const ROLE_EGG = "1476000993119568105";
const ROLE_MERCHANT = "1476000993660502139";
const ROLE_SPIN = "1484911421903999127";

// IMG
const IMAGES = {
  egg: "https://imgur.com/pY2xNUL.png",
  honey: "https://imgur.com/SsvlJ5a.png",
  boss: "https://imgur.com/VU9KdMS.png",
  spin: "https://imgur.com/LeXDgiJ.png"
};

// USER DM SETTINGS
const userDM = new Map();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// GODZINY
function getEventType(hour) {
  if ([0,3,6,9,12,15,18,21].includes(hour)) return "egg";
  if ([1,4,7,10,13,16,19,22].includes(hour)) return "merchant";
  if ([2,5,8,11,14,17,20,23].includes(hour)) return "spin";
}

function getNextEvents() {
  const now = new Date();
  const events = [];

  for (let i = 0; i < 24; i++) {
    const d = new Date(now);
    d.setHours(now.getHours() + i);
    d.setMinutes(0, 0, 0);

    const type = getEventType(d.getHours());
    if (d > now) events.push({ type, date: d });
    if (events.length === 2) break;
  }

  return events;
}

// EMBEDY
function embedEgg() {
  return new EmbedBuilder()
    .setColor("#f1c40f")
    .setTitle("🥚 **RNG EGG**")
    .setDescription(
`**Otwieraj jajka i zdobywaj punkty Tieru!**

• Lepsze pety = więcej punktów  
• Lepszy Tier = lepsze bonusy`
    )
    .setThumbnail(IMAGES.egg);
}

function embedHoney() {
  return new EmbedBuilder()
    .setColor("#f39c12")
    .setTitle("🍯 **HONEY MERCHANT**")
    .setDescription(
`**Eventowy merchant — sprawdź ofertę!**

• Za miód kupisz przedmioty  
• Szansa Supreme: **110%**

⏳ Znika po 15 minutach`
    )
    .setThumbnail(IMAGES.honey);
}

function embedBoss() {
  return new EmbedBuilder()
    .setColor("#e74c3c")
    .setTitle("🔴 **BOSS MERCHANT**")
    .setDescription(
`**Eventowy merchant — Anniversary Event!**

• Za żetony kupisz przedmioty  
• Szansa Supreme: **125%**

⏳ Znika po 15 minutach`
    )
    .setThumbnail(IMAGES.boss);
}

function embedSpin() {
  return new EmbedBuilder()
    .setColor("#9b59b6")
    .setTitle("🎡 **DEV SPIN**")
    .setDescription(
`**Kręć kołem i zdobywaj nagrody!**

• Szansa Supreme: **??%**`
    )
    .setThumbnail(IMAGES.spin);
}

// EVENT SEND
async function sendEvent(type) {
  const channel = await client.channels.fetch(CHANNEL_ID);

  if (type === "egg") {
    await channel.send({ content: `<@&${ROLE_EGG}>`, embeds: [embedEgg()] });
  }

  if (type === "merchant") {
    await channel.send({ content: `<@&${ROLE_MERCHANT}>` });
    await channel.send({ embeds: [embedHoney()] });
    await channel.send({ embeds: [embedBoss()] });
  }

  if (type === "spin") {
    await channel.send({ content: `<@&${ROLE_SPIN}>`, embeds: [embedSpin()] });
  }
}

// SCHEDULER
setInterval(() => {
  const now = new Date();

  if (now.getMinutes() === 0 && now.getSeconds() === 0) {
    const type = getEventType(now.getHours());
    sendEvent(type);
  }
}, 1000);

// READY
client.once("ready", async () => {
  console.log("✅ BOT ONLINE");

  const commands = [
    {
      name: "event",
      description: "Aktualny event"
    },
    {
      name: "next-events",
      description: "Następne eventy"
    },
    {
      name: "test-ping",
      description: "Test eventu"
    },
    {
      name: "get-role",
      description: "Wybierz role eventów"
    },
    {
      name: "set-dm",
      description: "Powiadomienia na DM"
    }
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Komendy załadowane");
});

// INTERACTIONS
client.on("interactionCreate", async (i) => {

  if (i.isChatInputCommand()) {

    // EVENT
    if (i.commandName === "event") {
      const type = getEventType(new Date().getHours());

      if (type === "egg") return i.reply({ embeds: [embedEgg()] });
      if (type === "merchant") return i.reply({ embeds: [embedHoney(), embedBoss()] });
      if (type === "spin") return i.reply({ embeds: [embedSpin()] });
    }

    // NEXT EVENTS
    if (i.commandName === "next-events") {
      const events = getNextEvents();

      const embed = new EmbedBuilder()
        .setColor("#2ecc71")
        .setTitle("📅 **NASTĘPNE EVENTY**")
        .setDescription(events.map(e =>
`**${e.type.toUpperCase()}**
<t:${Math.floor(e.date.getTime()/1000)}:R>
<t:${Math.floor(e.date.getTime()/1000)}:F>`
        ).join("\n\n"));

      return i.reply({ embeds: [embed] });
    }

    // TEST
    if (i.commandName === "test-ping") {
      const type = getEventType(new Date().getHours());
      await sendEvent(type);
      return i.reply({ content: "✅ Wysłano test", ephemeral: true });
    }

    // ROLE PICKER
    if (i.commandName === "get-role") {
      const menu = new StringSelectMenuBuilder()
        .setCustomId("roles")
        .setPlaceholder("Wybierz eventy")
        .setMinValues(1)
        .setMaxValues(3)
        .addOptions([
          { label: "RNG EGG", value: ROLE_EGG },
          { label: "MERCHANT", value: ROLE_MERCHANT },
          { label: "DEV SPIN", value: ROLE_SPIN }
        ]);

      const row = new ActionRowBuilder().addComponents(menu);

      return i.reply({
        content: "🎭 **Wybierz role eventów:**",
        components: [row],
        ephemeral: true
      });
    }

    // DM SETTINGS
    if (i.commandName === "set-dm") {
      const menu = new StringSelectMenuBuilder()
        .setCustomId("dm")
        .setPlaceholder("Powiadomienia DM")
        .addOptions([
          { label: "RNG EGG", value: "egg" },
          { label: "MERCHANT", value: "merchant" },
          { label: "DEV SPIN", value: "spin" }
        ]);

      const row = new ActionRowBuilder().addComponents(menu);

      return i.reply({
        content: "📩 **Wybierz powiadomienia na DM:**",
        components: [row],
        ephemeral: true
      });
    }

  }

  // ROLE SELECT
  if (i.isStringSelectMenu()) {

    if (i.customId === "roles") {
      for (const role of [ROLE_EGG, ROLE_MERCHANT, ROLE_SPIN]) {
        await i.member.roles.remove(role).catch(() => {});
      }

      for (const role of i.values) {
        await i.member.roles.add(role).catch(() => {});
      }

      return i.reply({ content: "✅ Role ustawione", ephemeral: true });
    }

    if (i.customId === "dm") {
      userDM.set(i.user.id, i.values);
      return i.reply({ content: "✅ Ustawiono DM", ephemeral: true });
    }
  }

});

client.login(TOKEN);
