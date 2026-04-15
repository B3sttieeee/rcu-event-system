const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

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

// ====================== TIME ======================
const getNow = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));

const getNextHour = (hours) => {
  const now = getNow().getHours();
  return hours.find((h) => h > now) ?? hours[0];
};

const getCountdown = (hour) => {
  const now = getNow();
  const target = new Date(now);

  if (hour <= now.getHours()) target.setDate(target.getDate() + 1);

  target.setHours(hour, 0, 0, 0);

  const diff = target - now;
  const s = Math.floor(diff / 1000);

  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
};

// ====================== CACHE ======================
const processed = new Map();

// =====================================================
// 🎯 TICKET-STYLE CLEAN UI
// =====================================================

const panelEmbed = () =>
  new EmbedBuilder()
    .setColor("#2b2d31")
    .setTitle("🎫 EVENT CENTER")
    .setDescription(
      Object.entries(CONFIG.EVENTS)
        .map(([name, e]) => {
          const next = getNextHour(e.hours);
          return [
            `**${name.toUpperCase()} EVENT**`,
            `Next: \`${next}:00\``,
            `Starts in: **${getCountdown(next)}**`,
          ].join("\n");
        })
        .join("\n\n━━━━━━━━━━━━━━\n\n")
    )
    .setImage(CONFIG.IMAGES.PANEL)
    .setFooter({ text: "Clan System • Event Tracker" })
    .setTimestamp();

const eventEmbed = (name, image) =>
  new EmbedBuilder()
    .setColor("#2b2d31")
    .setTitle(`🎉 ${name.toUpperCase()} EVENT STARTED`)
    .setDescription(
      [
        "━━━━━━━━━━━━━━",
        "📢 Event is ACTIVE",
        "",
        "👉 Join now & participate",
        "━━━━━━━━━━━━━━",
      ].join("\n")
    )
    .setImage(image || null)
    .setFooter({ text: "Clan Event System" })
    .setTimestamp();

// ====================== BUTTONS (MATCH ROLES STYLE) ======================
const buttons = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("refresh")
      .setLabel("Refresh")
      .setStyle(ButtonStyle.Secondary), // 🔘 jak roles

    new ButtonBuilder()
      .setCustomId("roles")
      .setLabel("Roles")
      .setStyle(ButtonStyle.Secondary), // 🔘 jak roles

    new ButtonBuilder()
      .setCustomId("dm")
      .setLabel("Notifications")
      .setStyle(ButtonStyle.Primary) // 🔵 jak główny action
  );

// ====================== CORE (UNCHANGED LOGIC) ======================
function registerEvent(client, key, event, hour, roleId, image) {
  const now = getNow();
  const h = now.getHours();
  const m = now.getMinutes();

  const baseKey = `${key}-${hour}`;
  const preKey = baseKey + "-pre";
  const startKey = baseKey + "-start";

  const fetchChannel = () =>
    client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);

  // PRE
  if (h === (hour - 1 + 24) % 24 && m === 55 && !processed.has(preKey)) {
    fetchChannel().then((ch) => {
      if (!ch) return;
      ch.send(`<@&${roleId}> ${key} starts in 5 minutes`)
        .then((msg) => processed.set(preKey, msg.id));
    });
  }

  // START
  if (h === hour && m === 0 && !processed.has(startKey)) {
    fetchChannel().then(async (ch) => {
      if (!ch) return;

      const preId = processed.get(preKey);
      if (preId) {
        const msg = await ch.messages.fetch(preId).catch(() => null);
        msg?.delete().catch(() => {});
        processed.delete(preKey);
      }

      const msg = await ch.send({
        content: `<@&${roleId}>`,
        embeds: [eventEmbed(key, image)],
      });

      setTimeout(() => msg.delete().catch(() => {}), CONFIG.DELETE_AFTER);

      processed.set(startKey, true);
    });
  }
}

// ====================== SYSTEM ======================
function startEventSystem(client) {
  console.log("🚀 Event system running (clean UI)");

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
    components: [buttons()],
  });

  setInterval(() => {
    msg.edit({
      embeds: [panelEmbed()],
      components: [buttons()],
    }).catch(() => {});
  }, CONFIG.REFRESH_INTERVAL);
}

// ====================== INTERACTIONS ======================
async function handleEventInteraction(interaction) {
  const id = interaction.customId;

  if (id === "refresh")
    return interaction.update({
      embeds: [panelEmbed()],
      components: [buttons()],
    });

  if (id === "roles")
    return interaction.reply({
      content: "Role system coming soon.",
      ephemeral: true,
    });

  if (id === "dm")
    return interaction.reply({
      content: "Notification system coming soon.",
      ephemeral: true,
    });
}

module.exports = {
  startPanel,
  startEventSystem,
  handleEventInteraction,
};
