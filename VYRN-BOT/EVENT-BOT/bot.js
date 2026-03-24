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

// ================= OBRAZY =================
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

const DB_PATH = "./data.json";

// ================= DB =================
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

// ================= EVENTS =================
const EVENTS = {
  egg: [0,3,6,9,12,15,18,21],
  merchant: [1,4,7,10,13,16,19,22],
  spin: [2,5,8,11,14,17,20,23]
};

function getEventByHour(hour) {
  if (EVENTS.egg.includes(hour)) return "egg";
  if (EVENTS.merchant.includes(hour)) return "merchant";
  return "spin";
}

// ================= 🔥 PERFECT NEXT EVENT =================
function getNextEvent() {
  const now = getNowPL();
  const nowTs = Math.floor(now.getTime() / 1000);

  let closest = null;

  for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
    for (let hour = 0; hour < 24; hour++) {

      const type = getEventByHour(hour);

      const date = new Date(now);
      date.setDate(now.getDate() + dayOffset);
      date.setHours(hour, 0, 0, 0);

      const ts = Math.floor(date.getTime() / 1000);

      if (ts <= nowTs) continue;

      if (!closest || ts < closest.timestamp) {
        closest = { type, timestamp: ts };
      }
    }
  }

  return closest;
}

function getCurrentEvent() {
  return getEventByHour(getNowPL().getHours());
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
> ⏳ Ends in: \`${formatTime(seconds)}\`

⏭️ **NEXT EVENT**
> **${nextData.name}**
> 🕒 Starts in: \`${formatTime(seconds)}\`

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
      new ButtonBuilder().setCustomId("pick_roles").setLabel("🎭 Roles").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("pick_dm").setLabel("📩 Notifications").setStyle(ButtonStyle.Secondary)
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
  console.log("🔥 PERFECT BOT READY (NO BUGS)");
  await startPanel();
});

client.login(TOKEN);
