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

function getCurrentEvent() {
  return getEventByHour(getNowPL().getHours());
}

function getNextEvent() {
  const now = getNowPL();
  let nextHour = (now.getHours() + 1) % 24;

  const nextDate = new Date(now);
  nextDate.setHours(nextHour, 0, 0, 0);

  if (nextHour <= now.getHours()) nextDate.setDate(nextDate.getDate() + 1);

  return {
    type: getEventByHour(nextHour),
    timestamp: Math.floor(nextDate.getTime() / 1000)
  };
}

// ================= COUNTDOWN (NOWY) =================
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function getRemainingSeconds(timestamp) {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, timestamp - now);
}

// ================= EMBED PANEL =================
function panelEmbed() {
  const current = getCurrentEvent();
  const next = getNextEvent();

  const currentData = EVENT_DATA[current];
  const nextData = EVENT_DATA[next.type];

  const secondsLeft = getRemainingSeconds(next.timestamp);

  return new EmbedBuilder()
    .setColor(currentData.color)
    .setTitle("✨ Event Panel")
    .setDescription("🎮 Live event tracking system\n")

    .setImage(PANEL_IMAGE)

    .addFields(
      {
        name: "🟢 CURRENT EVENT",
        value: `**${currentData.name}**\n⏳ Ends in: \`${formatTime(secondsLeft)}\``,
        inline: true
      },
      {
        name: "⏭️ NEXT EVENT",
        value: `**${nextData.name}**\n🕒 Starts in: \`${formatTime(secondsLeft)}\``,
        inline: true
      }
    )

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

// ================= MENUS =================
function rolesMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("roles_menu")
      .setPlaceholder("Select roles")
      .setMinValues(0)
      .setMaxValues(3)
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
      .setMinValues(0)
      .setMaxValues(3)
      .addOptions([
        { label: "RNG EGG", value: "egg" },
        { label: "MERCHANT", value: "merchant" },
        { label: "DEV SPIN", value: "spin" }
      ])
  );
}

// ================= PANEL SYSTEM =================
let panelMessage;

async function startPanel() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const db = loadDB();

  if (db.panelMessageId) {
    try {
      panelMessage = await channel.messages.fetch(db.panelMessageId);
    } catch {
      panelMessage = null;
    }
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

// ================= PING SYSTEM =================
let lastNotify = "";

async function deleteMessage(channel, id) {
  if (!id) return;
  try {
    const msg = await channel.messages.fetch(id);
    await msg.delete();
  } catch {}
}

setInterval(async () => {

  const now = getNowPL();
  const min = now.getMinutes();
  const hour = now.getHours();

  const channel = await client.channels.fetch(CHANNEL_ID);
  const db = loadDB();

  const current = getCurrentEvent();
  const next = getNextEvent();

  if (min === 55 && lastNotify !== `${hour}-5`) {
    lastNotify = `${hour}-5`;

    const data = EVENT_DATA[next.type];

    const msg = await channel.send({
      content: `<@&${ROLES[next.type]}>\n⚠️ EVENT **${data.name}** za 5 minut!\n👉 ${data.tip}`
    });

    db.beforePingId = msg.id;
    saveDB(db);
  }

  if (min === 0 && lastNotify !== `${hour}-start`) {
    lastNotify = `${hour}-start`;

    await deleteMessage(channel, db.beforePingId);

    const data = EVENT_DATA[current];

    const msg = await channel.send({
      content: `<@&${ROLES[current]}>`,
      embeds: [
        new EmbedBuilder()
          .setColor(data.color)
          .setTitle("🚀 EVENT STARTED")
          .setDescription(`🔥 **${data.name}** wystartował!\n\n👉 ${data.tip}`)
          .setImage(data.image)
          .setTimestamp()
      ]
    });

    db.startPingId = msg.id;
    saveDB(db);

    setTimeout(async () => {
      const fresh = loadDB();
      await deleteMessage(channel, fresh.startPingId);
      fresh.startPingId = null;
      saveDB(fresh);
    }, 15 * 60 * 1000);
  }

}, 10000);

// ================= INTERACTIONS =================
client.on("interactionCreate", async (i) => {

  if (i.isButton()) {

    if (i.customId === "refresh") {
      return i.update({ embeds: [panelEmbed()], components: getPanel() });
    }

    if (i.customId === "pick_roles") {
      return i.reply({ content: "🎭 Select roles:", components: [rolesMenu()], ephemeral: true });
    }

    if (i.customId === "pick_dm") {
      return i.reply({ content: "📩 Select notifications:", components: [dmMenu()], ephemeral: true });
    }
  }

  if (i.isStringSelectMenu()) {

    const db = loadDB();

    if (i.customId === "roles_menu") {
      const member = await i.guild.members.fetch(i.user.id);

      for (const key in ROLES) {
        await member.roles.remove(ROLES[key]).catch(() => {});
      }

      for (const val of i.values) {
        await member.roles.add(ROLES[val]).catch(() => {});
      }

      return i.reply({ content: "✅ Roles updated", ephemeral: true });
    }

    if (i.customId === "dm_menu") {
      db.dm[i.user.id] = i.values;
      saveDB(db);

      return i.reply({ content: "✅ DM settings saved", ephemeral: true });
    }
  }
});

// ================= READY =================
client.once("clientReady", async () => {
  console.log("🔥 BOT READY (COUNTDOWN FIXED)");
  await startPanel();
});

client.login(TOKEN);
