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
    merchant: "1476000993660502139",
    egg: "1489930030166573150",
    spring: "1476000993119568105",
  },

  IMAGES: {
    panel: "https://imgur.com/AybkuW5.png",
    merchant: "https://imgur.com/7GBAq8Z.png",
    egg: "https://imgur.com/xppQUWX.png",
    spring: "https://imgur.com/89tmfpV.png",
  },

  EVENTS: {
    merchant: { hours: [2, 5, 8, 11, 14, 17, 20, 23], role: "merchant" },
    spring: { hours: Array.from({ length: 24 }, (_, i) => i), role: "spring" },
    egg: { hours: [0, 3, 6, 9, 12, 15, 18, 21], role: "egg" },
  },

  REFRESH_INTERVAL: 15_000,
  DELETE_AFTER: 15 * 60 * 1000,
};

// ====================== DB ======================
const DB_PATH = path.join(__dirname, "..", "eventDB.json");

const loadDB = () => {
  try {
    if (!fs.existsSync(DB_PATH)) return { dm: {} };
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch {
    return { dm: {} };
  }
};

const saveDB = (db) =>
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

// ====================== TIME (WARSAW SAFE) ======================
const now = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));

const hoursLeft = (targetHour) => {
  const n = now();
  const current = n.getHours();

  let diff = targetHour - current;
  if (diff < 0) diff += 24;

  const mins = 60 - n.getMinutes();
  return { h: diff, m: mins };
};

const formatCountdown = (hour) => {
  const n = now();
  const target = new Date(n);
  target.setHours(hour, 0, 0, 0);

  if (target < n) target.setDate(target.getDate() + 1);

  const diff = target - n;

  const s = Math.floor(diff / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  return `⏳ ${h}h ${m}m ${sec}s`;
};

// ====================== CACHE ======================
const processed = new Set();

// ====================== EMBEDS ======================
const panelEmbed = () =>
  new EmbedBuilder()
    .setColor("#0f172a")
    .setTitle("📊 EVENT CONTROL CENTER")
    .setDescription(
      Object.entries(CONFIG.EVENTS)
        .map(([name, e]) => {
          const next = e.hours.find((h) => h >= now().getHours()) ?? e.hours[0];

          return (
            `**${name.toUpperCase()} EVENT**\n` +
            `🕒 Next: \`${next}:00\`\n` +
            `${formatCountdown(next)}`
          );
        })
        .join("\n\n")
    )
    .setImage(CONFIG.IMAGES.panel)
    .setFooter({ text: "Live Event System • Warsaw Time" })
    .setTimestamp();

// ====================== COMPONENTS ======================
const buttons = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("refresh")
      .setLabel("Refresh")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("roles")
      .setLabel("Roles")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("dm")
      .setLabel("DM Alerts")
      .setStyle(ButtonStyle.Success)
  );

const roleMenu = () =>
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("role_menu")
      .setPlaceholder("Select event role")
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
      .setPlaceholder("Select DM notifications")
      .setMinValues(0)
      .setMaxValues(3)
      .addOptions([
        { label: "Merchant", value: "merchant", emoji: "🍯" },
        { label: "Spring", value: "spring", emoji: "🌸" },
        { label: "Egg", value: "egg", emoji: "🐣" },
      ])
  );

// ====================== DM SYSTEM ======================
async function sendDM(client, type, msg) {
  const db = loadDB();

  for (const [userId, subs] of Object.entries(db.dm || {})) {
    if (!subs.includes(type)) continue;

    const user = await client.users.fetch(userId).catch(() => null);
    if (user) user.send(msg).catch(() => {});
  }
}

// ====================== EVENT ENGINE ======================
function startEventSystem(client) {
  console.log("🚀 Event system ONLINE");

  setInterval(() => {
    const n = now();
    const h = n.getHours();
    const m = n.getMinutes();

    for (const [name, data] of Object.entries(CONFIG.EVENTS)) {
      for (const hour of data.hours) {
        const key = `${name}-${hour}`;

        const roleId = CONFIG.ROLES[data.role];
        const channelPromise = client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);

        // PRE ALERT
        if (h === (hour + 23) % 24 && m === 55 && !processed.has(key + "-pre")) {
          channelPromise.then((ch) => {
            if (!ch) return;

            ch.send(`⏳ <@&${roleId}> ${name.toUpperCase()} starts in 5 minutes`);
            processed.add(key + "-pre");
          });
        }

        // START EVENT
        if (h === hour && m === 0 && !processed.has(key + "-start")) {
          channelPromise.then(async (ch) => {
            if (!ch) return;

            const msg = await ch.send({
              content: `<@&${roleId}>`,
              embeds: [
                new EmbedBuilder()
                  .setColor("#f59e0b")
                  .setTitle(`🔥 ${name.toUpperCase()} EVENT STARTED`)
                  .setImage(CONFIG.IMAGES[name])
              ],
            });

            sendDM(client, name, `🚀 ${name.toUpperCase()} just started!`);

            setTimeout(() => msg.delete().catch(() => {}), CONFIG.DELETE_AFTER);

            processed.add(key + "-start");
          });
        }
      }
    }

    if (m === 5) processed.clear();
  }, CONFIG.REFRESH_INTERVAL);
}

// ====================== PANEL ======================
async function startPanel(client) {
  const ch = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
  if (!ch) return;

  const msg = await ch.send({
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
    return interaction.update({
      embeds: [panelEmbed()],
      components: [buttons()],
    });

  if (interaction.customId === "roles")
    return interaction.reply({
      components: [roleMenu()],
      ephemeral: true,
    });

  if (interaction.customId === "dm")
    return interaction.reply({
      components: [dmMenu()],
      ephemeral: true,
    });

  if (interaction.customId === "dm_menu") {
    const db = loadDB();
    db.dm[interaction.user.id] = interaction.values;
    saveDB(db);

    return interaction.reply({
      content: "✅ Saved notification settings",
      ephemeral: true,
    });
  }
}

// ====================== EXPORT ======================
module.exports = {
  startPanel,
  startEventSystem,
  handleEventInteraction,
};
