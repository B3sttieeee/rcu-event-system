// src/systems/event/index.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");
const fs = require("fs");
const path = require("path");

// ====================== CONFIG (Unified & Scalable) ======================
const CONFIG = {
  CHANNEL_ID: "1484937784283369502",
  LOG_CHANNEL: "1494072832827850953",
  EVENTS: {
    merchant: { 
      name: "Merchant",
      hours: [2, 5, 8, 11, 14, 17, 20, 23], 
      roleId: "1476000993660502139",
      emoji: "🍯",
      image: "https://imgur.com/sasz9j4.png"
    },
    // Tutaj możesz dopisać kolejne eventy, a menu same się zaktualizują!
  },
  PANEL_IMAGE: "https://imgur.com/l405BQN.png",
  DELETE_EVENT_AFTER: 15 * 60 * 1000, // 15 minut
};

const DB_PATH = path.join(process.env.DATA_DIR || "/data", "eventDB.json");

// ====================== DATABASE & UTILS ======================
const loadDB = () => {
  if (!fs.existsSync(DB_PATH)) return { dm: {} };
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf8")); } catch { return { dm: {} }; }
};

const saveDB = (db) => fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

const getNextOccurrence = (hours) => {
  const now = new Date();
  const warsawNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
  
  const target = new Date(warsawNow);
  const nextHour = hours.find(h => h > warsawNow.getHours()) ?? hours[0];
  
  if (nextHour <= warsawNow.getHours()) target.setDate(target.getDate() + 1);
  target.setHours(nextHour, 0, 0, 0);
  
  return Math.floor(target.getTime() / 1000);
};

// ====================== COMPONENTS ======================
const buildPanelEmbed = () => {
  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🎫 EVENT CENTER")
    .setImage(CONFIG.PANEL_IMAGE)
    .setFooter({ text: "VYRN • Auto-updating Tracker" })
    .setTimestamp();

  const description = Object.values(CONFIG.EVENTS).map(e => {
    const timestamp = getNextOccurrence(e.hours);
    return `${e.emoji} **${e.name.toUpperCase()}**\nNext: <t:${timestamp}:t> | Starts: <t:${timestamp}:R>`;
  }).join("\n\n━━━━━━━━━━━━━━\n\n");

  embed.setDescription(description);
  return embed;
};

const buildMenus = (customId, placeholder) => {
  const options = Object.entries(CONFIG.EVENTS).map(([key, e]) => ({
    label: e.name,
    value: key,
    emoji: e.emoji,
    description: `Notify for ${e.name} event`
  }));

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .setMinValues(0)
      .setMaxValues(options.length)
      .addOptions(options)
  );
};

const buildButtons = () => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId("refresh_events").setLabel("Refresh").setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId("get_event_roles").setLabel("Roles").setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId("get_event_dm").setLabel("DM Alerts").setStyle(ButtonStyle.Primary)
);

// ====================== CORE ENGINE ======================
const processed = new Set();

async function checkEvents(client) {
  const now = new Date();
  const warsawNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
  const h = warsawNow.getHours();
  const m = warsawNow.getMinutes();

  for (const [key, e] of Object.entries(CONFIG.EVENTS)) {
    if (!e.hours.includes(h)) continue;

    const startKey = `${key}-${h}-${warsawNow.getDate()}`;
    if (m === 0 && !processed.has(startKey)) {
      processed.add(startKey);
      await triggerEvent(client, key, e);
    }
  }

  // Czyść cache starego dnia
  if (h === 0 && m === 5) processed.clear();
}

async function triggerEvent(client, key, eventData) {
  const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#22c55e") // Zielony VYRN
    .setTitle(`🎉 ${eventData.name.toUpperCase()} STARTED`)
    .setDescription(`${eventData.emoji} The event is now **ACTIVE**!\n\n👉 Join the game and participate now.`)
    .setImage(eventData.image)
    .setTimestamp();

  const msg = await channel.send({ 
    content: `<@&${eventData.roleId}>`, 
    embeds: [embed] 
  });

  // Wysyłanie DM do zapisanych osób
  const db = loadDB();
  const usersToNotify = Object.entries(db.dm)
    .filter(([_, subs]) => subs.includes(key))
    .map(([userId]) => userId);

  for (const userId of usersToNotify) {
    const user = await client.users.fetch(userId).catch(() => null);
    if (user) {
      user.send({ 
        content: `🔔 **VYRN Alert:** The **${eventData.name}** event has just started!`,
        embeds: [embed] 
      }).catch(() => console.log(`[EVENT] Could not DM ${userId}`));
    }
  }

  setTimeout(() => msg.delete().catch(() => {}), CONFIG.DELETE_EVENT_AFTER);
}

// ====================== HANDLERS ======================
async function handleEventInteraction(interaction) {
  const { customId, member, values, user } = interaction;

  try {
    if (customId === "refresh_events") {
      return await interaction.update({ embeds: [buildPanelEmbed()] });
    }

    if (customId === "get_event_roles") {
      return await interaction.reply({ 
        content: "🎭 Wybierz role, które chcesz otrzymać:", 
        components: [buildMenus("role_menu", "Select Roles")], 
        ephemeral: true 
      });
    }

    if (customId === "get_event_dm") {
      return await interaction.reply({ 
        content: "📩 Wybierz eventy, o których chcesz dostawać powiadomienie w DM:", 
        components: [buildMenus("dm_menu", "Select DM Alerts")], 
        ephemeral: true 
      });
    }

    if (customId === "role_menu") {
      const rolesToSet = values.map(v => CONFIG.EVENTS[v].roleId);
      const allEventRoles = Object.values(CONFIG.EVENTS).map(e => e.roleId);

      // Usuń wszystkie i dodaj wybrane
      for (const roleId of allEventRoles) {
        if (member.roles.cache.has(roleId)) await member.roles.remove(roleId).catch(() => {});
      }
      for (const roleId of rolesToSet) {
        await member.roles.add(roleId).catch(() => {});
      }

      return await interaction.reply({ content: "✅ Twoje role eventowe zostały zaktualizowane!", ephemeral: true });
    }

    if (customId === "dm_menu") {
      const db = loadDB();
      db.dm[user.id] = values;
      saveDB(db);
      return await interaction.reply({ content: "✅ Twoje preferencje powiadomień DM zostały zapisane!", ephemeral: true });
    }
  } catch (err) {
    console.error("🔥 Interaction Error:", err);
  }
}

// ====================== INITIALIZATION ======================
let panelMessage = null;

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
  console.log("🎫 Event System [Black Edition v2] → załadowany");
  
  syncPanel(client);
  
  // Sprawdzanie eventów co minutę (wystarczy, bo używamy timestamps)
  setInterval(() => checkEvents(client), 60000);
  
  // Odświeżanie panelu raz na godzinę (timestamps same odliczają, więc rzadka edycja wystarczy)
  setInterval(() => {
    if (panelMessage) panelMessage.edit({ embeds: [buildPanelEmbed()] }).catch(() => syncPanel(client));
  }, 3600000);
}

module.exports = { init, handleEventInteraction };
