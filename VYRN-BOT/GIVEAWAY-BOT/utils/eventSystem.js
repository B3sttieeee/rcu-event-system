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

// ====================== TIME ======================
const getNow = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));

const getNextHour = (hours) => {
  const now = getNow().getHours();
  return hours.find((h) => h > now) ?? hours[0];
};

const getCountdown = (hours) => {
  const now = getNow();
  const next = getNextHour(hours);

  const target = new Date(now);
  if (next <= now.getHours()) target.setDate(target.getDate() + 1);

  target.setHours(next, 0, 0, 0);

  const diff = target - now;
  const s = Math.floor(diff / 1000);

  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
};

// ====================== CACHE ======================
const processed = new Map();

// ====================== EMBEDS ======================
const embed = (title, color, image, desc) =>
  new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setImage(image)
    .setDescription(desc ?? "")
    .setTimestamp();

const panelEmbed = () =>
  new EmbedBuilder()
    .setColor("#f59e0b")
    .setTitle("🎉 EVENT TRACKER")
    .setDescription(
      Object.entries(CONFIG.EVENTS)
        .map(([name, e]) => {
          const hours = e.hours;
          return `**${name.toUpperCase()}**\n\`${getNextHour(hours)}:00\` • ${getCountdown(hours)}`;
        })
        .join("\n\n")
    )
    .setImage(CONFIG.IMAGES.PANEL)
    .setFooter({ text: "Event System" })
    .setTimestamp();

// ====================== COMPONENTS ======================
const buttons = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("refresh").setLabel("🔄").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("roles").setLabel("🎭").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("dm").setLabel("📩").setStyle(ButtonStyle.Primary)
  );

const roleMenu = () =>
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("role_menu")
      .setPlaceholder("Wybierz role")
      .addOptions([
        { label: "Merchant", value: "merchant", emoji: "🍯" },
        { label: "Spring", value: "spring", emoji: "🌸" },
        { label: "Egg", value: "egg", emoji: "🐣" },
      ])
  );

const dmMenu = () =>
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("dm_menu")
      .setPlaceholder("DM notifications")
      .setMinValues(0)
      .setMaxValues(3)
      .addOptions([
        { label: "Merchant", value: "merchant", emoji: "🍯" },
        { label: "Spring", value: "spring", emoji: "🌸" },
        { label: "Egg", value: "egg", emoji: "🐣" },
      ])
  );

// ====================== DISPATCHER ======================
async function sendDM(client, type, message) {
  const db = loadDB();

  for (const [id, subs] of Object.entries(db.dm || {})) {
    if (!subs.includes(type)) continue;

    const user = await client.users.fetch(id).catch(() => null);
    if (user) user.send(message).catch(() => {});
  }
}

// ====================== EVENT ENGINE ======================
function registerEvent(client, key, event, hour, roleId, embed) {
  const base = `${key}-${hour}`;
  const now = getNow();
  const h = now.getHours();
  const m = now.getMinutes();

  const preKey = base + "-pre";
  const startKey = base + "-start";

  const channelFetch = () =>
    client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);

  // PRE
  if (h === (hour - 1 + 24) % 24 && m === 55 && !processed.has(preKey)) {
    channelFetch().then((ch) => {
      if (!ch) return;
      ch.send(`<@&${roleId}> ⏳ ${key} za 5 minut!`).then((msg) => {
        processed.set(preKey, msg.id);
      });
    });
  }

  // START
  if (h === hour && m === 0 && !processed.has(startKey)) {
    channelFetch().then(async (ch) => {
      if (!ch) return;

      const preId = processed.get(preKey);
      if (preId) {
        const msg = await ch.messages.fetch(preId).catch(() => null);
        msg?.delete().catch(() => {});
        processed.delete(preKey);
      }

      const msg = await ch.send({
        content: `<@&${roleId}>`,
        embeds: [embed],
      });

      sendDM(client, key, `🚀 ${key.toUpperCase()} started!`);

      setTimeout(() => msg.delete().catch(() => {}), CONFIG.DELETE_AFTER);
      processed.set(startKey, true);
    });
  }
}

// ====================== SYSTEM ======================
function startEventSystem(client) {
  console.log("🚀 Event system running");

  setInterval(() => {
    const now = getNow();
    const h = now.getHours();
    const m = now.getMinutes();

    for (const [name, data] of Object.entries(CONFIG.EVENTS)) {
      data.hours.forEach((hour) => {
        registerEvent(
          client,
          name,
          data,
          hour,
          CONFIG.ROLES[data.role],
          embed(`${name.toUpperCase()} START`, "#f59e0b", CONFIG.IMAGES[name.toUpperCase()] || "")
        );
      });
    }

    if (m === 5) processed.clear();
  }, CONFIG.REFRESH_INTERVAL);
}

// ====================== PANEL ======================
async function startPanel(client) {
  const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const msg = await channel.send({
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
  if (interaction.customId === "refresh")
    return interaction.update({ embeds: [panelEmbed()], components: [buttons()] });

  if (interaction.customId === "roles")
    return interaction.reply({ components: [roleMenu()], ephemeral: true });

  if (interaction.customId === "dm")
    return interaction.reply({ components: [dmMenu()], ephemeral: true });

  if (interaction.customId === "role_menu") {
    const m = await interaction.guild.members.fetch(interaction.user.id);
    await m.roles.set([]).catch(() => {});
    return interaction.reply({ content: "OK", ephemeral: true });
  }

  if (interaction.customId === "dm_menu") {
    const db = loadDB();
    db.dm[interaction.user.id] = interaction.values;
    saveDB(db);

    return interaction.reply({ content: "Saved", ephemeral: true });
  }
}

module.exports = {
  startPanel,
  startEventSystem,
  handleEventInteraction,
};
