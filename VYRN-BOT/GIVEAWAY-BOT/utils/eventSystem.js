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

// ===== EVENTS =====
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

// ===== ROLE =====
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

// ===== TIME =====
function getNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" })
  );
}

// 🔥 GODZINY (NAPRAWIONE 1:1)
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

// ===== TIMER =====
function getCountdown() {
  const now = getNow();
  let m = 59 - now.getMinutes();
  let s = 60 - now.getSeconds();

  if (s === 60) s = 0;
  else m--;

  return `${m}m ${s}s`;
}

// ===== EMBED PANEL =====
function panelEmbed() {
  const current = getCurrent();
  const next = getNext();

  return new EmbedBuilder()
    .setColor(EVENT_DATA[current].color)
    .setTitle("✨ EVENT PANEL")
    .setDescription("🎮 **Live Event Tracking System**\n\n━━━━━━━━━━━━━━━━━━")
    .addFields(
      {
        name: "🟢 CURRENT EVENT",
        value:
`**${EVENT_DATA[current].name}**

⏳ Time left
\`${getCountdown()}\``,
        inline: true
      },
      {
        name: "⏭️ NEXT EVENT",
        value:
`**${EVENT_DATA[next].name}**

⏱️ Starts in
\`${getCountdown()}\``,
        inline: true
      }
    )
    .setImage("https://imgur.com/sOU3JWV.png");
}

// ===== BUTTONS =====
function getButtons() {
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

// ===== START PANEL =====
async function startPanel(client) {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const db = loadDB();

  let panel;

  if (db.panelMessageId) {
    try {
      panel = await channel.messages.fetch(db.panelMessageId);
    } catch {}
  }

  if (!panel) {
    panel = await channel.send({
      embeds: [panelEmbed()],
      components: getButtons()
    });

    db.panelMessageId = panel.id;
    saveDB(db);
  }

  // 🔄 REFRESH PANEL
  setInterval(() => {
    panel.edit({
      embeds: [panelEmbed()],
      components: getButtons()
    }).catch(()=>{});
  }, 10000);

  let lastBefore = null;
  let lastStart = null;

  // 🔥 MAIN LOOP
  setInterval(async () => {

    const now = getNow();
    const min = now.getMinutes();
    const hour = now.getHours();

    const current = getCurrent();
    const next = getNext();
    const db = loadDB();

    // ===== 5 MIN BEFORE =====
    if (min >= 55 && lastBefore !== hour) {
      lastBefore = hour;

      const msg = await channel.send({
        content: `<@&${ROLES[next]}> ⚠️ Event za 5 minut!`
      });

      db.beforePingId = msg.id;
      saveDB(db);

      // DM
      const members = await channel.guild.members.fetch();
      members.forEach(m => {
        if (db.dm[m.id]?.includes(next)) {
          m.send({
            embeds: [
              new EmbedBuilder()
                .setColor(EVENT_DATA[next].color)
                .setTitle("⏰ EVENT SOON")
                .setDescription(`**${EVENT_DATA[next].name}** za 5 minut!`)
                .setImage(EVENT_DATA[next].image)
            ]
          }).catch(()=>{});
        }
      });
    }

    // ===== START =====
    if (min <= 1 && lastStart !== hour) {
      lastStart = hour;

      // delete before ping
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
            .setDescription(`**${data.name}**\n\n${data.tip}`)
            .setImage(data.image)
        ]
      });

      db.startPingId = msg.id;
      saveDB(db);

      // DM
      const members = await channel.guild.members.fetch();
      members.forEach(m => {
        if (db.dm[m.id]?.includes(current)) {
          m.send({
            embeds: [
              new EmbedBuilder()
                .setColor(data.color)
                .setTitle("🚀 EVENT START")
                .setDescription(`**${data.name}** wystartował!\n${data.tip}`)
                .setImage(data.image)
            ]
          }).catch(()=>{});
        }
      });
    }

  }, 10000);
}

// ===== INTERACTION =====
async function handleEventInteraction(interaction) {

  if (interaction.customId === "refresh") {
    return interaction.update({
      embeds: [panelEmbed()],
      components: getButtons()
    });
  }

  if (interaction.customId === "dm") {
    const db = loadDB();

    db.dm[interaction.user.id] = ["egg","merchant","spin"];
    saveDB(db);

    return interaction.reply({
      content: "✅ DM enabled",
      ephemeral: true
    });
  }
}

module.exports = {
  startPanel,
  handleEventInteraction
};
module.exports = {
  startPanel,
  handleEventInteraction
};
