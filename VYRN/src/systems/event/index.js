// =====================================================
// VYRN • EVENT SYSTEM (GOLD PRESTIGE EDITION 👑)
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
  THEME: {
    GOLD: "#FFD700",
    BLACK: "#0a0a0a",
    SUCCESS: "#00FF7F",
    WARNING: "#FFA500"
  },
  ROLES: {
    MERCHANT: "1476000993660502139",
  },
  IMAGES: {
    PANEL: "https://imgur.com/DOVs2GQ.png",
    MERCHANT: "https://imgur.com/4hELXcL.png",
  },
  EVENTS: {
    merchant: { 
      name: "Merchant", 
      hours: [2, 5, 8, 11, 14, 17, 20, 23], 
      roleKey: "MERCHANT", 
      emoji: "🍯"
    }
  },
  DELETE_AFTER: 15 * 60 * 1000, // Delete event alert after 15 mins
};

const DB_PATH = path.join(process.env.DATA_DIR || "./", "eventDB.json");

// ====================== DATABASE ======================
const loadDB = () => {
  if (!fs.existsSync(DB_PATH)) return { dm: {} };
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf8")); } catch { return { dm: {} }; }
};
const saveDB = (db) => fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

// ====================== TIME CALCULATOR (UNIX) ======================
const getNextEventTimestamp = (hours) => {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
  const currentH = now.getHours();
  
  let nextH = hours.find(h => h > currentH);
  let isNextDay = false;

  if (nextH === undefined) {
    nextH = hours[0];
    isNextDay = true;
  }

  const target = new Date(now);
  if (isNextDay) target.setDate(target.getDate() + 1);
  target.setHours(nextH, 0, 0, 0);

  return Math.floor(target.getTime() / 1000);
};

// ====================== EMBEDS ======================
const buildPanelEmbed = () => {
  const embed = new EmbedBuilder()
    .setColor(CONFIG.THEME.GOLD)
    .setTitle("🎫 EVENT CENTER")
    .setImage(CONFIG.IMAGES.PANEL)
    .setFooter({ text: "VYRN • Live Tracker" })
    .setTimestamp();

  const description = Object.entries(CONFIG.EVENTS).map(([key, e]) => {
    const nextUnix = getNextEventTimestamp(e.hours);
    return `### ${e.emoji} **${e.name.toUpperCase()} EVENT**\n` +
           `> Next Spawn: <t:${nextUnix}:t>\n` +
           `> Starts in: **<t:${nextUnix}:R>**`;
  }).join("\n\n━━━━━━━━━━━━━━\n\n");

  embed.setDescription(description);
  
  return embed;
};

// ====================== COMPONENTS ======================
const buildButtons = () => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId("refresh_events").setLabel("Refresh").setEmoji("🔄").setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId("get_event_roles").setLabel("Roles").setEmoji("🔔").setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId("get_event_dm").setLabel("Notifications").setEmoji("📩").setStyle(ButtonStyle.Secondary)
);

const buildMenu = (id, placeholder) => {
  const options = Object.entries(CONFIG.EVENTS).map(([key, e]) => ({
    label: e.name, 
    value: key, 
    emoji: e.emoji
  }));
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(id)
      .setPlaceholder(placeholder)
      .setMinValues(0) 
      .setMaxValues(options.length) 
      .addOptions(options)
  );
};

// ====================== CORE ENGINE ======================
const processed = new Set();
let panelMessage = null;

async function checkEvents(client) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
  const h = now.getHours();
  const m = now.getMinutes();
  const day = now.getDate();

  for (const [key, e] of Object.entries(CONFIG.EVENTS)) {
    const roleId = CONFIG.ROLES[e.roleKey];

    for (const eventH of e.hours) {
      // 5 mins before start
      const preH = eventH === 0 ? 23 : eventH - 1;
      const preKey = `pre-${key}-${eventH}-${day}`;
      if (h === preH && m === 55 && !processed.has(preKey)) {
        processed.add(preKey);
        const ch = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
        
        const preEmbed = new EmbedBuilder()
          .setColor(CONFIG.THEME.WARNING)
          .setDescription(`⏳ **Get ready!** The ${e.emoji} **${e.name}** event starts in 5 minutes!`);
          
        if (ch) ch.send({ content: `<@&${roleId}>`, embeds: [preEmbed] }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5 * 60 * 1000));
      }

      // Event start
      const startKey = `start-${key}-${eventH}-${day}`;
      if (h === eventH && m === 0 && !processed.has(startKey)) {
        processed.add(startKey);
        await triggerEvent(client, key, e, roleId);
        if (panelMessage) await panelMessage.edit({ embeds: [buildPanelEmbed()] }).catch(() => {});
      }
    }
  }
  if (h === 0 && m === 5) processed.clear();
}

async function triggerEvent(client, key, eventData, roleId) {
  const ch = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor(CONFIG.THEME.GOLD)
    .setTitle(`🎉 ${eventData.name.toUpperCase()} STARTED`)
    .setDescription("📢 Event is now **ACTIVE**!\n👉 Join and participate!")
    .setImage(CONFIG.IMAGES[key.toUpperCase()] || null)
    .setTimestamp();

  const msg = await ch.send({ content: `<@&${roleId}>`, embeds: [embed] });

  const db = loadDB();
  for (const [uid, subs] of Object.entries(db.dm)) {
    if (subs.includes(key)) {
      const user = await client.users.fetch(uid).catch(() => null);
      if (user) {
        const dmEmbed = new EmbedBuilder(embed.toJSON()).setFooter({ text: "VYRN Clan System" });
        user.send({ content: `🔔 **VYRN:** Event **${eventData.name}** has started!`, embeds: [dmEmbed] }).catch(() => {});
      }
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
    return await interaction.reply({ 
      content: "🎭 **Select roles:**", 
      components: [buildMenu("role_menu", "Select Roles...")], 
      ephemeral: true 
    });
  }

  if (customId === "get_event_dm") {
    return await interaction.reply({ 
      content: "📩 **DM Notifications:**", 
      components: [buildMenu("dm_menu", "Select DM Alerts...")], 
      ephemeral: true 
    });
  }

  if (customId === "role_menu") {
    const selectedKeys = values; 
    let added = [], removed = [];

    for (const [key, e] of Object.entries(CONFIG.EVENTS)) {
      const roleId = CONFIG.ROLES[e.roleKey];
      if (!roleId) continue;

      if (selectedKeys.includes(key)) {
        if (!member.roles.cache.has(roleId)) {
          await member.roles.add(roleId).catch(() => {});
          added.push(e.name);
        }
      } else {
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId).catch(() => {});
          removed.push(e.name);
        }
      }
    }

    let response = "Roles updated!\n";
    if (added.length) response += `✅ **Added:** ${added.join(", ")}\n`;
    if (removed.length) response += `❌ **Removed:** ${removed.join(", ")}`;
    if (!added.length && !removed.length) response = "No changes made.";

    return await interaction.update({ content: response, components: [] });
  }

  if (customId === "dm_menu") {
    const db = loadDB();
    db.dm[user.id] = values;
    saveDB(db);
    return await interaction.update({ content: "✅ DM Notifications saved!", components: [] });
  }
}

// ====================== INIT ======================
async function syncPanel(client) {
  const ch = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
  if (!ch) return;
  const msgs = await ch.messages.fetch({ limit: 10 });
  panelMessage = msgs.find(m => m.embeds[0]?.title?.includes("EVENT CENTER"));

  if (panelMessage) await panelMessage.edit({ embeds: [buildPanelEmbed()], components: [buildButtons()] });
  else panelMessage = await ch.send({ embeds: [buildPanelEmbed()], components: [buildButtons()] });
}

function init(client) {
  syncPanel(client);
  setInterval(() => checkEvents(client), 60000); 
  
  setInterval(() => {
    if (panelMessage) panelMessage.edit({ embeds: [buildPanelEmbed()] }).catch(() => syncPanel(client));
  }, 30 * 60 * 1000); 
  
  console.log("👑 VYRN Event System loaded.");
}

module.exports = { init, handleEventInteraction };
