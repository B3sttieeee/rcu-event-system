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

const PANEL_IMAGE = "https://imgur.com/sOU3JWV.png";

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
const DB_PATH = "./data.json";

function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH));
  } catch {
    return { dm: {} };
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== TIME =====
function getNowPL() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" })
  );
}

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

function getCountdown() {
  const now = getNowPL();

  let minutes = 59 - now.getMinutes();
  let seconds = 60 - now.getSeconds();

  if (seconds === 60) seconds = 0;
  else minutes--;

  return `${minutes}m ${seconds}s`;
}

// ===== EMBED =====
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
    .setImage(PANEL_IMAGE)
    .setFooter({ text: "By B3sttiee" });
}

// ===== PANEL =====
function getPanel() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("event_refresh").setLabel("🔄 Refresh").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("event_roles").setLabel("🎭 Roles").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("event_dm").setLabel("📩 Notifications").setStyle(ButtonStyle.Secondary)
    )
  ];
}

// ===== START =====
async function startEventSystem(client) {
  const channel = await client.channels.fetch(CHANNEL_ID);
  if (!channel) return;

  let msg = await channel.send({
    embeds: [panelEmbed()],
    components: getPanel()
  });

  setInterval(async () => {
    try {
      await msg.edit({
        embeds: [panelEmbed()],
        components: getPanel()
      });
    } catch {}
  }, 10000);

  console.log("✅ EVENT SYSTEM STARTED");
}

// ===== DM =====
async function sendDM(client, eventKey) {
  const db = loadDB();

  for (const userId in db.dm) {
    if (db.dm[userId].includes(eventKey)) {
      try {
        const user = await client.users.fetch(userId);
        const data = EVENT_DATA[eventKey];

        await user.send({
          embeds: [
            new EmbedBuilder()
              .setColor(data.color)
              .setTitle("📩 EVENT START")
              .setDescription(`**${data.name}** started!\n${data.tip}`)
              .setImage(data.image)
          ]
        });
      } catch {}
    }
  }
}

module.exports = {
  startEventSystem,
  sendDM,
  loadDB,
  saveDB,
  EVENT_DATA,
  ROLES
};
