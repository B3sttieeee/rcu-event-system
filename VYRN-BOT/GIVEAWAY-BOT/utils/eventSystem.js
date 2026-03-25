const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const fs = require("fs");

// ================= CONFIG =================
const CHANNEL_ID = "1484937784283369502";

// ================= CZAS =================
function getNowPL() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" })
  );
}

// ================= EVENT DATA =================
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

// ================= DB =================
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

// ================= EVENTY =================
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

// ================= TIMER =================
function getCountdown() {
  const now = getNowPL();
  let minutes = 59 - now.getMinutes();
  let seconds = 60 - now.getSeconds();

  if (seconds === 60) seconds = 0;
  else minutes--;

  return `${minutes}m ${seconds}s`;
}

// ================= EMBED =================
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
        value: `**${currentData.name}**\n⏳ \`${time}\``,
        inline: true
      },
      {
        name: "⏭️ NEXT EVENT",
        value: `**${nextData.name}**\n⏱️ \`${time}\``,
        inline: true
      }
    )
    .setImage("https://imgur.com/sOU3JWV.png")
    .setFooter({ text: "Auto refresh 10s" })
    .setTimestamp();
}

// ================= PANEL =================
let panelMessage;

async function startPanel(client) {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const db = loadDB();

  if (db.panelMessageId) {
    try {
      panelMessage = await channel.messages.fetch(db.panelMessageId);
    } catch {}
  }

  if (!panelMessage) {
    panelMessage = await channel.send({
      embeds: [panelEmbed()]
    });

    db.panelMessageId = panelMessage.id;
    saveDB(db);
  }

  // ===== REFRESH PANEL =====
  setInterval(async () => {
    try {
      await panelMessage.edit({
        embeds: [panelEmbed()]
      });
    } catch {}
  }, 10000);

  // ===== PING SYSTEM (FIXED NO SPAM) =====
  let lastBeforeHour = null;
  let lastStartHour = null;

  setInterval(async () => {
    const now = getNowPL();
    const min = now.getMinutes();
    const hour = now.getHours();

    const db = loadDB();
    const current = getCurrentEvent();
    const next = getNextEvent();

    // ===== 5 MIN BEFORE =====
    if (min === 55 && lastBeforeHour !== hour) {
      lastBeforeHour = hour;

      const msg = await channel.send({
        content: `<@&${ROLES[next]}> ⚠️ Event za 5 minut!`
      });

      db.beforePingId = msg.id;
      saveDB(db);
    }

    // ===== START EVENT =====
    if (min === 0 && lastStartHour !== hour) {
      lastStartHour = hour;

      // usuń before ping
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
            .setDescription(`**${data.name}** wystartował!\n${data.tip}`)
            .setImage(data.image)
        ]
      });

      db.startPingId = msg.id;
      saveDB(db);

      // usuń po 15 min
      setTimeout(async () => {
        try {
          const fresh = loadDB();
          if (fresh.startPingId) {
            const m = await channel.messages.fetch(fresh.startPingId);
            await m.delete();
          }
        } catch {}
      }, 15 * 60 * 1000);
    }

  }, 10000);
}

// ================= EXPORT =================
module.exports = {
  startPanel
};
