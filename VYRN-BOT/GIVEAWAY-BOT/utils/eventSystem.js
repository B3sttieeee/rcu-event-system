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

// ===== EVENT DATA =====
const EVENT_DATA = {
  egg: {
    name: "RNG EGG",
    color: "#f59e0b",
    image: "https://imgur.com/yTE8jim.png",
    tip: "Find a good server and farm tiers!"
  },
  merchant: {
    name: "BOSS / HONEY MERCHANT",
    color: "#ef4444",
    image: "https://imgur.com/ft4q1bC.png",
    tip: "Prepare your currency!"
  },
  spin: {
    name: "DEV SPIN",
    color: "#dc2626",
    image: "https://imgur.com/blg4iD8.png",
    tip: "Spin the wheel!"
  }
};

// ===== ROLES =====
const ROLES = {
  egg: "1476000993119568105",
  merchant: "1476000993660502139",
  spin: "1484911421903999127"
};

// ===== DB =====
const DB_PATH = "./eventDB.json";

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ dm: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== TIME =====
function getNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" })
  );
}

function getEventByHour(h) {
  if ([0,3,6,9,12,15,18,21].includes(h)) return "egg";
  if ([1,4,7,10,13,16,19,22].includes(h)) return "merchant";
  if ([2,5,8,11,14,17,20,23].includes(h)) return "spin";
}

function getCurrent() {
  return getEventByHour(getNow().getHours());
}

function getNext() {
  return getEventByHour((getNow().getHours() + 1) % 24);
}

function getCountdown() {
  const now = getNow();
  let m = 59 - now.getMinutes();
  let s = 60 - now.getSeconds();
  if (s === 60) s = 0; else m--;
  return `${m}m ${s}s`;
}

// ===== PANEL EMBED =====
function panelEmbed() {
  const current = getCurrent();
  const next = getNext();

  return new EmbedBuilder()
    .setColor(EVENT_DATA[current].color)
    .setTitle("✨ Event Panel")
    .setDescription(
      `🎮 Live tracking system\n\n` +
      `🟢 **Current:** ${EVENT_DATA[current].name}\n` +
      `⏳ \`${getCountdown()}\`\n\n` +
      `⏭️ **Next:** ${EVENT_DATA[next].name}\n` +
      `⏱️ \`${getCountdown()}\``
    )
    .setImage("https://imgur.com/sOU3JWV.png");
}

// ===== BUTTONS =====
function getButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("refresh").setLabel("Refresh").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("roles").setLabel("Roles").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("dm").setLabel("Notifications").setStyle(ButtonStyle.Secondary)
    )
  ];
}

// ===== PANEL =====
async function startPanel(client) {
  const channel = await client.channels.fetch(CHANNEL_ID);

  const panel = await channel.send({
    embeds: [panelEmbed()],
    components: getButtons()
  });

  setInterval(() => {
    panel.edit({
      embeds: [panelEmbed()],
      components: getButtons()
    }).catch(()=>{});
  }, 10000);
}

// ===== EVENT SYSTEM =====
async function startEventSystem(client) {
  const channel = await client.channels.fetch(CHANNEL_ID);

  let lastPrePingHour = null;
  let lastStartHour = null;

  let prePingMsg = null;
  let startMsg = null;

  setInterval(async () => {
    const now = getNow();
    const hour = now.getHours();
    const min = now.getMinutes();

    const currentEvent = getEventByHour(hour);
    const nextEvent = getEventByHour((hour + 1) % 24);

    const nextData = EVENT_DATA[nextEvent];
    const nextRole = ROLES[nextEvent];

    const currentData = EVENT_DATA[currentEvent];
    const currentRole = ROLES[currentEvent];

    // ===== 5 MIN BEFORE (NAPRAWIONE)
    if (min === 55 && lastPrePingHour !== hour) {
      lastPrePingHour = hour;

      prePingMsg = await channel.send({
        content: `<@&${nextRole}> ⏳ Event in 5 minutes: **${nextData.name}**`
      }).catch(()=>{});
    }

    // ===== START EVENT
    if (min === 0 && lastStartHour !== hour) {
      lastStartHour = hour;

      if (prePingMsg) {
        prePingMsg.delete().catch(()=>{});
        prePingMsg = null;
      }

      startMsg = await channel.send({
        content: `<@&${currentRole}>`,
        embeds: [
          new EmbedBuilder()
            .setColor(currentData.color)
            .setTitle(`🚀 ${currentData.name}`)
            .setDescription(`💡 ${currentData.tip}`)
            .setImage(currentData.image)
        ]
      }).catch(()=>{});

      setTimeout(() => {
        if (startMsg) {
          startMsg.delete().catch(()=>{});
          startMsg = null;
        }
      }, 15 * 60 * 1000);
    }

  }, 10000);
}

// ===== EXPORT =====
module.exports = {
  startPanel,
  startEventSystem
};
