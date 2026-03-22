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

// ================= TIME (FINAL FIX) =================

function getNow() {
  return new Date(); // 🔥 żadnych offsetów
}

// ================= EVENT SYSTEM =================

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

➤ Im lepsze pety → więcej punktów  
➤ Dużo punktów → wyższy tier  
➤ Wyższy tier → lepsze nagrody końcowe  

✨ Graj aktywnie i zgarnij najlepsze bonusy!`
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
          .setDescription(
`**➤ Zdobywaj miód na Bee World!**

➤ Zbieraj miód z pszczół 🐝  
➤ Wymieniaj na przedmioty  
➤ 🎯 Szansa na Supreme (110%)  

🔥 Im więcej farmisz, tym lepsze nagrody!`
          )
          .setThumbnail("https://imgur.com/zhLC0zn.png")
      ),

      baseEmbed(
        new EmbedBuilder()
          .setColor("#e74c3c")
          .setTitle("💀 BOSS MERCHANT")
          .setDescription(
`**➤ Pokonuj bossy i zdobywaj tokeny!**

➤ Tokeny z bossów ⚔️  
➤ Wymiana na itemy  
➤ 🎯 Szansa na Supreme (125%)  

👑 Najlepsze nagrody dla najlepszych graczy!`
          )
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
`**➤ Zakręć kołem i zdobądź nagrody!**

➤ Losowe nagrody 🎁  
➤ Szansa na rzadkie itemy 💎  
➤ 🎯 Mała szansa na Supreme  

⚡ Spróbuj swojego szczęścia!`
        )
        .setThumbnail("https://imgur.com/NJI7052.png")
    );
  }
}

// ================= SEND EVENT =================

async function sendEvent() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const now = getNow();

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
  const next = getNextEvents()[0];

  await channel.send(
    `⏳ <@&${next.type === "egg" ? ROLE_EGG : next.type === "merchant" ? ROLE_MERCHANT : ROLE_SPIN}>\n━━━━━━━━━━━━━━━━━━━\n**Event ${next.type.toUpperCase()} za 5 minut!**`
  );
}

// ================= PANEL COMMAND =================

async function sendPanel(interaction) {
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

  await interaction.reply({
    content: "🎮 **PANEL EVENTÓW**",
    components: [row],
    ephemeral: true
  });
}

// ================= LOOP =================

setInterval(() => {
  const now = getNow();

  if (now.getMinutes() === 0) sendEvent();
  if (now.getMinutes() === 55) sendReminder();

}, 60000);

// ================= INTERACTIONS =================

client.on("interactionCreate", async (i) => {

  // SLASH COMMAND PANEL
  if (i.isChatInputCommand()) {
    if (i.commandName === "panel") {
      return sendPanel(i);
    }
  }

  if (!i.isButton()) return;

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

  if (i.customId === "force") {
    await sendEvent();
    return i.reply({ content: "✅ Event wysłany", ephemeral: true });
  }
});

// ================= READY =================

client.once("clientReady", () => {
  console.log("✅ BOT ONLINE");
});

client.login(process.env.TOKEN);
