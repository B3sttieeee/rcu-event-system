// =====================================================
// VYRN • EVENT SYSTEM (BLACK EDITION - TEXT COUNTER)
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
  REFRESH_INTERVAL: 10000, // Odświeżanie licznika (co 10 sekund)
  DELETE_AFTER: 15 * 60 * 1000, 
};

const DB_PATH = path.join(process.env.DATA_DIR || "/data", "eventDB.json");

// ====================== DATABASE ======================
const loadDB = () => {
  if (!fs.existsSync(DB_PATH)) return { dm: {} };
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf8")); } catch { return { dm: {} }; }
};
const saveDB = (db) => fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

// ====================== TIME CALCULATOR (TEXT TIMER) ======================
const getWarsawNow = () => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
};

const getEventStatus = (hours) => {
  const now = getWarsawNow();
  const currentH = now.getHours();
  
  // Szukamy następnej godziny
  let nextH = hours.find(h => h > currentH);
  let isNextDay = false;

  if (nextH === undefined) {
    nextH = hours[0];
    isNextDay = true;
  }

  const target = new Date(now);
  if (isNextDay) target.setDate(target.getDate() + 1);
  target.setHours(nextH, 0, 0, 0);

  const diff = target - now;
  const totalSeconds = Math.floor(diff / 1000);
  
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return {
    nextTime: `${nextH}:00`,
    countdown: `${h}h ${m}m ${s}s`
  };
};

// ====================== EMBEDS ======================
const buildPanelEmbed = () => {
  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🎫 EVENT CENTER")
    .setImage(CONFIG.IMAGES.PANEL)
    .setFooter({ text: "VYRN • Live Tracker" })
    .setTimestamp();

  const description = Object.entries(CONFIG.EVENTS).map(([key, e]) => {
    const status = getEventStatus(e.hours);
    return `**${e.name.toUpperCase()} EVENT**\n` +
           `Next: \`${status.nextTime}\`\n` +
           `Starts in: **${status.countdown}**`;
  }).join("\n\n━━━━━━━━━━━━━━\n\n");

  embed.setDescription(description);
  return embed;
};

// ====================== COMPONENTS ======================
const buildButtons = () => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId("refresh_events").setLabel("Refresh").setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId("get_event_roles").setLabel("Roles").setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId("get_event_dm").setLabel("Notifications").setStyle(ButtonStyle.Primary)
);

const buildMenu = (id, placeholder) => {
  const options = Object.entries(CONFIG.EVENTS).map(([key, e]) => ({
    label: e.name, value: key, emoji: e.emoji
  }));
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId(id).setPlaceholder(placeholder).addOptions(options)
  );
};

// ====================== CORE ENGINE ======================
const processed = new Set();
let panelMessage = null;

async function checkEvents(client) {
  const now = getWarsawNow();
  const h = now.getHours();
  const m = now.getMinutes();
  const day = now.getDate();

  for (const [key, e] of Object.entries(CONFIG.EVENTS)) {
    const roleId = CONFIG.ROLES[e.roleKey];

    for (const eventH of e.hours) {
      // 5 min przed startem
      const preH = eventH === 0 ? 23 : eventH - 1;
      const preKey = `pre-${key}-${eventH}-${day}`;
      if (h === preH && m === 55 && !processed.has(preKey)) {
        processed.add(preKey);
        const ch = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
        if (ch) ch.send(`<@&${roleId}> **${e.name}** starts in 5 minutes! ⏳`).catch(() => {});
      }

      // Start eventu
      const startKey = `start-${key}-${eventH}-${day}`;
      if (h === eventH && m === 0 && !processed.has(startKey)) {
        processed.add(startKey);
        await triggerEvent(client, key, e, roleId);
      }
    }
  }
  if (h === 0 && m === 5) processed.clear();
}

async function triggerEvent(client, key, eventData, roleId) {
  const ch = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor("#22c55e")
    .setTitle(`🎉 ${eventData.name.toUpperCase()} STARTED`)
    .setDescription("📢 Event is now **ACTIVE**!\n👉 Join and participate!")
    .setImage(CONFIG.IMAGES[key.toUpperCase()] || null)
    .setTimestamp();

  const msg = await ch.send({ content: `<@&${roleId}>`, embeds: [embed] });

  const db = loadDB();
  for (const [uid, subs] of Object.entries(db.dm)) {
    if (subs.includes(key)) {
      const user = await client.users.fetch(uid).catch(() => null);
      if (user) user.send({ content: `🔔 **VYRN:** Event **${eventData.name}** wystartował!`, embeds: [embed] }).catch(() => {});
    }
  }

  setTimeout(() => msg.delete().catch(() => {}), CONFIG.DELETE_AFTER);
}

// ====================== HANDLER ======================
async function handleEventInteraction(interaction) {
  const { customId, member, values, user } = interaction;

  if (customId === "refresh_events") {
    return await interaction.update({ embeds: [buildPanelEmbed()] });
  }

  if (customId === "get_event_roles") {
    return await interaction.reply({ content: "🎭 Wybierz role:", components: [buildMenu("role_menu", "Select Roles")], ephemeral: true });
  }

  if (customId === "get_event_dm") {
    return await interaction.reply({ content: "📩 Powiadomienia DM:", components: [buildMenu("dm_menu", "Select DM Alerts")], ephemeral: true });
  }

  if (customId === "role_menu") {
    const roleId = CONFIG.ROLES[CONFIG.EVENTS[values[0]].roleKey];
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      return await interaction.reply({ content: "❌ Usunięto rolę.", ephemeral: true });
    } else {
      await member.roles.add(roleId);
      return await interaction.reply({ content: "✅ Dodano rolę.", ephemeral: true });
    }
  }

  if (customId === "dm_menu") {
    const db = loadDB();
    db.dm[user.id] = values;
    saveDB(db);
    return await interaction.reply({ content: "✅ Zapisano powiadomienia!", ephemeral: true });
  }
}

// ====================== INIT ======================
async function syncPanel(client) {
  const ch = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
  if (!ch) return;
  const msgs = await ch.messages.fetch({ limit: 10 });
  panelMessage = msgs.find(m => m.embeds[0]?.title === "🎫 EVENT CENTER");

  if (panelMessage) await panelMessage.edit({ embeds: [buildPanelEmbed()], components: [buildButtons()] });
  else panelMessage = await ch.send({ embeds: [buildPanelEmbed()], components: [buildButtons()] });
}

function init(client) {
  syncPanel(client);
  setInterval(() => checkEvents(client), 10000);
  setInterval(() => {
    if (panelMessage) panelMessage.edit({ embeds: [buildPanelEmbed()] }).catch(() => syncPanel(client));
  }, CONFIG.REFRESH_INTERVAL);
}

module.exports = { init, handleEventInteraction };
