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

// ================= ENV =================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.log("❌ Brak TOKEN / CLIENT_ID / GUILD_ID w ENV!");
  process.exit(1);
}

// ================= CLIENT =================
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================= CONFIG =================
const CHANNEL_ID = "1484937784283369502";

const ROLE_EGG = "1476000993119568105";
const ROLE_MERCHANT = "1476000993660502139";
const ROLE_SPIN = "1484911421903999127";

// ================= EVENT =================

function getEventByHour(hour) {
  if (hour % 3 === 0) return "egg";
  if (hour % 3 === 1) return "merchant";
  return "spin";
}

// ================= NEXT EVENTS =================

function getNextEvents() {
  const now = new Date();
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
      text: `Start: 2026-03-22 • Twórca: B3sttiee`
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

➤ Im lepsze pety → więcej punktów  
➤ Dużo punktów → wyższy tier  
➤ Wyższy tier → lepsze bonusy  

✨ Graj aktywnie i zdobywaj przewagę!`
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
➤ Rotacyjne przedmioty  

🔥 Nie przegap najlepszych ofert!`
        )
    );
  }

  if (type === "spin") {
    return baseEmbed(
      new EmbedBuilder()
        .setColor("#9b59b6")
        .setTitle("🎡 DEV SPIN EVENT")
        .setDescription(
`**➤ Zakręć kołem i wygraj!**

➤ Losowe nagrody  
➤ Szansa na rzadkie itemy  
➤ Możliwy Supreme  

🎯 Spróbuj swojego szczęścia!`
        )
    );
  }
}

// ================= SEND EVENT =================

async function sendEvent() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const now = new Date();

  const type = getEventByHour(now.getHours());

  const role =
    type === "egg" ? `<@&${ROLE_EGG}>` :
    type === "merchant" ? `<@&${ROLE_MERCHANT}>` :
    `<@&${ROLE_SPIN}>`;

  await channel.send(`${role}\n🚀 EVENT WYSTARTOWAŁ`);
  await channel.send({ embeds: [getEmbed(type)] });
}

// ================= COMMANDS =================

const commands = [
  new SlashCommandBuilder().setName("panel").setDescription("Panel eventów"),
  new SlashCommandBuilder().setName("event").setDescription("Aktualny event"),
  new SlashCommandBuilder().setName("next-events").setDescription("Następne eventy")
];

// ================= REGISTER =================

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Komendy zarejestrowane");
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

// ================= LOOP =================

setInterval(() => {
  const now = new Date();

  if (now.getMinutes() === 0) sendEvent();
}, 60000);

// ================= INTERACTIONS =================

client.on("interactionCreate", async (i) => {

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
        embeds: [getEmbed(getEventByHour(new Date().getHours()))]
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

  if (i.isButton()) {

    if (i.customId === "now") {
      return i.reply({
        embeds: [getEmbed(getEventByHour(new Date().getHours()))],
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

  await registerCommands();

  console.log("🔥 GOTOWY");
});

client.login(TOKEN);
