const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const fs = require("fs");

// ================= CONFIG LOAD =================
let config = { startDate: "2026-03-22", author: "B3sttiee" };
try {
  config = JSON.parse(fs.readFileSync("./data.json", "utf8"));
} catch {}

// ================= CLIENT =================
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================= SETTINGS =================
const CHANNEL_ID = "1484937784283369502";

const ROLE_EGG = "1476000993119568105";
const ROLE_MERCHANT = "1476000993660502139";
const ROLE_SPIN = "1484911421903999127";

// ================= TIME (NAJWAŻNIEJSZE - BEZ BUGÓW) =================

// 🔥 Jedyna poprawna metoda (Europe/Warsaw bez podwójnego offsetu)
function getNowPL() {
  return new Date(new Date().toLocaleString("en-US", {
    timeZone: "Europe/Warsaw"
  }));
}

// ================= EVENT SYSTEM =================

function getEventByHour(hour) {
  if (hour % 3 === 0) return "egg";
  if (hour % 3 === 1) return "merchant";
  return "spin";
}

// ================= NEXT EVENTS (NAPRAWIONE) =================

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
        .setColor("#ffd93d")
        .setTitle("🥚 RNG EGG EVENT")
        .setDescription(
`**➤ Otwieraj jajka i zdobywaj punkty!**

➤ Lepsze pety → więcej punktów  
➤ Więcej punktów → lepszy tier  
➤ Lepszy tier → lepsze nagrody  

✨ Graj aktywnie!`
        )
        .setThumbnail("https://imgur.com/JqyeITl.png")
    );
  }

  if (type === "merchant") {
    return [
      baseEmbed(
        new EmbedBuilder()
          .setColor("#f39c12")
          .setTitle("🍯 HONEY MERCHANT")
          .setDescription("**➤ Zbieraj miód i kupuj itemy!**")
          .setThumbnail("https://imgur.com/zhLC0zn.png")
      ),
      baseEmbed(
        new EmbedBuilder()
          .setColor("#e74c3c")
          .setTitle("💀 BOSS MERCHANT")
          .setDescription("**➤ Zabij bossy i zdobywaj tokeny!**")
          .setThumbnail("https://imgur.com/yFvb6jY.png")
      )
    ];
  }

  if (type === "spin") {
    return baseEmbed(
      new EmbedBuilder()
        .setColor("#9b59b6")
        .setTitle("🎡 DEV SPIN EVENT")
        .setDescription(
`**➤ Zakręć kołem i wygraj nagrody!**

🎯 Szansa na Supreme`
        )
        .setThumbnail("https://imgur.com/NJI7052.png")
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

  await channel.send(`${role}\n━━━━━━━━━━━━━━━━━━━\n🚀 **EVENT WYSTARTOWAŁ!**`);

  const embed = getEmbed(type);

  if (Array.isArray(embed)) {
    for (const e of embed) await channel.send({ embeds: [e] });
  } else {
    await channel.send({ embeds: [embed] });
  }
}

// ================= REMINDER =================

async function sendReminder() {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const nextEvent = getNextEvents()[0];

  await channel.send(
    `⏳ <@&${nextEvent.type === "egg" ? ROLE_EGG : nextEvent.type === "merchant" ? ROLE_MERCHANT : ROLE_SPIN}>\n━━━━━━━━━━━━━━━━━━━\n**Event ${nextEvent.type.toUpperCase()} za 5 minut!**`
  );
}

// ================= PANEL =================

async function sendPanel(channel) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("now")
      .setLabel("Aktualny Event")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("next")
      .setLabel("Następne Eventy")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("force")
      .setLabel("Wyślij Event")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: "🎮 **PANEL EVENTÓW**",
    components: [row]
  });
}

// ================= LOOP =================

setInterval(() => {
  const now = getNowPL();

  if (now.getMinutes() === 0) sendEvent();
  if (now.getMinutes() === 55) sendReminder();

}, 60000);

// ================= INTERACTIONS =================

client.on("interactionCreate", async (i) => {

  if (!i.isButton()) return;

  // AKTUALNY EVENT
  if (i.customId === "now") {
    return i.reply({
      embeds: [getEmbed(getEventByHour(getNowPL().getHours()))],
      ephemeral: true
    });
  }

  // NEXT EVENTS
  if (i.customId === "next") {
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

  // FORCE EVENT
  if (i.customId === "force") {
    await sendEvent();
    return i.reply({ content: "✅ Event wysłany", ephemeral: true });
  }
});

// ================= READY =================

client.once("clientReady", async () => {
  console.log("✅ BOT ONLINE");

  const channel = await client.channels.fetch(CHANNEL_ID);
  await sendPanel(channel);
});

client.login(process.env.TOKEN);
