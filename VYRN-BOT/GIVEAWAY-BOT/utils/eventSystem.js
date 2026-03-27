const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const fs = require("fs");

// ===== CONFIG =====
const CHANNEL_ID = "1484937784283369502";
const ROLE_ID = "1476000993660502139";

// 🔥 GODZINY MERCHANTA
const MERCHANT_HOURS = [1,4,7,10,13,16,19,22];

// ===== IMAGE =====
const PANEL_IMAGE = "https://imgur.com/AybkuW5.png";

const EVENT = {
  name: "HONEY MERCHANT",
  color: "#ef4444",
  image: "https://imgur.com/GQIFzx7.png",
  tip: "Przygotuj walutę!"
};

// ===== DB =====
const DB_PATH = "./eventDB.json";

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ dm: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== TIME =====
function getNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" })
  );
}

function getNextMerchant() {
  const now = getNow();
  const hour = now.getHours();

  const next = MERCHANT_HOURS.find(h => h > hour);
  return next !== undefined ? next : MERCHANT_HOURS[0];
}

function getCountdown() {
  const now = getNow();

  let nextHour = getNextMerchant();
  let target = new Date(now);
  target.setHours(nextHour, 0, 0, 0);

  if (nextHour <= now.getHours()) {
    target.setDate(target.getDate() + 1);
  }

  const diff = target - now;

  const total = Math.floor(diff / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return `${h}h ${m}m ${s}s`;
}

// ===== PANEL =====
function panelEmbed() {
  return new EmbedBuilder()
    .setColor(EVENT.color)
    .setTitle("🍯 MERCHANT TRACKER")
    .setDescription(
`⏳ **Next Merchant**
\`${getNextMerchant()}:00\`

🕐 Countdown:
\`${getCountdown()}\``
    )
    .setImage(PANEL_IMAGE);
}

// ===== BUTTONS =====
function getButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("refresh")
        .setLabel("🔄 Refresh")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("dm")
        .setLabel("📩 Notifications")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

// ===== DM MENU =====
function dmMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("dm_menu")
      .setPlaceholder("DM notifications")
      .addOptions([
        { label: "Merchant Alerts", value: "merchant" }
      ])
  );
}

// ===== PANEL START =====
async function startPanel(client) {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const panel = await channel.send({
    embeds: [panelEmbed()],
    components: getButtons()
  });

  setInterval(() => {
    panel.edit({
      embeds: [panelEmbed()],
      components: getButtons()
    }).catch(()=>{});
  }, 10000);
}

// ===== EVENT SYSTEM =====
async function startEventSystem(client) {
  const channel = await client.channels.fetch(CHANNEL_ID);

  let lastPrePing = null;
  let lastStartPing = null;

  setInterval(async () => {
    const now = getNow();
    const hour = now.getHours();
    const minute = now.getMinutes();

    const key = `${hour}`;

    // ===== 5 MIN BEFORE =====
    if (
      MERCHANT_HOURS.includes(hour) &&
      minute === 55 &&
      lastPrePing !== key
    ) {
      lastPrePing = key;

      await channel.send({
        content: `<@&${ROLE_ID}> ⏳ MERCHANT ZA 5 MIN!`
      });

      // 🔥 DM SEND
      const db = loadDB();

      for (const userId in db.dm) {
        if (db.dm[userId].includes("merchant")) {
          const user = await client.users.fetch(userId).catch(()=>null);
          if (!user) continue;

          user.send("⏳ Merchant za 5 minut!").catch(()=>{});
        }
      }
    }

    // ===== START =====
    if (
      MERCHANT_HOURS.includes(hour) &&
      minute === 0 &&
      lastStartPing !== key
    ) {
      lastStartPing = key;

      await channel.send({
        content: `<@&${ROLE_ID}>`,
        embeds: [
          new EmbedBuilder()
            .setColor(EVENT.color)
            .setTitle(`🚀 ${EVENT.name} START!`)
            .setDescription(`💡 ${EVENT.tip}`)
            .setImage(EVENT.image)
        ]
      });

      // 🔥 DM SEND
      const db = loadDB();

      for (const userId in db.dm) {
        if (db.dm[userId].includes("merchant")) {
          const user = await client.users.fetch(userId).catch(()=>null);
          if (!user) continue;

          user.send("🚀 Merchant wystartował!").catch(()=>{});
        }
      }
    }

    // RESET
    if (minute === 10) {
      lastPrePing = null;
      lastStartPing = null;
    }

  }, 10000);
}

// ===== INTERACTION =====
async function handleEventInteraction(interaction) {

  if (interaction.customId === "refresh") {
    return interaction.update({
      embeds: [panelEmbed()],
      components: getButtons()
    });
  }

  if (interaction.customId === "dm") {
    return interaction.reply({
      content: "📩 Select DM notifications:",
      components: [dmMenu()],
      ephemeral: true
    });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "dm_menu") {
    const db = loadDB();

    db.dm[interaction.user.id] = interaction.values;

    saveDB(db);

    return interaction.reply({
      content: "✅ Ustawiono DM!",
      ephemeral: true
    });
  }
}

module.exports = {
  startPanel,
  startEventSystem,
  handleEventInteraction
};
