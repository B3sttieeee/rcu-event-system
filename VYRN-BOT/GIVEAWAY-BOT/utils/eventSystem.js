const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// ====================== CONFIG ======================
const CONFIG = {
  CHANNEL_ID: "1484937784283369502",

  ROLES: {
    MERCHANT: "1476000993660502139",
    EGG: "1489930030166573150",
    SPRING: "1476000993119568105",
  },

  IMAGES: {
    PANEL: "https://imgur.com/AybkuW5.png",
    MERCHANT: "https://imgur.com/7GBAq8Z.png",
    EGG: "https://imgur.com/xppQUWX.png",
    SPRING: "https://imgur.com/89tmfpV.png",
  },

  EVENTS: {
    merchant: { hours: [2, 5, 8, 11, 14, 17, 20, 23], role: "MERCHANT" },
    spring: { hours: Array.from({ length: 24 }, (_, i) => i), role: "SPRING" },
    egg: { hours: [0, 3, 6, 9, 12, 15, 18, 21], role: "EGG" },
  },

  REFRESH_INTERVAL: 10_000,
  DELETE_AFTER: 15 * 60 * 1000,
};

// ====================== DB ======================
const DB_PATH = path.join(__dirname, "..", "eventDB.json");

const loadDB = () => {
  if (!fs.existsSync(DB_PATH)) return { dm: {} };
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch {
    return { dm: {} };
  }
};

const saveDB = (db) => fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

// ====================== TIME (UNCHANGED LOGIC) ======================
const getNow = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));

const getNextHour = (hours) => {
  const now = getNow().getHours();
  return hours.find((h) => h > now) ?? hours[0];
};

// ====================== CACHE ======================
const processed = new Map();

// ====================== 🔥 ONLY UI FIX: EMBEDS ======================

// PANEL (ładniejszy, ale ta sama funkcja)
const panelEmbed = () =>
  new EmbedBuilder()
    .setColor("#f59e0b")
    .setTitle("🎉 EVENT TRACKER")
    .setDescription(
      Object.entries(CONFIG.EVENTS)
        .map(([name, e]) => {
          const hours = e.hours;
          return `**${name.toUpperCase()}**\nNext: \`${getNextHour(hours)}:00\``;
        })
        .join("\n\n")
    )
    .setImage(CONFIG.IMAGES.PANEL)
    .setFooter({ text: "Event System • Live Tracker" })
    .setTimestamp();

// START EVENT EMBED (ONLY VISUAL UPGRADE)
const eventEmbed = (name, image) =>
  new EmbedBuilder()
    .setColor("#f59e0b")
    .setTitle(`🚀 ${name.toUpperCase()} STARTED`)
    .setDescription(
      [
        "```",
        "Event is now active!",
        "Join and participate now.",
        "```"
      ].join("\n")
    )
    .setImage(image || null)
    .setFooter({ text: "Event System" })
    .setTimestamp();

// ====================== COMPONENTS (UNCHANGED) ======================
const buttons = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("refresh").setLabel("🔄").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("roles").setLabel("🎭").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("dm").setLabel("📩").setStyle(ButtonStyle.Primary)
  );

// ====================== CORE ENGINE (UNCHANGED LOGIC) ======================
function registerEvent(client, key, event, hour, roleId, image) {
  const now = getNow();
  const h = now.getHours();
  const m = now.getMinutes();

  const baseKey = `${key}-${hour}`;
  const preKey = baseKey + "-pre";
  const startKey = baseKey + "-start";

  const channelFetch = () =>
    client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);

  // PRE (55 min) — unchanged
  if (h === (hour - 1 + 24) % 24 && m === 55 && !processed.has(preKey)) {
    channelFetch().then((ch) => {
      if (!ch) return;
      ch.send(`<@&${roleId}> ⏳ ${key} starts in 5 minutes`)
        .then((msg) => processed.set(preKey, msg.id));
    });
  }

  // START (00 min) — ONLY EMBED CHANGED
  if (h === hour && m === 0 && !processed.has(startKey)) {
    channelFetch().then(async (ch) => {
      if (!ch) return;

      const preId = processed.get(preKey);
      if (preId) {
        const msg = await ch.messages.fetch(preId).catch(() => null);
        if (msg) msg.delete().catch(() => {});
        processed.delete(preKey);
      }

      const msg = await ch.send({
        content: `<@&${roleId}>`,
        embeds: [eventEmbed(key, image)]
      });

      setTimeout(() => msg.delete().catch(() => {}), CONFIG.DELETE_AFTER);

      processed.set(startKey, true);
    });
  }
}

// ====================== ENGINE ======================
function startEventSystem(client) {
  console.log("🚀 Event system running (UI ONLY FIX)");

  setInterval(() => {
    for (const [name, data] of Object.entries(CONFIG.EVENTS)) {
      for (const hour of data.hours) {
        registerEvent(
          client,
          name,
          data,
          hour,
          CONFIG.ROLES[data.role],
          CONFIG.IMAGES[name.toUpperCase()] || null
        );
      }
    }

    if (getNow().getMinutes() === 5) processed.clear();

  }, CONFIG.REFRESH_INTERVAL);
}

// ====================== PANEL ======================
async function startPanel(client) {
  const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
  if (!channel) return;

  let msg = await channel.send({
    embeds: [panelEmbed()],
    components: [buttons()]
  });

  setInterval(() => {
    msg.edit({
      embeds: [panelEmbed()],
      components: [buttons()]
    }).catch(() => {});
  }, CONFIG.REFRESH_INTERVAL);
}

// ====================== INTERACTIONS (UNCHANGED) ======================
async function handleEventInteraction(interaction) {
  const id = interaction.customId;

  if (id === "refresh")
    return interaction.update({
      embeds: [panelEmbed()],
      components: [buttons()]
    });

  if (id === "roles")
    return interaction.reply({ content: "WIP roles", ephemeral: true });

  if (id === "dm")
    return interaction.reply({ content: "WIP dm", ephemeral: true });
}

module.exports = {
  startPanel,
  startEventSystem,
  handleEventInteraction
};
