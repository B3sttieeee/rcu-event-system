const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const fs = require("fs");

// ================= CONFIG =================

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "TWÓJ_CLIENT_ID"; // 🔥 WPISZ
const GUILD_ID = "TWÓJ_GUILD_ID";   // 🔥 WPISZ

const CHANNEL_ID = "1484937784283369502";

const ROLE_EGG = "1476000993119568105";
const ROLE_MERCHANT = "1476000993660502139";
const ROLE_SPIN = "1484911421903999127";

const config = JSON.parse(fs.readFileSync("./data.json", "utf8"));

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================= TIME =================

function getNow() {
  return new Date(); // 🔥 ZERO OFFSET
}

// ================= EVENT =================

function getEventByHour(hour) {
  if (hour % 3 === 0) return "egg";
  if (hour % 3 === 1) return "merchant";
  return "spin";
}

// ================= NEXT EVENTS =================

function getNextEvents() {
  const now = getNow();
  const events = [];

  for (let i = 1; i <= 3; i++) {
    const next = new Date(now);
    next.setMinutes(0, 0, 0);
    next.setHours(now.getHours() + i);

    events.push({
      type: getEventByHour(next.getHours()),
      timestamp: Math.floor(next.getTime() / 1000)
    });
  }

  return events;
}

// ================= EMBEDS =================

function baseEmbed(embed) {
  return embed
    .setFooter({
      text: `Start: ${config.startDate} • Twórca: ${config.author}`
    })
    .setTimestamp();
}

function getEmbed(type) {

  if (type === "egg") {
    return baseEmbed(
      new EmbedBuilder()
        .setColor("#f1c40f")
        .setTitle("🥚 RNG EGG EVENT")
        .setDescription(
`**➤ Otwieraj jajka i zdobywaj punkty!**

➤ Lepsze pety → więcej punktów  
➤ Więcej punktów → wyższy tier  
➤ Lepszy tier → lepsze nagrody  

✨ Farm i zgarnij bonusy!`
        )
    );
  }

  if (type === "merchant") {
    return baseEmbed(
      new EmbedBuilder()
        .setColor("#f39c12")
        .setTitle("🛒 MERCHANT EVENT")
        .setDescription(
`**➤ Kupuj i zdobywaj itemy!**

➤ Honey + Boss Merchant  
➤ Szansa na Supreme  
➤ Najlepsze itemy w rotacji  

🔥 Sprawdzaj co godzinę!`
        )
    );
  }

  if (type === "spin") {
    return baseEmbed(
      new EmbedBuilder()
        .setColor("#9b59b6")
        .setTitle("🎡 DEV SPIN EVENT")
        .setDescription(
`**➤ Zakręć kołem!**

➤ Losowe nagrody  
➤ Szansa na rzadkie itemy  
➤ Supreme drop  

🎯 Spróbuj szczęścia!`
        )
    );
  }
}

// ================= EVENT SEND =================

async function sendEvent() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const now = getNow();

  const type = getEventByHour(now.getHours());

  const role =
    type === "egg" ? `<@&${ROLE_EGG}>` :
    type === "merchant" ? `<@&${ROLE_MERCHANT}>` :
    `<@&${ROLE_SPIN}>`;

  await channel.send(`${role}\n🚀 EVENT WYSTARTOWAŁ`);
  await channel.send({ embeds: [getEmbed(type)] });
}

// ================= PANEL =================

function getPanel() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("now")
      .setLabel("Aktualny Event")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("next")
      .setLabel("Następne Eventy")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("send")
      .setLabel("Wyślij Event")
      .setStyle(ButtonStyle.Danger)
  );
}

// ================= COMMAND REGISTER =================

const commands = [
  new SlashCommandBuilder().setName("panel").setDescription("Panel eventów"),
  new SlashCommandBuilder().setName("event").setDescription("Aktualny event"),
  new SlashCommandBuilder().setName("next-events").setDescription("Następne eventy")
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

async function registerCommands() {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log("✅ Komendy zarejestrowane");
}

// ================= LOOP =================

setInterval(() => {
  const now = getNow();

  if (now.getMinutes() === 0) sendEvent();
}, 60000);

// ================= INTERACTIONS =================

client.on("interactionCreate", async (i) => {

  // ===== SLASH =====

  if (i.isChatInputCommand()) {

    if (i.commandName === "panel") {
      return i.reply({
        content: "🎮 PANEL EVENTÓW",
        components: [getPanel()],
        ephemeral: true
      });
    }

    if (i.commandName === "event") {
      return i.reply({
        embeds: [getEmbed(getEventByHour(getNow().getHours()))]
      });
    }

    if (i.commandName === "next-events") {
      const events = getNextEvents();

      const embed = baseEmbed(
        new EmbedBuilder()
          .setTitle("📅 NASTĘPNE EVENTY")
          .setColor("#2ecc71")
      );

      events.forEach(e => {
        embed.addFields({
          name: e.type.toUpperCase(),
          value: `<t:${e.timestamp}:R>\n<t:${e.timestamp}:F>`
        });
      });

      return i.reply({ embeds: [embed] });
    }
  }

  // ===== BUTTONS =====

  if (i.isButton()) {

    if (i.customId === "now") {
      return i.reply({
        embeds: [getEmbed(getEventByHour(getNow().getHours()))],
        ephemeral: true
      });
    }

    if (i.customId === "next") {
      const events = getNextEvents();

      const embed = baseEmbed(
        new EmbedBuilder()
          .setTitle("📅 NASTĘPNE EVENTY")
          .setColor("#2ecc71")
      );

      events.forEach(e => {
        embed.addFields({
          name: e.type.toUpperCase(),
          value: `<t:${e.timestamp}:R>\n<t:${e.timestamp}:F>`
        });
      });

      return i.reply({ embeds: [embed], ephemeral: true });
    }

    if (i.customId === "send") {
      await sendEvent();
      return i.reply({ content: "✅ Event wysłany", ephemeral: true });
    }
  }
});

// ================= READY =================

client.once("clientReady", async () => {
  console.log("✅ BOT ONLINE");
  await registerCommands(); // 🔥 TO CI BRAKOWAŁO
});

client.login(TOKEN);
