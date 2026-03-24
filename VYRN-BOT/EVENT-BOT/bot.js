const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const fs = require("fs");

const TOKEN = process.env.TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const CHANNEL_ID = "1484937784283369502";

// ================= CONFIG =================
const PANEL_IMAGE = "https://imgur.com/sOU3JWV.png";

const EVENT_DATA = {
  egg: {
    name: "RNG EGG",
    color: "#ff8800",
    image: "https://imgur.com/yTE8jim.png",
    tip: "Znajdź serwer i zacznij nabijać Tier!"
  },
  merchant: {
    name: "BOSS / HONEY MERCHANT",
    color: "#ff3300",
    image: "https://imgur.com/ft4q1bC.png",
    tip: "Przygotuj walutę i kup przedmioty!"
  },
  spin: {
    name: "DEV SPIN",
    color: "#ff0000",
    image: "https://imgur.com/blg4iD8.png",
    tip: "Zakręć kołem i sprawdź swoje szczęście!"
  }
};

const ROLES = {
  egg: "1476000993119568105",
  merchant: "1476000993660502139",
  spin: "1484911421903999127"
};

// 🔥 TWOJA ROTACJA 1:1
const ROTATION = [
  "egg","merchant","spin",
  "egg","merchant","spin",
  "egg","merchant","spin",
  "egg","merchant","spin",
  "egg","merchant","spin",
  "egg","merchant","spin",
  "egg","merchant","spin",
  "egg","merchant","spin"
];

// ================= DB =================
const DB_PATH = "./data.json";

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

// ================= TIME =================
function getNowPL() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
}

// ================= EVENT SYSTEM =================
function getCurrentEvent() {
  const hour = getNowPL().getHours();
  return ROTATION[hour];
}

function getNextEvent() {
  const now = getNowPL();

  let nextHour = (now.getMinutes() === 0 && now.getSeconds() === 0)
    ? now.getHours()
    : (now.getHours() + 1) % 24;

  const date = new Date(now);
  date.setHours(nextHour, 0, 0, 0);

  if (nextHour <= now.getHours()) {
    date.setDate(date.getDate() + 1);
  }

  return {
    type: ROTATION[nextHour],
    timestamp: Math.floor(date.getTime() / 1000)
  };
}

// ================= COUNTDOWN =================
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

// ================= EMBED =================
function panelEmbed() {
  const current = getCurrentEvent();
  const next = getNextEvent();

  const now = Math.floor(Date.now() / 1000);
  const seconds = Math.max(0, next.timestamp - now);

  const currentData = EVENT_DATA[current];
  const nextData = EVENT_DATA[next.type];

  return new EmbedBuilder()
    .setColor(currentData.color)
    .setTitle("✨ Event Panel")
    .setDescription(
`🎮 **Live Event Tracking System**

━━━━━━━━━━━━━━━━━━

🟢 **CURRENT EVENT**
> **${currentData.name}**

⏭️ **NEXT EVENT**
> **${nextData.name}**
> ⏳ Starts in: \`${formatTime(seconds)}\`

━━━━━━━━━━━━━━━━━━`
    )
    .setImage(PANEL_IMAGE)
    .setFooter({ text: "By B3sttiee • Auto refresh 10s" })
    .setTimestamp();
}

// ================= PANEL =================
function getPanel() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("refresh").setLabel("🔄 Refresh").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("roles").setLabel("🎭 Roles").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("dm").setLabel("📩 Notifications").setStyle(ButtonStyle.Secondary)
    )
  ];
}

// ================= PANEL SYSTEM =================
let panelMessage;

async function startPanel() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const db = loadDB();

  if (db.panelMessageId) {
    try {
      panelMessage = await channel.messages.fetch(db.panelMessageId);
    } catch {}
  }

  if (!panelMessage) {
    panelMessage = await channel.send({
      embeds: [panelEmbed()],
      components: getPanel()
    });

    db.panelMessageId = panelMessage.id;
    saveDB(db);
  }

  setInterval(async () => {
    try {
      await panelMessage.edit({
        embeds: [panelEmbed()],
        components: getPanel()
      });
    } catch {}
  }, 10000);
}

// ================= READY =================
client.once("clientReady", async () => {
  console.log("🔥 ROTATION PERFECT");
  await startPanel();
});

client.login(TOKEN);
