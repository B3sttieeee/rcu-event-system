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
  },

  IMAGES: {
    PANEL: "https://imgur.com/l405BQN.png",
    MERCHANT: "https://imgur.com/sasz9j4.png",
  },

  EVENTS: {
    merchant: { hours: [2, 5, 8, 11, 14, 17, 20, 23], role: "MERCHANT" },
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

const saveDB = (db) =>
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

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

// ====================== EMBEDS ======================
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

// ====================== BUTTONS ======================
const buttons = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("refresh")
      .setLabel("Refresh")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("roles")
      .setLabel("Roles")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("dm")
      .setLabel("Notifications")
      .setStyle(ButtonStyle.Primary)
  );

// ====================== ROLE MENU ======================
const roleMenu = () =>
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("role_menu")
      .setPlaceholder("Select event roles")
      .setMinValues(0)
      .setMaxValues(1)
      .addOptions([
        { label: "Merchant", value: "merchant", emoji: "🍯" },
      ])
  );

// ====================== DM MENU ======================
const dmMenu = () =>
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("dm_menu")
      .setPlaceholder("Event notifications DM")
      .setMinValues(0)
      .setMaxValues(1)
      .addOptions([
        { label: "Merchant", value: "merchant", emoji: "🍯" },
      ])
  );

// ====================== CORE EVENT ENGINE ======================
function registerEvent(client, key, event, hour, roleId, image) {
  const now = getNow();
  const h = now.getHours();
  const m = now.getMinutes();

  const baseKey = `${key}-${hour}`;
  const preKey = baseKey + "-pre";
  const startKey = baseKey + "-start";

  const fetchChannel = () =>
    client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);

  if (h === (hour - 1 + 24) % 24 && m === 55 && !processed.has(preKey)) {
    fetchChannel().then((ch) => {
      if (!ch) return;
      ch.send(`<@&${roleId}> ${key} starts in 5 minutes`)
        .then((msg) => processed.set(preKey, msg.id));
    });
  }

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

  if (id === "refresh") {
    return interaction.update({
      embeds: [panelEmbed()],
      components: [buttons()],
    });
  }

  if (id === "roles") {
    return interaction.reply({
      content: "🎭 Select your roles:",
      components: [roleMenu()],
      ephemeral: true,
    });
  }

  if (id === "dm") {
    return interaction.reply({
      content: "📩 Select DM notifications:",
      components: [dmMenu()],
      ephemeral: true,
    });
  }

  if (id === "role_menu") {
    const member = await interaction.guild.members.fetch(interaction.user.id);

    const map = {
      merchant: CONFIG.ROLES.MERCHANT,
    };

    for (const r of Object.values(map)) {
      if (member.roles.cache.has(r)) {
        await member.roles.remove(r).catch(() => {});
      }
    }

    for (const val of interaction.values) {
      const role = map[val];
      if (role) await member.roles.add(role).catch(() => {});
    }

    return interaction.reply({
      content: "✅ Roles updated!",
      ephemeral: true,
    });
  }

  if (id === "dm_menu") {
    const db = loadDB();
    db.dm[interaction.user.id] = interaction.values;
    saveDB(db);

    return interaction.reply({
      content: "📩 Notifications saved!",
      ephemeral: true,
    });
  }
}

module.exports = {
  startPanel,
  startEventSystem,
  handleEventInteraction,
};
