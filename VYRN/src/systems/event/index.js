// =====================================================
// VYRN • EVENT SYSTEM (BLACK EDITION V2 - FULL VERSION)
// =====================================================
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
  },
  IMAGES: {
    PANEL: "https://imgur.com/l405BQN.png",
    MERCHANT: "https://imgur.com/sasz9j4.png",
  },
  EVENTS: {
    merchant: { 
      name: "Merchant", 
      hours: [2, 5, 8, 11, 14, 17, 20, 23], 
      roleKey: "MERCHANT", 
      emoji: "🍯" 
    },
  },
  REFRESH_INTERVAL: 30000, // Odświeżanie panelu (30s)
  CHECK_INTERVAL: 10000,   // Sprawdzanie startu eventu (10s)
  DELETE_AFTER: 15 * 60 * 1000, // Usunięcie komunikatu o evencie po 15 min
};

// ====================== DATABASE ======================
const DB_PATH = path.join(process.env.DATA_DIR || "/data", "eventDB.json");

const loadDB = () => {
  if (!fs.existsSync(DB_PATH)) return { dm: {} };
  try {
    const data = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(data);
  } catch {
    return { dm: {} };
  }
};

const saveDB = (db) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
};

// ====================== TIME HELPERS (WARSAW FIX) ======================
const getWarsawDate = () => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
};

const getNextOccurrence = (hours) => {
  const now = getWarsawDate();
  const currentHour = now.getHours();
  
  let nextHour = hours.find(h => h > currentHour);
  let isNextDay = false;

  if (nextHour === undefined) {
    nextHour = hours[0];
    isNextDay = true;
  }

  const target = new Date(now);
  if (isNextDay) target.setDate(target.getDate() + 1);
  target.setHours(nextHour, 0, 0, 0);
  
  return Math.floor(target.getTime() / 1000);
};

// ====================== CACHE & STATE ======================
const processed = new Set();
let panelMessage = null;

// ====================== EMBEDS ======================
const buildPanelEmbed = () => {
  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🎫 EVENT CENTER")
    .setImage(CONFIG.IMAGES.PANEL)
    .setFooter({ text: "VYRN • Event Tracker" })
    .setTimestamp();

  const description = Object.entries(CONFIG.EVENTS).map(([key, e]) => {
    const timestamp = getNextOccurrence(e.hours);
    return `**${e.name.toUpperCase()} EVENT**\n` +
           `Next: <t:${timestamp}:t>\n` +
           `Starts: <t:${timestamp}:R>`;
  }).join("\n\n━━━━━━━━━━━━━━\n\n");

  embed.setDescription(description);
  return embed;
};

const buildEventEmbed = (name, image) => 
  new EmbedBuilder()
    .setColor("#22c55e")
    .setTitle(`🎉 ${name.toUpperCase()} EVENT STARTED`)
    .setDescription("📢 Event is now **ACTIVE**\n\n👉 Join now and participate!")
    .setImage(image || null)
    .setFooter({ text: "VYRN • Event System" })
    .setTimestamp();

// ====================== COMPONENTS ======================
const buildButtons = () => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId("refresh_events").setLabel("Refresh").setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId("get_event_roles").setLabel("Roles").setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId("get_event_dm").setLabel("Notifications").setStyle(ButtonStyle.Primary)
);

const buildRoleMenu = () => {
  const options = Object.entries(CONFIG.EVENTS).map(([key, e]) => ({
    label: e.name, value: key, emoji: e.emoji
  }));
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("role_menu")
      .setPlaceholder("Select event roles")
      .addOptions(options)
  );
};

const buildDmMenu = () => {
  const options = Object.entries(CONFIG.EVENTS).map(([key, e]) => ({
    label: e.name, value: key, emoji: e.emoji
  }));
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("dm_menu")
      .setPlaceholder("Event notifications DM")
      .addOptions(options)
  );
};

// ====================== CORE ENGINE ======================
async function checkEvents(client) {
  const now = getWarsawDate();
  const h = now.getHours();
  const m = now.getMinutes();
  const day = now.getDate();

  for (const [key, e] of Object.entries(CONFIG.EVENTS)) {
    const roleId = CONFIG.ROLES[e.roleKey];
    const image = CONFIG.IMAGES[key.toUpperCase()];

    // 1. POWIADOMIENIE: 5 minut przed startem
    for (const eventHour of e.hours) {
      const preHour = (eventHour === 0) ? 23 : eventHour - 1;
      const preKey = `pre-${key}-${eventHour}-${day}`;

      if (h === preHour && m === 55 && !processed.has(preKey)) {
        processed.add(preKey);
        const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
        if (channel) {
          channel.send(`<@&${roleId}> **${e.name}** starts in 5 minutes! ⏳`).catch(() => {});
        }
      }

      // 2. START EVENTU: Pełna godzina
      const startKey = `start-${key}-${eventHour}-${day}`;
      if (h === eventHour && m === 0 && !processed.has(startKey)) {
        processed.add(startKey);
        await triggerEvent(client, key, e, roleId, image);
      }
    }
  }

  // Czyść cache starego dnia o północy
  if (h === 0 && m === 10) processed.clear();
}

async function triggerEvent(client, key, eventData, roleId, image) {
  const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const msg = await channel.send({
    content: `<@&${roleId}>`,
    embeds: [buildEventEmbed(eventData.name, image)]
  }).catch(() => null);

  // Wysyłanie DM do zapisanych użytkowników
  const db = loadDB();
  const subscribers = Object.entries(db.dm || {}).filter(([_, subs]) => subs.includes(key));

  for (const [userId] of subscribers) {
    const user = await client.users.fetch(userId).catch(() => null);
    if (user) {
      user.send({
        content: `🔔 **VYRN Alert:** The **${eventData.name}** event has just started!`,
        embeds: [buildEventEmbed(eventData.name, image)]
      }).catch(() => {});
    }
  }

  if (msg) setTimeout(() => msg.delete().catch(() => {}), CONFIG.DELETE_AFTER);
}

// ====================== HANDLERS ======================
async function handleEventInteraction(interaction) {
  const { customId, member, values, user } = interaction;

  try {
    if (customId === "refresh_events") {
      return await interaction.update({ embeds: [buildPanelEmbed()], components: [buildButtons()] });
    }

    if (customId === "get_event_roles") {
      return await interaction.reply({ content: "🎭 Select event roles:", components: [buildRoleMenu()], ephemeral: true });
    }

    if (customId === "get_event_dm") {
      return await interaction.reply({ content: "📩 Event notifications DM:", components: [buildDmMenu()], ephemeral: true });
    }

    if (customId === "role_menu") {
      const selectedKey = values[0];
      const roleId = CONFIG.ROLES[CONFIG.EVENTS[selectedKey].roleKey];
      
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        return await interaction.reply({ content: `❌ Removed role for **${selectedKey}**`, ephemeral: true });
      } else {
        await member.roles.add(roleId);
        return await interaction.reply({ content: `✅ Added role for **${selectedKey}**`, ephemeral: true });
      }
    }

    if (customId === "dm_menu") {
      const db = loadDB();
      db.dm[user.id] = values;
      saveDB(db);
      return await interaction.reply({ content: "✅ DM notifications saved!", ephemeral: true });
    }
  } catch (err) {
    console.error("[EVENT INTERACTION ERROR]", err);
  }
}

// ====================== INIT ======================
async function syncPanel(client) {
  const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const messages = await channel.messages.fetch({ limit: 10 });
  panelMessage = messages.find(m => m.embeds[0]?.title === "🎫 EVENT CENTER");

  if (panelMessage) {
    await panelMessage.edit({ embeds: [buildPanelEmbed()], components: [buildButtons()] });
  } else {
    panelMessage = await channel.send({ embeds: [buildPanelEmbed()], components: [buildButtons()] });
  }
}

function init(client) {
  console.log("🎫 Event System [Black Edition Full] → załadowany");
  
  syncPanel(client);

  // Sprawdzanie startów eventów i powiadomień 5min
  setInterval(() => checkEvents(client), CONFIG.CHECK_INTERVAL);

  // Odświeżanie panelu (odliczanie) co 30 sekund
  setInterval(() => {
    if (panelMessage) {
      panelMessage.edit({ embeds: [buildPanelEmbed()] }).catch(() => syncPanel(client));
    }
  }, CONFIG.REFRESH_INTERVAL);
}

module.exports = { init, handleEventInteraction };
