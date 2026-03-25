const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const fs = require("fs");

// ===== CONFIG =====
const CHANNEL_ID = "1484937784283369502";

// ===== TIME =====
function getNowPL() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" })
  );
}

// ===== DATA =====
const EVENT_DATA = {
  egg: {
    name: "RNG EGG",
    color: "#ff8800",
    image: "https://imgur.com/yTE8jim.png",
    tip: "Znajdź serwer i farm Tier!"
  },
  merchant: {
    name: "BOSS / HONEY MERCHANT",
    color: "#ff3300",
    image: "https://imgur.com/ft4q1bC.png",
    tip: "Przygotuj walutę!"
  },
  spin: {
    name: "DEV SPIN",
    color: "#ff0000",
    image: "https://imgur.com/blg4iD8.png",
    tip: "Zakręć kołem!"
  }
};

const ROLES = {
  egg: "1476000993119568105",
  merchant: "1476000993660502139",
  spin: "1484911421903999127"
};

// ===== DB =====
const DB_PATH = "./eventDB.json";

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({
      dm: {},
      panelMessageId: null,
      beforePingId: null,
      startPingId: null
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== EVENTS =====
function getEventByHour(hour) {
  if ([0,3,6,9,12,15,18,21].includes(hour)) return "egg";
  if ([1,4,7,10,13,16,19,22].includes(hour)) return "merchant";
  return "spin";
}

function getCurrentEvent() {
  return getEventByHour(getNowPL().getHours());
}

function getNextEvent() {
  return getEventByHour((getNowPL().getHours() + 1) % 24);
}

// ===== TIMER =====
function getCountdown() {
  const now = getNowPL();
  let minutes = 59 - now.getMinutes();
  let seconds = 60 - now.getSeconds();

  if (seconds === 60) seconds = 0;
  else minutes--;

  return `${minutes}m ${seconds}s`;
}

// ===== EMBED (TU BYŁ BŁĄD — POPRAWIONY OPIS 1:1) =====
function panelEmbed() {
  const current = getCurrentEvent();
  const next = getNextEvent();

  const currentData = EVENT_DATA[current];
  const nextData = EVENT_DATA[next];

  const time = getCountdown();

  return new EmbedBuilder()
    .setColor(currentData.color)
    .setTitle("✨ EVENT PANEL")
    .setDescription("🎮 **Live Event Tracking System**\n\n━━━━━━━━━━━━━━━━━━")
    .addFields(
      {
        name: "🟢 CURRENT EVENT",
        value:
`**${currentData.name}**

⏳ Time left
\`${time}\``,
        inline: true
      },
      {
        name: "⏭️ NEXT EVENT",
        value:
`**${nextData.name}**

⏱️ Starts in
\`${time}\``,
        inline: true
      }
    )
    .setImage("https://imgur.com/sOU3JWV.png")
    .setFooter({ text: "By B3sttiee • refresh 10s" })
    .setTimestamp();
}

// ===== BUTTONS =====
function getPanelButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("refresh")
        .setLabel("🔄 Refresh")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("roles")
        .setLabel("🎭 Roles")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("dm")
        .setLabel("📩 Notifications")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

// ===== MENUS =====
function rolesMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("roles_menu")
      .setPlaceholder("Select roles")
      .addOptions([
        { label: "RNG EGG", value: "egg" },
        { label: "MERCHANT", value: "merchant" },
        { label: "DEV SPIN", value: "spin" }
      ])
  );
}

function dmMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("dm_menu")
      .setPlaceholder("Select DM notifications")
      .addOptions([
        { label: "RNG EGG", value: "egg" },
        { label: "MERCHANT", value: "merchant" },
        { label: "DEV SPIN", value: "spin" }
      ])
  );
}

// ===== PANEL + PING SYSTEM =====
async function startPanel(client) {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const db = loadDB();

  let panelMessage;

  if (db.panelMessageId) {
    try {
      panelMessage = await channel.messages.fetch(db.panelMessageId);
    } catch {}
  }

  if (!panelMessage) {
    panelMessage = await channel.send({
      embeds: [panelEmbed()],
      components: getPanelButtons()
    });

    db.panelMessageId = panelMessage.id;
    saveDB(db);
  }

  // refresh
  setInterval(async () => {
    try {
      await panelMessage.edit({
        embeds: [panelEmbed()],
        components: getPanelButtons()
      });
    } catch {}
  }, 10000);

  let lastBefore = null;
  let lastStart = null;

  setInterval(async () => {
    const now = getNowPL();
    const min = now.getMinutes();
    const hour = now.getHours();

    const db = loadDB();
    const current = getCurrentEvent();
    const next = getNextEvent();

    if (min === 55 && lastBefore !== hour) {
      lastBefore = hour;

      const msg = await channel.send({
        content: `<@&${ROLES[next]}> ⚠️ Event za 5 minut!`
      });

      db.beforePingId = msg.id;
      saveDB(db);
    }

    if (min === 0 && lastStart !== hour) {
      lastStart = hour;

      try {
        if (db.beforePingId) {
          const old = await channel.messages.fetch(db.beforePingId);
          await old.delete();
        }
      } catch {}

      const data = EVENT_DATA[current];

      const msg = await channel.send({
        content: `<@&${ROLES[current]}>`,
        embeds: [
          new EmbedBuilder()
            .setColor(data.color)
            .setTitle("🚀 EVENT START")
            .setDescription(
`**${data.name}**

${data.tip}`
            )
            .setImage(data.image)
        ]
      });

      db.startPingId = msg.id;
      saveDB(db);
    }

  }, 10000);
}

module.exports = {
  startPanel,
  panelEmbed,
  getPanelButtons,
  rolesMenu,
  dmMenu
};
