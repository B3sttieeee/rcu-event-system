const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const fs = require("fs");

let config = { startDate: "2026-03-22", author: "B3sttiee" };
try {
  config = JSON.parse(fs.readFileSync("./data.json", "utf8"));
} catch {}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================= CONFIG =================

const CHANNEL_ID = "1484937784283369502";

const ROLE_EGG = "1476000993119568105";
const ROLE_MERCHANT = "1476000993660502139";
const ROLE_SPIN = "1484911421903999127";

// ================= TIME =================

function getNowPL() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" })
  );
}

// ================= EVENT SYSTEM =================

function getEventByHour(hour) {
  if (hour % 3 === 0) return "egg";
  if (hour % 3 === 1) return "merchant";
  return "spin";
}

// ================= NEXT EVENTS (FIXED) =================

function getNextEvents() {
  const now = getNowPL();
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

// ================= EMBED =================

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
        .setColor("#ffd93d")
        .setTitle("🥚 RNG EGG EVENT")
        .setDescription("**Otwieraj jajka i zdobywaj punkty!**")
    );
  }

  if (type === "merchant") {
    return baseEmbed(
      new EmbedBuilder()
        .setColor("#f39c12")
        .setTitle("🛒 MERCHANT EVENT")
        .setDescription("**Kupuj przedmioty i farm!**")
    );
  }

  if (type === "spin") {
    return baseEmbed(
      new EmbedBuilder()
        .setColor("#9b59b6")
        .setTitle("🎡 DEV SPIN EVENT")
        .setDescription("**Zakręć kołem i wygraj!**")
    );
  }
}

// ================= SEND EVENT =================

async function sendEvent() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const now = getNowPL();

  const type = getEventByHour(now.getHours());

  const role =
    type === "egg" ? `<@&${ROLE_EGG}>` :
    type === "merchant" ? `<@&${ROLE_MERCHANT}>` :
    `<@&${ROLE_SPIN}>`;

  await channel.send(`${role}\n🚀 EVENT WYSTARTOWAŁ`);
  await channel.send({ embeds: [getEmbed(type)] });
}

// ================= REMINDER =================

async function sendReminder() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const next = getNextEvents()[0];

  await channel.send(
    `⏳ Event ${next.type.toUpperCase()} za 5 minut!`
  );
}

// ================= HELP PANEL =================

async function sendHelpPanel(channel) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("event_now")
      .setLabel("Aktualny Event")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("event_next")
      .setLabel("Następne Eventy")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("event_ping")
      .setLabel("Wyślij Event")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: "🎮 **PANEL EVENTÓW (HELP)**",
    components: [row]
  });
}

// ================= LOOP =================

setInterval(() => {
  const now = getNowPL();

  if (now.getMinutes() === 0) sendEvent();
  if (now.getMinutes() === 55) sendReminder();

}, 60000);

// ================= INTERACTION =================

client.on("interactionCreate", async (i) => {

  if (!i.isButton()) return;

  // AKTUALNY EVENT
  if (i.customId === "event_now") {
    return i.reply({
      embeds: [getEmbed(getEventByHour(getNowPL().getHours()))],
      ephemeral: true
    });
  }

  // NEXT EVENTS
  if (i.customId === "event_next") {
    const events = getNextEvents();

    const embed = baseEmbed(
      new EmbedBuilder()
        .setColor("#2ecc71")
        .setTitle("📅 NASTĘPNE EVENTY")
    );

    events.forEach(e => {
      embed.addFields({
        name: `➤ ${e.type.toUpperCase()}`,
        value: `<t:${e.timestamp}:R>\n<t:${e.timestamp}:F>`
      });
    });

    return i.reply({ embeds: [embed], ephemeral: true });
  }

  // TEST EVENT
  if (i.customId === "event_ping") {
    await sendEvent();
    return i.reply({ content: "✅ Wysłano event", ephemeral: true });
  }
});

// ================= READY =================

client.once("clientReady", async () => {
  console.log("✅ BOT ONLINE");

  const channel = await client.channels.fetch(CHANNEL_ID);
  await sendHelpPanel(channel);
});

client.login(process.env.TOKEN);
