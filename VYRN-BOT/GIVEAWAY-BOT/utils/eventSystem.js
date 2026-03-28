const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const fs = require("fs");

// ===== CONFIG =====
const CHANNEL_ID = "1484937784283369502";
const ROLE_ID = "1476000993660502139";

// 🔥 GODZINY MERCHANTA
const MERCHANT_HOURS = [1,4,7,10,13,16,19,22];

// ===== IMAGES =====
const PANEL_IMAGE = "https://imgur.com/AybkuW5.png";
const START_IMAGE = "https://imgur.com/7GBAq8Z.png";

// ===== EVENT =====
const EVENT = {
  name: "HONEY MERCHANT",
  color: "#f59e0b",
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
`🎯 **Next Merchant**
\`${getNextMerchant()}:00\`

⏳ **Countdown**
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
        .setCustomId("role")
        .setLabel("🍯 Merchant Role")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("dm")
        .setLabel("📩 DM Alerts")
        .setStyle(ButtonStyle.Primary)
    )
  ];
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

  let lastPre = null;
  let lastStart = null;

  setInterval(async () => {
    const now = getNow();
    const hour = now.getHours();
    const min = now.getMinutes();

    const nextHour = (hour + 1) % 24;
    const key = `${hour}`;

    // ===== 5 MIN BEFORE (FIXED) =====
    if (
      MERCHANT_HOURS.includes(nextHour) &&
      min === 55 &&
      lastPre !== key
    ) {
      lastPre = key;

      await channel.send({
        content: `<@&${ROLE_ID}> ⏳ Merchant za 5 minut!`
      });

      // DM
      const db = loadDB();
      for (const userId in db.dm) {
        if (db.dm[userId]?.includes("merchant")) {
          const user = await client.users.fetch(userId).catch(()=>null);
          if (user) {
            user.send("⏳ Merchant za 5 minut!").catch(()=>{});
          }
        }
      }
    }

    // ===== START =====
    if (
      MERCHANT_HOURS.includes(hour) &&
      min === 0 &&
      lastStart !== key
    ) {
      lastStart = key;

      await channel.send({
        content: `<@&${ROLE_ID}>`,
        embeds: [
          new EmbedBuilder()
            .setColor(EVENT.color)
            .setTitle("🍯 HONEY MERCHANT START!")
            .setDescription(`💡 ${EVENT.tip}`)
            .setImage(START_IMAGE)
        ]
      });

      // DM
      const db = loadDB();
      for (const userId in db.dm) {
        if (db.dm[userId]?.includes("merchant")) {
          const user = await client.users.fetch(userId).catch(()=>null);
          if (user) {
            user.send("🚀 Merchant wystartował!").catch(()=>{});
          }
        }
      }
    }

    // RESET
    if (min === 10) {
      lastPre = null;
      lastStart = null;
    }

  }, 10000);
}

// ===== INTERACTION =====
async function handleEventInteraction(interaction) {

  // 🔄 REFRESH
  if (interaction.customId === "refresh") {
    return interaction.update({
      embeds: [panelEmbed()],
      components: getButtons()
    });
  }

  // 🍯 ROLE TOGGLE
  if (interaction.customId === "role") {
    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (member.roles.cache.has(ROLE_ID)) {
      await member.roles.remove(ROLE_ID);
      return interaction.reply({
        content: "❌ Usunięto rolę Merchant",
        ephemeral: true
      });
    } else {
      await member.roles.add(ROLE_ID);
      return interaction.reply({
        content: "✅ Dodano rolę Merchant",
        ephemeral: true
      });
    }
  }

  // 📩 DM TOGGLE
  if (interaction.customId === "dm") {
    const db = loadDB();

    if (!db.dm[interaction.user.id]) {
      db.dm[interaction.user.id] = ["merchant"];
      saveDB(db);

      return interaction.reply({
        content: "✅ Włączono DM powiadomienia",
        ephemeral: true
      });
    } else {
      delete db.dm[interaction.user.id];
      saveDB(db);

      return interaction.reply({
        content: "❌ Wyłączono DM powiadomienia",
        ephemeral: true
      });
    }
  }
}

module.exports = {
  startPanel,
  startEventSystem,
  handleEventInteraction
};
