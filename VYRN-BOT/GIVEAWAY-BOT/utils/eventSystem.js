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

// ===== CZAS =====
function getNowPL() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" })
  );
}

// ===== EVENT DATA =====
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
      panelMessageId: null
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== EVENT LOGIC =====
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

// ===== EMBED =====
function panelEmbed() {
  const current = getCurrentEvent();
  const next = getNextEvent();

  const currentData = EVENT_DATA[current];
  const nextData = EVENT_DATA[next];

  return new EmbedBuilder()
    .setColor(currentData.color)
    .setTitle("✨ EVENT PANEL")
    .setDescription("🎮 Live Event System")
    .addFields(
      {
        name: "🟢 CURRENT",
        value: `**${currentData.name}**\n⏳ ${getCountdown()}`,
        inline: true
      },
      {
        name: "⏭️ NEXT",
        value: `**${nextData.name}**\n⏱️ ${getCountdown()}`,
        inline: true
      }
    )
    .setImage("https://imgur.com/sOU3JWV.png")
    .setFooter({ text: "Auto refresh 10s" })
    .setTimestamp();
}

// ===== PANEL BUTTONS =====
function getPanelButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("event_refresh")
        .setLabel("🔄 Refresh")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("event_dm")
        .setLabel("📩 DM")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

// ===== START PANEL =====
async function startPanel(client) {
  try {
    console.log("🔥 STARTING EVENT PANEL");

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

    setInterval(async () => {
      try {
        await panelMessage.edit({
          embeds: [panelEmbed()],
          components: getPanelButtons()
        });
      } catch {}
    }, 10000);

  } catch (err) {
    console.log("❌ EVENT PANEL ERROR:", err);
  }
}

// ===== HANDLE INTERACTIONS =====
async function handleEventInteraction(interaction) {
  if (!interaction.isButton()) return;

  if (interaction.customId === "event_refresh") {
    return interaction.update({
      embeds: [panelEmbed()],
      components: getPanelButtons()
    });
  }

  if (interaction.customId === "event_dm") {
    const db = loadDB();

    db.dm[interaction.user.id] = true;
    saveDB(db);

    return interaction.reply({
      content: "✅ DM notifications ON",
      ephemeral: true
    });
  }
}

// ===== EXPORT =====
module.exports = {
  startPanel,
  handleEventInteraction
};
