const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
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

// ====================== SAFE STATE ======================
const processed = new Map();

// ====================== TIME (FIXED) ======================
function getNow() {
  return new Date();
}

function getHour() {
  return getNow().getHours();
}

function getMinute() {
  return getNow().getMinutes();
}

// ====================== EMBED SAFE ======================
function safeEmbed(title, desc, image) {
  return new EmbedBuilder()
    .setTitle(title || "Event")
    .setColor("#f59e0b")
    .setDescription(desc && desc.length > 0 ? desc : " ")
    .setImage(image || null)
    .setTimestamp();
}

// ====================== EVENT CORE (FIXED LOGIC) ======================
function registerEvent(client, key, event, hour, roleId, image) {
  const now = getNow();
  const h = getHour();
  const m = getMinute();

  const baseKey = `${key}-${hour}`;
  const preKey = baseKey + "-pre";
  const startKey = baseKey + "-start";

  const channelFetch = () =>
    client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);

  // ======================
  // PRE ALERT (55 min)
  // ======================
  const preHour = (hour - 1 + 24) % 24;

  if (h === preHour && m === 55 && !processed.has(preKey)) {
    channelFetch().then(ch => {
      if (!ch) return;

      ch.send(`<@&${roleId}> ⏳ ${key.toUpperCase()} starts in 5 minutes`)
        .then(msg => {
          processed.set(preKey, msg.id);
        })
        .catch(() => {});
    });
  }

  // ======================
  // START EVENT (00 min)
  // ======================
  if (h === hour && m === 0 && !processed.has(startKey)) {
    channelFetch().then(async ch => {
      if (!ch) return;

      // usuń pre message
      const preMsgId = processed.get(preKey);
      if (preMsgId) {
        const msg = await ch.messages.fetch(preMsgId).catch(() => null);
        if (msg) msg.delete().catch(() => {});
        processed.delete(preKey);
      }

      const embed = safeEmbed(
        `${key.toUpperCase()} START`,
        `Event has started!`,
        image
      );

      const msg = await ch.send({
        content: `<@&${roleId}>`,
        embeds: [embed]
      });

      setTimeout(() => {
        msg.delete().catch(() => {});
      }, CONFIG.DELETE_AFTER);

      processed.set(startKey, true);
    });
  }
}

// ====================== PANEL ======================
function panelEmbed() {
  const lines = Object.entries(CONFIG.EVENTS).map(([name, e]) => {
    const next = e.hours.find(h => h > getHour()) ?? e.hours[0];
    return `**${name.toUpperCase()}** → \`${next}:00\``;
  });

  return new EmbedBuilder()
    .setColor("#f59e0b")
    .setTitle("🎉 EVENT TRACKER")
    .setDescription(lines.join("\n") || "No events")
    .setImage(CONFIG.IMAGES.PANEL)
    .setTimestamp();
}

function buttons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("refresh").setLabel("🔄").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("roles").setLabel("🎭").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("dm").setLabel("📩").setStyle(ButtonStyle.Primary)
  );
}

// ====================== ENGINE ======================
function startEventSystem(client) {
  console.log("🚀 Event system running (FIXED)");

  setInterval(() => {
    const now = getNow();
    const h = now.getHours();
    const m = now.getMinutes();

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

    // reset cache co godzinę (stabilność)
    if (m === 5) processed.clear();

  }, CONFIG.REFRESH_INTERVAL);
}

// ====================== PANEL START ======================
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

// ====================== INTERACTIONS ======================
async function handleEventInteraction(interaction) {
  const id = interaction.customId;

  try {
    if (id === "refresh") {
      return interaction.update({
        embeds: [panelEmbed()],
        components: [buttons()]
      });
    }

    if (id === "roles") {
      return interaction.reply({ content: "Roles menu WIP", ephemeral: true });
    }

    if (id === "dm") {
      return interaction.reply({ content: "DM menu WIP", ephemeral: true });
    }

    if (id === "dm_menu") {
      return interaction.reply({ content: "Saved", ephemeral: true });
    }
  } catch (e) {
    console.error("EVENT INTERACTION ERROR:", e);
  }
}

module.exports = {
  startPanel,
  startEventSystem,
  handleEventInteraction
};
