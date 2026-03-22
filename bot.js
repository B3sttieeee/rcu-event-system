const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const fs = require("fs");
const config = JSON.parse(fs.readFileSync("./data.json", "utf8"));

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================= CONFIG =================

const CHANNEL_ID = "1484937784283369502";

const ROLE_EGG = "1476000993119568105";
const ROLE_MERCHANT = "1476000993660502139";
const ROLE_SPIN = "1484911421903999127";

// ================= TIME =================

// 🔥 KLUCZOWY FIX
function getNextFullHour() {
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(now.getHours() + 1);
  return next;
}

// ================= EVENT SYSTEM =================

function getEventByHour(hour) {
  if ([0,3,6,9,12,15,18,21].includes(hour)) return "egg";
  if ([1,4,7,10,13,16,19,22].includes(hour)) return "merchant";
  if ([2,5,8,11,14,17,20,23].includes(hour)) return "spin";
}

// ================= NEXT EVENTS (100% FIXED) =================

function getNextEvents() {
  let base = getNextFullHour();
  let events = [];

  for (let i = 0; i < 3; i++) {
    let next = new Date(base);
    next.setHours(base.getHours() + i);

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
        .setDescription(
`**➤ Otwieraj jajka i zdobywaj punkty!**

➤ Lepsze pety → więcej punktów  
➤ Więcej punktów → lepszy tier  
➤ Lepszy tier → lepsze nagrody  

✨ **Farm i zgarnij max bonusy!**`
        )
        .setThumbnail("https://imgur.com/JqyeITl.png")
    );
  }

  if (type === "spin") {
    return baseEmbed(
      new EmbedBuilder()
        .setColor("#9b59b6")
        .setTitle("🎡 DEV SPIN EVENT")
        .setDescription(
`**➤ Zakręć kołem i wygraj!**

➤ Losowe nagrody 🎁  
➤ Rzadkie itemy 💎  
➤ 🎯 Supreme (??%)  

⚡ **Powodzenia!**`
        )
        .setThumbnail("https://imgur.com/NJI7052.png")
    );
  }

  if (type === "merchant") {
    return [
      baseEmbed(
        new EmbedBuilder()
          .setColor("#f39c12")
          .setTitle("🍯 HONEY MERCHANT")
          .setDescription(
`**➤ Farm miód 🐝**

➤ Zbieraj → kupuj  
➤ 🎯 Supreme (110%)  

🔥 **Farm = profit**`
          )
          .setThumbnail("https://imgur.com/zhLC0zn.png")
      ),
      baseEmbed(
        new EmbedBuilder()
          .setColor("#e74c3c")
          .setTitle("💀 BOSS MERCHANT")
          .setDescription(
`**➤ Zabij bossy ⚔️**

➤ Tokeny → itemy  
➤ 🎯 Supreme (125%)  

👑 **Top loot!**`
          )
          .setThumbnail("https://imgur.com/yFvb6jY.png")
      )
    ];
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
  const next = getNextFullHour();

  const type = getEventByHour(next.getHours());

  const role =
    type === "egg" ? `<@&${ROLE_EGG}>` :
    type === "merchant" ? `<@&${ROLE_MERCHANT}>` :
    `<@&${ROLE_SPIN}>`;

  await channel.send(
    `⏳ ${role}\n━━━━━━━━━━━━━━━━━━━\n**Event ${type.toUpperCase()} za 5 minut!**`
  );
}

// ================= GUI PANEL =================

async function sendPanel(channel) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("event_now")
      .setLabel("Aktualny Event")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("next_events")
      .setLabel("Następne Eventy")
      .setStyle(ButtonStyle.Success)
  );

  await channel.send({
    content: "🎮 **Panel Eventów**",
    components: [row]
  });
}

// ================= LOOP =================

setInterval(() => {
  const now = new Date();

  if (now.getMinutes() === 0) sendEvent();
  if (now.getMinutes() === 55) sendReminder();

}, 60000);

// ================= INTERACTIONS =================

client.on("interactionCreate", async (i) => {

  if (i.isButton()) {

    if (i.customId === "event_now") {
      const embed = getEmbed(getEventByHour(new Date().getHours()));
      return i.reply({ embeds: Array.isArray(embed) ? embed : [embed], ephemeral: true });
    }

    if (i.customId === "next_events") {
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
  }
});

// ================= READY =================

client.once("clientReady", async () => {
  console.log("✅ BOT ONLINE");

  const channel = await client.channels.fetch(CHANNEL_ID);
  await sendPanel(channel);
});

client.login(process.env.TOKEN);
